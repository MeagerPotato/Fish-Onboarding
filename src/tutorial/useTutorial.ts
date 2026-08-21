/**
 * The guide's state machine.
 *
 * The scripted game is deterministic, so every frame is precomputed once at module load and
 * navigation is just an index. The learner's answers never change the game — each checkpoint
 * has exactly one correct answer and the script plays that answer — which is what lets
 * "back" work perfectly and removes any need to hold mutable game state here.
 *
 * What this hook owns is the learner's *progress*: where they are, which checkpoints they
 * have solved, and what they have tried on the current one.
 *
 * Batch safety matters here. Two taps can land in a single React batch (a double-tap, a held
 * key, an impatient learner), and anything computed from a captured `stepIndex` or a captured
 * `isBlocked` would be stale for the second tap — which would let a double-tap skip straight
 * past an unanswered checkpoint. Every navigation therefore uses a functional update and
 * consults `solvedRef`, which is mutated synchronously the moment a checkpoint is solved.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Card, GameState, Seat } from '../../lib/engine/index.ts'
import { SCRIPT, type Checkpoint, type Step } from './script.ts'
import { replay, trueAssignments, type Frame } from './replay.ts'
import { claimIsComplete } from './viewmodels.ts'

/** Precomputed once: the script is pure, so this never needs to run again. */
const FRAMES: Frame[] = replay()

export const STEP_COUNT = SCRIPT.length

export type Status =
  /** Reading a step with nothing to answer, or a checkpoint not yet attempted. */
  | 'reading'
  /** A checkpoint answer was submitted and was wrong; feedback is showing. */
  | 'wrong'
  /** The checkpoint is solved (or the step had none) and the outcome is showing. */
  | 'revealed'

export interface TutorialView {
  step: Step
  stepIndex: number
  stepCount: number
  /** 0..1, for a progress indicator. */
  progress: number
  act: Step['act']
  status: Status
  /** The game as it should be drawn right now. */
  game: GameState
  /** True while the learner still owes an answer before they can move on. */
  isBlocked: boolean
  checkpoint: Checkpoint | null

  /* ask-choice working state */
  chosenOption: number | null
  /** Feedback for the option just tried, when it was wrong. */
  wrongNote: string | null

  /* claim working state */
  placements: Partial<Record<Card, Seat>>
  canSubmitClaim: boolean
  /** Shown after a wrong claim: why misplacing voids the half-suit. */
  claimError: string | null

  /** Wrong attempts on the current checkpoint. Drives an escalating hint. */
  attempts: number
  isFinished: boolean

  next: () => void
  back: () => void
  restart: () => void
  chooseOption: (index: number) => void
  place: (card: Card, seat: Seat) => void
  submitClaim: () => void
  /** Give up on the current checkpoint and be shown the answer. */
  revealAnswer: () => void
}

const STORAGE_KEY = 'fish-onboarding:progress'
/** Resume only if the saved position is recent; an old one confuses more than it helps. */
const RESUME_WINDOW_MS = 2 * 60 * 60 * 1000
/** Nothing before act 2 is worth resuming into. */
const MIN_RESUMABLE_STEP = 3

interface Saved {
  stepIndex: number
  at: number
}

function loadProgress(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return 0
    const saved = JSON.parse(raw) as Saved
    if (typeof saved.stepIndex !== 'number' || typeof saved.at !== 'number') return 0
    if (Date.now() - saved.at > RESUME_WINDOW_MS) return 0
    if (saved.stepIndex < MIN_RESUMABLE_STEP) return 0
    return Math.min(Math.max(saved.stepIndex, 0), STEP_COUNT - 1)
  } catch {
    return 0
  }
}

function saveProgress(stepIndex: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ stepIndex, at: Date.now() } satisfies Saved))
  } catch {
    // Private mode, storage disabled, quota — none of it is worth breaking the guide over.
  }
}

const clamp = (i: number) => Math.min(Math.max(i, 0), STEP_COUNT - 1)

/**
 * Everything the learner has done on ONE step. Tagged with the step it belongs to so the
 * current values can be derived during render instead of synced by an effect — navigating
 * away and back therefore needs no cleanup, and there is no frame where the previous step's
 * answer is visible under the new step's question.
 */
interface Working {
  forStep: number
  chosenOption: number | null
  wrongNote: string | null
  placements: Partial<Record<Card, Seat>>
  claimError: string | null
  attempts: number
}

/**
 * The working state a step starts from. A checkpoint already solved shows its answer again,
 * which is what makes going back lossless.
 */
function workingFor(index: number, solvedSet: ReadonlySet<number>): Working {
  const base: Working = {
    forStep: index,
    chosenOption: null,
    wrongNote: null,
    placements: {},
    claimError: null,
    attempts: 0,
  }
  const cp = FRAMES[index].step.checkpoint
  if (!cp || !solvedSet.has(index)) return base
  if (cp.kind === 'ask-choice') return { ...base, chosenOption: cp.correct }
  return { ...base, placements: trueAssignments(FRAMES[index].before, cp.halfSuit) }
}


export function useTutorial(startAt = 0): TutorialView {
  const [stepIndex, setStepIndex] = useState(() => clamp(startAt))
  const [solved, setSolved] = useState<ReadonlySet<number>>(() => new Set<number>())
  const [working, setWorking] = useState<Working>(() => workingFor(clamp(startAt), new Set<number>()))

  /** Mirrors `solved`, but updated synchronously so batched navigation can read it. */
  const solvedRef = useRef<ReadonlySet<number>>(solved)

  const frame = FRAMES[stepIndex]
  const step = frame.step
  const checkpoint = step.checkpoint ?? null
  const isSolved = checkpoint === null || solved.has(stepIndex)
  const isBlocked = !isSolved

  // Derived, not synced: if the working state belongs to another step it is simply ignored.
  const w = working.forStep === stepIndex ? working : workingFor(stepIndex, solved)

  const status: Status = isSolved
    ? 'revealed'
    : w.wrongNote !== null || w.claimError !== null
      ? 'wrong'
      : 'reading'

  /**
   * Before a checkpoint is solved the learner is looking at the position they must reason
   * about; afterwards they see the consequence. Steps without a checkpoint are written in
   * the past tense, so they show the result immediately.
   */
  const game = isSolved ? frame.after : frame.before

  const markSolved = useCallback((index: number) => {
    const updated = new Set(solvedRef.current)
    updated.add(index)
    solvedRef.current = updated
    setSolved(updated)
  }, [])

  /**
   * Navigation is always a functional update, and forward motion re-checks the CURRENT
   * step's checkpoint against `solvedRef` inside the updater. That is what stops a
   * double-tap jumping an unanswered checkpoint.
   */
  const move = useCallback((delta: number) => {
    setStepIndex((current) => {
      if (delta > 0) {
        const cp = FRAMES[current].step.checkpoint
        if (cp && !solvedRef.current.has(current)) return current
      }
      return clamp(current + delta)
    })
  }, [])

  const next = useCallback(() => move(1), [move])
  const back = useCallback(() => move(-1), [move])
  const restart = useCallback(() => setStepIndex(0), [])

  useEffect(() => {
    saveProgress(stepIndex)
  }, [stepIndex])

  /** Update the working state, rebasing onto this step if it belonged to a previous one. */
  const edit = useCallback(
    (patch: Partial<Omit<Working, 'forStep'>>) => {
      setWorking((prev) => {
        const base = prev.forStep === stepIndex ? prev : workingFor(stepIndex, solvedRef.current)
        return { ...base, ...patch, forStep: stepIndex }
      })
    },
    [stepIndex],
  )

  const chooseOption = useCallback(
    (index: number) => {
      if (checkpoint?.kind !== 'ask-choice' || isSolved) return
      if (index === checkpoint.correct) {
        edit({ chosenOption: index, wrongNote: null })
        markSolved(stepIndex)
      } else {
        edit({ chosenOption: index, wrongNote: checkpoint.options[index]?.note ?? null, attempts: w.attempts + 1 })
      }
    },
    [checkpoint, edit, isSolved, markSolved, stepIndex, w.attempts],
  )

  const place = useCallback(
    (card: Card, seat: Seat) => {
      if (checkpoint?.kind !== 'claim' || isSolved) return
      edit({ placements: { ...w.placements, [card]: seat }, claimError: null })
    },
    [checkpoint, edit, isSolved, w.placements],
  )

  const canSubmitClaim =
    checkpoint?.kind === 'claim' && !isSolved && claimIsComplete(checkpoint.halfSuit, w.placements)

  const submitClaim = useCallback(() => {
    if (checkpoint?.kind !== 'claim' || isSolved) return
    if (!claimIsComplete(checkpoint.halfSuit, w.placements)) return
    const truth = trueAssignments(frame.before, checkpoint.halfSuit)
    const correct = Object.entries(truth).every(([card, seat]) => w.placements[card as Card] === seat)
    if (correct) {
      edit({ claimError: null })
      markSolved(stepIndex)
    } else {
      edit({ claimError: checkpoint.whyWrong, attempts: w.attempts + 1 })
    }
  }, [checkpoint, edit, frame.before, isSolved, markSolved, stepIndex, w.attempts, w.placements])

  const revealAnswer = useCallback(() => {
    if (!checkpoint || isSolved) return
    if (checkpoint.kind === 'ask-choice') {
      edit({ chosenOption: checkpoint.correct, wrongNote: null })
    } else {
      edit({ placements: trueAssignments(frame.before, checkpoint.halfSuit), claimError: null })
    }
    markSolved(stepIndex)
  }, [checkpoint, edit, frame.before, isSolved, markSolved, stepIndex])

  return useMemo(
    (): TutorialView => ({
      step,
      stepIndex,
      stepCount: STEP_COUNT,
      progress: STEP_COUNT > 1 ? stepIndex / (STEP_COUNT - 1) : 1,
      act: step.act,
      status,
      game,
      isBlocked,
      checkpoint,
      chosenOption: w.chosenOption,
      wrongNote: w.wrongNote,
      placements: w.placements,
      canSubmitClaim,
      claimError: w.claimError,
      attempts: w.attempts,
      isFinished: stepIndex === STEP_COUNT - 1,
      next,
      back,
      restart,
      chooseOption,
      place,
      submitClaim,
      revealAnswer,
    }),
    [
      step,
      stepIndex,
      status,
      game,
      isBlocked,
      checkpoint,
      w.chosenOption,
      w.wrongNote,
      w.placements,
      w.claimError,
      w.attempts,
      canSubmitClaim,
      next,
      back,
      restart,
      chooseOption,
      place,
      submitClaim,
      revealAnswer,
    ],
  )
}

/** Read the saved position once, at startup. */
export function savedStartIndex(): number {
  return loadProgress()
}
