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
 *
 * Progress is also in the URL, as a fragment — see `hashStepIndex`. The fragment is an input
 * channel (deep links, Back, Forward) and a mirror of the step, never the source of truth:
 * the source of truth stays this hook's `stepIndex`, so the functional updates above keep
 * working exactly as they did.
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

/**
 * Nothing here trusts the stored value. It is the only input to this app that the app did
 * not write itself in this session — anything else on the origin, a shared browser profile,
 * a half-finished write, or a curious learner with devtools open can put arbitrary JSON in
 * it — and it is read on every single load. So a value this function accepts but the rest of
 * the module cannot use is not a bad resume, it is a blank page that comes back every time
 * the page is opened, until site data is cleared by hand.
 *
 * `typeof x === 'number'` is not enough for an array index: 5.5 and 1e999 both pass it and
 * neither indexes FRAMES. The test that matters is "a whole number", hence Number.isInteger.
 */
function loadProgress(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return 0
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return 0
    const { stepIndex, at } = parsed as Partial<Saved>
    if (typeof stepIndex !== 'number' || typeof at !== 'number') return 0
    if (!Number.isInteger(stepIndex) || !Number.isFinite(at)) return 0
    if (Date.now() - at > RESUME_WINDOW_MS) return 0
    if (stepIndex < MIN_RESUMABLE_STEP) return 0
    return Math.min(Math.max(stepIndex, 0), STEP_COUNT - 1)
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

/**
 * Every step index the hook ever holds passes through here, which makes this the one place
 * that can guarantee what the rest of the module assumes: `FRAMES[stepIndex]` exists. Range
 * is only half of that — a fractional or non-finite index is inside the range and still
 * misses the array — so the whole-number coercion belongs here too, not only at the storage
 * boundary. `startAt` is a public argument of `useTutorial`, so this holds for any caller.
 */
const clamp = (i: number) => {
  const whole = Number.isFinite(i) ? Math.trunc(i) : 0
  return Math.min(Math.max(whole, 0), STEP_COUNT - 1)
}

/**
 * `#step-12` — the fragment, counted from 1.
 *
 * From 1 because that is the number the learner is looking at while they copy the link
 * ("Step 12 of 19"); a link whose number disagrees with the screen is a link people
 * mis-quote across a table. A bare fragment and not `#/step/12`, because nothing in this app
 * is a path: `vercel.json` rewrites every path to `index.html` already, and a fragment shaped
 * like a path invites the guess that the server knows about it. A fragment rather than a real
 * path (MOBILE_SPEC §1.4) because a fragment costs no server configuration and no router — it
 * survives being moved to a host with no SPA rewrite, and it never turns a reload into a 404
 * at a club table.
 */
const HASH_PREFIX = '#step-'

const hashFor = (index: number) => HASH_PREFIX + (index + 1)

/**
 * The URL is the second input this app did not write itself, and the more exposed of the two:
 * a fragment is typed, forwarded, truncated by chat clients, and appended to by trackers. So
 * it gets the same suspicion as `loadProgress` and for the same reason — a value accepted here
 * but unusable by the rest of the module is `FRAMES[undefined]`, a blank page that survives
 * every reload because it is in the link.
 *
 * `Number()` is not the test. `'5.5'`, `'1e999'`, `'0x10'`, `'-1'`, `' 12 '` and `''` all pass
 * through it and none of them index `FRAMES`. Digits-only is the test that matches what this
 * function claims to read, and `\d` in a JS pattern is ASCII-only, so unicode digits are out
 * as well. The length check runs before the slice so a megabyte-long fragment costs one
 * comparison rather than a copy.
 *
 * Returns `null` for "the URL names no step" — the one case where the saved position may be
 * resumed. Anything present but unusable returns step 1 instead: it is an explicit instruction
 * the app could not honour, and restoring an unrelated saved position under it would answer a
 * question nobody asked.
 */
export function hashStepIndex(): number | null {
  try {
    const raw = location.hash
    // '' is "no fragment". A bare '#' reports '' too, so it resumes rather than resetting.
    if (!raw) return null
    if (raw.length > 16 || !raw.startsWith(HASH_PREFIX)) return 0
    const digits = raw.slice(HASH_PREFIX.length)
    if (!/^\d{1,3}$/.test(digits)) return 0
    const n = Number(digits)
    return n >= 1 && n <= STEP_COUNT ? n - 1 : 0
  } catch {
    // No `location` at all — a non-DOM environment. Behave as if the URL said nothing.
    return null
  }
}

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


/**
 * `startAt` is where to begin when the URL does not say. A step named in the fragment beats
 * it — someone opening a shared link expects that link's step, not the position this browser
 * happened to save — which is why the precedence lives here rather than in the caller:
 * `savedStartIndex()` still means exactly "the saved position", so a caller can keep asking
 * that question (a resume notice needs to know it was a resume, not a deep link).
 */
export function useTutorial(startAt = 0): TutorialView {
  const [stepIndex, setStepIndex] = useState(() => clamp(hashStepIndex() ?? startAt))
  const [solved, setSolved] = useState<ReadonlySet<number>>(() => new Set<number>())
  const [working, setWorking] = useState<Working>(() => workingFor(stepIndex, new Set<number>()))

  /** Mirrors `solved`, but updated synchronously so batched navigation can read it. */
  const solvedRef = useRef<ReadonlySet<number>>(solved)

  /** The fragment this hook last wrote, or last accepted from the URL. */
  const hashRef = useRef<string | null>(null)

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
  /**
   * "Start again" is a fresh run, not a rewind: position, solved checkpoints and working
   * answers all reset together. Moving only the index would replay the whole guide with
   * every checkpoint already answered and every option disabled — the learner (or the next
   * person handed the laptop) would never get to think about one again.
   */
  const restart = useCallback(() => {
    const cleared: ReadonlySet<number> = new Set<number>()
    solvedRef.current = cleared
    setSolved(cleared)
    setWorking(workingFor(0, cleared))
    setStepIndex(0)
  }, [])

  useEffect(() => {
    saveProgress(stepIndex)
  }, [stepIndex])

  /**
   * The URL follows the step. The first write REPLACES, so a deep link — or a fragment the app
   * could not honour — is corrected in place and the app adds no entry of its own on top of
   * the one the learner arrived on. Every later write PUSHES, which is the whole point: Back
   * then means "previous step" instead of "leave the guide", which is the gesture a confused
   * learner reaches for first on a phone.
   *
   * A step change that came FROM the URL has already recorded its fragment in `hashRef`, so it
   * stops at the first line and the browser's own traversal is not duplicated with an entry of
   * ours. That check also makes this idempotent under StrictMode's double-invocation: the
   * second run sees the fragment it just wrote and does nothing.
   */
  useEffect(() => {
    const target = hashFor(stepIndex)
    if (hashRef.current === target) return
    const first = hashRef.current === null
    hashRef.current = target
    try {
      if (first) history.replaceState(null, '', target)
      else history.pushState(null, '', target)
    } catch {
      // Sandboxed frame, `file://`, or Safari's pushState rate limit. Not worth a broken
      // guide: the step still changes, only the link stops keeping up.
    }
  }, [stepIndex])

  /**
   * Back and Forward move through the guide instead of out of it.
   *
   * Both events are listened for: traversing to a fragment-only entry fires `popstate`, and
   * editing the fragment in the address bar fires `hashchange`. Handling one move twice is
   * harmless — the second call sets the same index and React bails out.
   *
   * A move that comes from the URL is an ENTRY, not a navigation. It never routes through
   * `move()` and never marks anything solved, so it cannot weaken the checkpoint gate: a
   * checkpoint the learner lands on is unsolved and still blocks Next, and one they walk back
   * to blocks them again.
   */
  useEffect(() => {
    const onUrlNav = () => {
      const index = clamp(hashStepIndex() ?? 0)
      const target = hashFor(index)
      if (location.hash !== target) {
        // The URL named something unusable. Correct it IN PLACE — pushing would leave the bad
        // fragment one Back away, and correcting it again on arrival would trap the learner in
        // a fragment they can never get behind.
        try {
          history.replaceState(null, '', target)
        } catch {
          // As above.
        }
      }
      hashRef.current = target
      setStepIndex(index)
    }
    window.addEventListener('popstate', onUrlNav)
    window.addEventListener('hashchange', onUrlNav)
    return () => {
      window.removeEventListener('popstate', onUrlNav)
      window.removeEventListener('hashchange', onUrlNav)
    }
  }, [])

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
