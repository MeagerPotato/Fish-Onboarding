/**
 * The six seats, their public card counts, and whose turn it is.
 *
 * Card counts are public information (RULES.md row 18) and are one of the few hard facts a
 * beginner can act on, so they are always rendered — never behind a tap.
 *
 * `data-active` marks the seat to act. docs/DESIGN_INSPIRATION.md recommends carrying that
 * with an opacity step on the *other* seats rather than a badge on the active one; either
 * is fine, but the active seat must be identifiable without colour.
 */
import type { SeatVM } from '../tutorial/viewmodels.ts'
import s from './TableView.module.css'

export interface TableViewProps {
  seats: SeatVM[]
  /** Seats the current annotation is pointing at, highlighted for the duration of a step. */
  spotlight?: number[]
  /** Optional: makes askable opponents clickable. Unused by the scripted guide. */
  onSeatClick?: (seat: number) => void
}

export function TableView({ seats, spotlight = [], onSeatClick }: TableViewProps) {
  return (
    <section className={s.table} data-testid="table" aria-label="The table">
      <ol className={s.seats}>
        {seats.map((seat) => {
          const isSpotlit = spotlight.includes(seat.seat)
          const label = `${seat.name}, ${seat.team === 0 ? 'Blue' : 'Red'} team, ${
            seat.isOut ? 'out of cards' : `${seat.count} cards`
          }${seat.isActive ? ', to act' : ''}`

          const inner = (
            <>
              <span className={s.name}>{seat.name}</span>
              <span className={s.count} data-testid={`count-${seat.seat}`} aria-hidden="true">
                {seat.isOut ? '—' : seat.count}
              </span>
              {seat.isYou ? (
                <span className={s.you} aria-hidden="true">
                  you
                </span>
              ) : null}
            </>
          )

          return (
            <li
              key={seat.seat}
              className={s.seat}
              data-testid={`seat-${seat.seat}`}
              data-seat={seat.seat}
              data-team={seat.team}
              data-you={seat.isYou ? 'true' : undefined}
              data-active={seat.isActive ? 'true' : undefined}
              data-out={seat.isOut ? 'true' : undefined}
              data-askable={seat.isAskable ? 'true' : undefined}
              data-spotlight={isSpotlit ? 'true' : undefined}
              aria-current={seat.isActive ? 'true' : undefined}
            >
              {onSeatClick && seat.isAskable ? (
                <button type="button" className={s.seatButton} onClick={() => onSeatClick(seat.seat)} aria-label={label}>
                  {inner}
                </button>
              ) : (
                <span className={s.seatBody} aria-label={label} role="group">
                  {inner}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </section>
  )
}
