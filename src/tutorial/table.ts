/**
 * Who is at the table, and the deal the teaching game runs on.
 *
 * The learner sits at seat 0. Everyone else has a name rather than a seat number because
 * "ask Ravi for the 5 of spades" is a sentence a beginner can hold in their head and
 * "ask P1 for 5S" is not.
 *
 * The deal is hand-authored, not seeded. Every checkpoint in this guide is solvable by
 * deduction from the public log alone, and that is only true if the cards are placed
 * deliberately. `tests/tutorial/script.test.ts` proves the deal is legal (54 cards, 9 each)
 * and that every scripted action is accepted by the engine.
 */
import type { Card, Seat, Team } from '../../lib/engine/index.ts'

export const YOU: Seat = 0

export interface Player {
  seat: Seat
  /** Display name. Seat 0 is always "You". */
  name: string
  team: Team
  /** True for the learner's own seat. */
  isYou: boolean
}

export const PLAYERS: readonly Player[] = [
  { seat: 0, name: 'You', team: 0, isYou: true },
  { seat: 1, name: 'Ravi', team: 1, isYou: false },
  { seat: 2, name: 'Mia', team: 0, isYou: false },
  { seat: 3, name: 'Dana', team: 1, isYou: false },
  { seat: 4, name: 'Kofi', team: 0, isYou: false },
  { seat: 5, name: 'Sam', team: 1, isYou: false },
]

export const TEAM_NAMES: Record<Team, string> = { 0: 'Blue', 1: 'Red' }

export function playerAt(seat: Seat): Player {
  return PLAYERS[seat]
}

/** Display name for a seat. */
export function seatName(seat: Seat): string {
  return PLAYERS[seat].name
}

/**
 * Possessive form, so copy can say "Ravi's hand" and "your hand" from one helper
 * without a special case at every call site.
 */
export function seatPossessive(seat: Seat): string {
  return seat === YOU ? 'your' : `${PLAYERS[seat].name}'s`
}

/** Subject form: "you" / "Ravi". */
export function seatSubject(seat: Seat): string {
  return seat === YOU ? 'you' : PLAYERS[seat].name
}

/** The learner's two teammates, in seat order. */
export const YOUR_TEAMMATES: readonly Seat[] = [2, 4]

/**
 * The teaching deal, seat by seat. Nine cards each, 54 in total.
 *
 * Shape of the game it produces:
 *  - Your team (You, Mia, Kofi) will win LOW-C, LOW-S, HIGH-C, HIGH-H and EIGHTS.
 *  - Their team (Ravi, Dana, Sam) will win LOW-D, LOW-H, HIGH-D and HIGH-S.
 *  - Eight half-suits resolve 4-4, and the ninth — Eights & Jokers — decides it 5-4.
 *
 * Five of your team's cards start in opposing hands (5S, 7S, 8H with Ravi and Dana,
 * RJ and BJ with Sam) so the guide has real hits to teach with, and two of theirs start
 * with you (2H) and Mia (9S) so the opposition has something to fish back.
 */
export const TUTORIAL_DEAL: readonly (readonly Card[])[] = [
  // Seat 0 — You
  ['2C', '3C', '2H', '2S', '3S', '4S', 'TH', '8C', '8D'],
  // Seat 1 — Ravi
  ['2D', '3D', '3H', '4H', '5S', '9D', 'TD', 'TS', '8H'],
  // Seat 2 — Mia
  ['4C', '5C', '6S', '9C', 'TC', 'JC', 'JH', 'QH', '9S'],
  // Seat 3 — Dana
  ['4D', '5D', '5H', '6H', '7S', 'JD', 'QD', 'JS', 'QS'],
  // Seat 4 — Kofi
  ['6C', '7C', 'QC', 'KC', 'AC', '9H', 'KH', 'AH', '8S'],
  // Seat 5 — Sam
  ['6D', '7D', '7H', 'KD', 'AD', 'KS', 'AS', 'RJ', 'BJ'],
]
