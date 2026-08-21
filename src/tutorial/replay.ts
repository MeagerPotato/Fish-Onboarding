/**
 * Deterministic replay of the teaching script.
 *
 * The guide, the tests and the trace script all drive the game through this one module, so
 * there is exactly one definition of "what the state is at step N". Claim checkpoints carry
 * no hard-coded action: the correct claim is derived from where the cards actually are at
 * that moment, which is what makes the checkpoint's stated deductions checkable rather than
 * decorative.
 */
import {
  halfSuitCards,
  newGameFromDeal,
  reduce,
  type Card,
  type GameAction,
  type GameState,
  type HalfSuitId,
  type PublicEvent,
  type Seat,
} from '../../lib/engine/index.ts'
import { TUTORIAL_DEAL } from './table.ts'
import { SCRIPT, type Step } from './script.ts'

export function initialState(): GameState {
  return newGameFromDeal(TUTORIAL_DEAL, 0)
}

/** Where each card of a half-suit truly is, right now. */
export function trueAssignments(state: GameState, halfSuit: HalfSuitId): Record<Card, Seat> {
  const out = {} as Record<Card, Seat>
  for (const c of halfSuitCards(halfSuit)) {
    out[c] = state.hands.findIndex((h) => h.includes(c)) as Seat
  }
  return out
}

/**
 * The actions a step performs against a given state. For a claim checkpoint this is the
 * one correct claim; for everything else it is the step's literal action list.
 */
export function actionsFor(state: GameState, step: Step): GameAction[] {
  if (step.checkpoint?.kind === 'claim') {
    const halfSuit = step.checkpoint.halfSuit
    return [{ type: 'claim', seat: state.turn, halfSuit, assignments: trueAssignments(state, halfSuit) }]
  }
  return [...step.actions]
}

export interface Frame {
  step: Step
  index: number
  /** State before the step's actions were applied — what the learner is looking at. */
  before: GameState
  /** State after. Equal to `before` for a `still` step. */
  after: GameState
  /** Events this step produced, in order. */
  events: PublicEvent[]
  /** The actions actually applied (resolved, so claim checkpoints are concrete). */
  applied: GameAction[]
}

export class ReplayError extends Error {
  stepId: string
  action: GameAction
  codeName: string

  constructor(stepId: string, action: GameAction, codeName: string, message: string) {
    super(message)
    this.name = 'ReplayError'
    this.stepId = stepId
    this.action = action
    this.codeName = codeName
  }
}

/**
 * Replay the whole script, returning one frame per step.
 * Throws `ReplayError` if the engine rejects any scripted action — which is the point:
 * a script that has drifted away from the rules cannot silently ship.
 */
export function replay(script: readonly Step[] = SCRIPT): Frame[] {
  let state = initialState()
  const frames: Frame[] = []

  script.forEach((step, index) => {
    const before = state
    const events: PublicEvent[] = []
    const applied = actionsFor(state, step)

    for (const action of applied) {
      const r = reduce(state, action)
      if (!r.ok) {
        throw new ReplayError(
          step.id,
          action,
          r.error.code,
          `step "${step.id}" (#${index}): engine rejected ${action.type} — ${r.error.code}: ${r.error.message}`,
        )
      }
      state = r.state
      events.push(...r.events)
    }

    frames.push({ step, index, before, after: state, events, applied })
  })

  return frames
}

/** The state the learner is looking at when step `index` is on screen. */
export function stateAtStep(index: number): GameState {
  const frames = replay()
  if (index <= 0) return initialState()
  return frames[Math.min(index, frames.length - 1)].before
}

/** Convenience for the trace script and tests: the state once the whole script has run. */
export function finalState(): GameState {
  const frames = replay()
  return frames[frames.length - 1].after
}
