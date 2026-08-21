/**
 * The resume notice. docs/MOBILE_SPEC.md §1.3, defect D12.
 *
 * `savedStartIndex()` silently moves a returning learner to where they stopped. Silently is
 * the bug: someone who put the phone down at step 12 comes back to a screen that does not
 * match the last thing they remember, with no way to say "no, start me again".
 *
 * Three things it deliberately does not do:
 *   - It never takes focus. It appears at load, and moving focus at load throws a screen
 *     reader (and a keyboard) out of the reading order for a message that is not urgent.
 *     `role="status"` on the sentence announces it politely instead, when the reader is ready.
 *   - It is not a dialog. §1.3 forbids "Resume? / Start over?" — a decision the learner has no
 *     context to make in under a second, at a table, with people waiting. It is in normal flow
 *     and covers nothing.
 *   - It runs no dismiss timer. §1.3 suggests 8s; text that removes itself and the button it
 *     contains, out from under a slow reader or a keyboard user mid-tab, is WCAG 2.2.1. The
 *     owner unmounts it — on dismiss, on restart, and on the first step change.
 */
import s from './ResumeBar.module.css'

export interface ResumeBarProps {
  /** 1-based, so it matches the "12 / 19" the learner reads in the nav. */
  stepNumber: number
  /** Keep the position, drop the notice. */
  onDismiss: () => void
  /** Throw the saved position away and begin again at step 1. */
  onRestart: () => void
}

export function ResumeBar({ stepNumber, onDismiss, onRestart }: ResumeBarProps) {
  return (
    <aside
      className={s.bar}
      data-testid="resume-bar"
      data-resumed-step={stepNumber}
      aria-label="Resumed progress"
    >
      {/* §1.3's wording. The glyph is on the message, so "you were moved" is never the tint alone. */}
      <p className={s.message} role="status">
        Picked up at <strong>step {stepNumber}</strong>.
      </p>

      {/* Grouped so the two controls wrap as a pair, never one-per-line on a 320px phone. */}
      <div className={s.actions}>
        <button type="button" className={s.restart} data-testid="resume-restart" onClick={onRestart}>
          Start over
        </button>

        <button type="button" className={s.dismiss} data-testid="resume-dismiss" onClick={onDismiss}>
          <span aria-hidden="true">✕</span>
          <span className={s.srOnly}>Dismiss this notice</span>
        </button>
      </div>
    </aside>
  )
}
