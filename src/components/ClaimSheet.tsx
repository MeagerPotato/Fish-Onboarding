/**
 * Checkpoints 3 and 4: place all six cards of a half-suit with the teammate holding it.
 *
 * Pattern is a per-card segmented control with all six rows visible at once — the choice
 * recommended in docs/MOBILE_SPEC.md §5. The reasoning there is worth repeating, because it
 * constrains any redesign: a claim is a *simultaneous* deduction ("if Kofi has the jokers,
 * his other card must be the 8 of spades"), so any pattern that shows one card at a time —
 * a stepper, a wizard, a drag target that scrolls — destroys the exact reasoning the
 * checkpoint exists to teach. Keep all six rows on screen together.
 *
 * Drag-and-drop was evaluated and rejected: it does not fire for touch on iOS Safari, needs
 * a long-press delay to disambiguate from scrolling, and requires a keyboard-operable
 * fallback that is itself this control.
 */
import { PlayingCard } from './PlayingCard.tsx'
import { halfSuitName } from '../tutorial/display.ts'
import type { ClaimCheckpoint } from '../tutorial/script.ts'
import type { ClaimRowVM } from '../tutorial/viewmodels.ts'
import type { Card, Seat } from '../../lib/engine/index.ts'
import s from './ClaimSheet.module.css'

export interface ClaimSheetProps {
  checkpoint: ClaimCheckpoint
  rows: ClaimRowVM[]
  canSubmit: boolean
  solved: boolean
  error: string | null
  attempts: number
  onPlace: (card: Card, seat: Seat) => void
  onSubmit: () => void
  onReveal: () => void
}

export function ClaimSheet({
  checkpoint,
  rows,
  canSubmit,
  solved,
  error,
  attempts,
  onPlace,
  onSubmit,
  onReveal,
}: ClaimSheetProps) {
  const name = halfSuitName(checkpoint.halfSuit)
  const placed = rows.filter((r) => r.chosen !== null).length

  return (
    <section className={s.sheet} data-testid="checkpoint-claim" aria-labelledby="claim-prompt">
      <p className={s.brief}>{checkpoint.brief}</p>
      <h2 className={s.prompt} id="claim-prompt">
        {checkpoint.prompt}
      </h2>

      <ol className={s.rows} data-testid="claim-rows">
        {rows.map((row) => (
          <li key={row.card.card} className={s.row} data-placed={row.chosen !== null ? 'true' : undefined}>
            <PlayingCard card={row.card} size="sm" />

            <fieldset className={s.seats}>
              <legend className={s.srOnly}>Who holds the {row.card.spoken}?</legend>
              {row.options.map((option) => {
                const checked = row.chosen === option.seat
                return (
                  <label
                    key={option.seat}
                    className={s.seatOption}
                    data-checked={checked ? 'true' : undefined}
                    data-testid={`claim-${row.card.card}-seat-${option.seat}`}
                  >
                    <input
                      type="radio"
                      className={s.radio}
                      name={`claim-${row.card.card}`}
                      value={option.seat}
                      checked={checked}
                      disabled={solved}
                      onChange={() => onPlace(row.card.card, option.seat)}
                    />
                    <span className={s.seatLabel}>{option.name}</span>
                  </label>
                )
              })}
            </fieldset>
          </li>
        ))}
      </ol>

      <p className={s.progress} data-testid="claim-progress" aria-live="polite">
        {placed} of {rows.length} placed
      </p>

      {!solved ? (
        <button
          type="button"
          className={s.submit}
          data-testid="claim-submit"
          onClick={onSubmit}
          disabled={!canSubmit}
        >
          Claim {name}
        </button>
      ) : null}

      {error && !solved ? (
        <p className={s.error} data-testid="claim-error" role="alert">
          {error}
        </p>
      ) : null}

      {/* After one wrong attempt, show how each card's location was knowable. */}
      {attempts >= 1 && !solved ? (
        <details className={s.hints} data-testid="claim-hints">
          <summary className={s.hintsSummary}>How could you have known?</summary>
          <ul className={s.deductions}>
            {checkpoint.deductions.map((d) => (
              <li key={d.card} className={s.deduction}>
                <strong>{d.card}</strong> — {d.because}
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {attempts >= 2 && !solved ? (
        <button type="button" className={s.reveal} data-testid="claim-reveal" onClick={onReveal}>
          Show me the answer
        </button>
      ) : null}

      {solved ? (
        <div className={s.solved} data-testid="claim-solved" role="status">
          <p className={s.revealText}>{checkpoint.reveal}</p>
          <ul className={s.deductions}>
            {checkpoint.deductions.map((d) => (
              <li key={d.card} className={s.deduction}>
                <strong>{d.card}</strong> — {d.because}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
