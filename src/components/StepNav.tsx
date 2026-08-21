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
          <button
            type="button"
            className={s.next}
            data-testid="nav-next"
            onClick={onNext}
            disabled={blocked}
            aria-describedby={blocked ? 'nav-blocked' : undefined}
          >
            Next
          </button>
          {blocked ? (
            <span id="nav-blocked" className={s.srOnly}>
              Answer the question above to continue.
            </span>
          ) : null}
        </>
      )}
    </nav>
  )
}
