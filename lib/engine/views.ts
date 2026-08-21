/**
 * Read-only projections. `publicView` never exposes any hidden hand card identity;
 * `seatView` adds exactly the viewing seat's own hand.
 */
import type { Card, GameState, PublicState, Seat } from './types.ts'

/** The shared public table state: counts, score, resolved half-suits, log — no hands. */
export function publicView(s: GameState): PublicState {
  return {
    phase: s.phase,
    turn: s.turn,
    counts: s.hands.map((h) => h.length),
    score: [s.score[0], s.score[1]],
    halfSuits: s.halfSuits,
    log: s.log,
    moveIndex: s.moveIndex,
  }
}

export type SeatView = PublicState & { seat: Seat; hand: Card[] }

/** Public state plus the viewing seat's own hand (a copy). */
export function seatView(s: GameState, seat: Seat): SeatView {
  return { ...publicView(s), seat, hand: [...s.hands[seat]] }
}
