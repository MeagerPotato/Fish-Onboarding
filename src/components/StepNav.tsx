/**
 * Back / next, plus the progress readout.
 *
 * Next is disabled while a checkpoint is unanswered — that is the whole point of a
 * checkpoint — and says so via `aria-describedby` rather than only by looking greyed out.
 *
 * There is deliberately no swipe gesture (docs/MOBILE_SPEC.md §6): it collides with the iOS
 * back gesture and with the horizontally scrolling hand, and it advances by accident.
 */
import s from './StepNav.module.css'

export interface StepNavProps {
  stepIndex: number
  stepCount: number
  progress: number
  blocked: boolean
  isFinished: boolean
  onBack: () => void
  onNext: () => void
  onRestart: () => void
}

export function StepNav({
  stepIndex,
  stepCount,
  progress,
  blocked,
  isFinished,
  onBack,
  onNext,
  onRestart,
}: StepNavProps) {
  return (
    <nav className={s.nav} data-testid="step-nav" aria-label="Guide navigation">
      <button
        type="button"
        className={s.back}
        data-testid="nav-back"
        onClick={onBack}
        disabled={stepIndex === 0}
      >
        Back
      </button>

      <p className={s.progress} data-testid="progress" aria-hidden="true">
        <span className={s.progressText}>
          {stepIndex + 1} / {stepCount}
        </span>
        <span className={s.progressTrack}>
          <span className={s.progressFill} style={{ inlineSize: `${Math.round(progress * 100)}%` }} />
        </span>
      </p>
      <span className={s.srOnly} aria-live="polite">
        Step {stepIndex + 1} of {stepCount}
      </span>

      {isFinished ? (
        <button type="button" className={s.next} data-testid="nav-restart" onClick={onRestart}>
          Start again
        </button>
      ) : (
        <>
          {/*
            `aria-disabled`, not `disabled`. A disabled Next drops out of the tab order, so a
            keyboard user tabbing forward simply finds nothing and is given no reason why.
            This stays focusable and is described by a reason that is VISIBLE, not sr-only —
            a sighted learner wondering why Next looks dead deserves the same answer.
            `onNext` is separately guarded in the hook, so a stray click is inert.
          */}
          <button
            type="button"
            className={s.next}
            data-testid="nav-next"
            onClick={onNext}
            aria-disabled={blocked}
            aria-describedby={blocked ? 'nav-blocked' : undefined}
            data-blocked={blocked ? 'true' : undefined}
          >
            Next
          </button>
          {blocked ? (
            <p id="nav-blocked" className={s.blockedReason} data-testid="nav-blocked">
              Answer above to continue
            </p>
          ) : null}
        </>
      )}
    </nav>
  )
}
