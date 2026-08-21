/**
 * Pure projections from engine state to the props every component renders.
 *
 * All the shaping decisions live here so the components stay dumb and the designer can
 * restyle them without reasoning about the rules. Everything in this file is a pure
 * function of `GameState` — no React, no DOM, no time, no randomness.
 */
import {
  ALL_HALF_SUITS,
  ALL_SEATS,
  halfSuitCards,
  seatTeam,
  type Card,
  type GameState,
  type HalfSuitId,
  type Outcome,
  type PublicEvent,
  type Seat,
  type Team,
} from '../../lib/engine/index.ts'
import { PLAYERS, YOU, seatName } from './table.ts'
import { cardDisplay, groupHand, halfSuitName, halfSuitShort, type CardDisplay } from './display.ts'

/* ----------------------------------------------------------------- table --- */

export interface SeatVM {
  seat: Seat
  name: string
  team: Team
  isYou: boolean
  /** Public card count. Always known to everyone (RULES.md row 18). */
  count: number
  /** True when this seat is to act. */
  isActive: boolean
  /** True once they have no cards: they cannot ask and cannot be asked. */
  isOut: boolean
  /** True when the learner may legally ask this seat right now. */
  isAskable: boolean
}

export function tableVM(s: GameState): SeatVM[] {
  return ALL_SEATS.map((seat) => {
    const count = s.hands[seat].length
    return {
      seat,
      name: seatName(seat),
      team: seatTeam(seat),
      isYou: seat === YOU,
      count,
      isActive: s.turn === seat && s.phase !== 'finished',
      isOut: count === 0,
      isAskable: seatTeam(seat) !== seatTeam(YOU) && count > 0 && s.turn === YOU && s.phase === 'playing',
    }
  })
}

/* ------------------------------------------------------------------ hand --- */

export interface HandGroupVM {
  halfSuit: HalfSuitId
  name: string
  cards: CardDisplay[]
}

export function handVM(s: GameState, seat: Seat = YOU): HandGroupVM[] {
  return groupHand(s.hands[seat])
}

/* ----------------------------------------------------------------- score --- */

export type HalfSuitState = 'open' | 'team0' | 'team1' | 'void'

export interface HalfSuitVM {
  id: HalfSuitId
  name: string
  short: string
  state: HalfSuitState
  /** Who claimed it, once resolved. */
  claimedBy: string | null
  /** True for EIGHTS — the guide marks the ninth out visually. */
  isNinth: boolean
}

export function halfSuitsVM(s: GameState): HalfSuitVM[] {
  return ALL_HALF_SUITS.map((id) => {
    const r = s.halfSuits[id]
    return {
      id,
      name: halfSuitName(id),
      short: halfSuitShort(id),
      state: (r?.outcome ?? 'open') as HalfSuitState,
      claimedBy: r ? seatName(r.claimer) : null,
      isNinth: id === 'EIGHTS',
    }
  })
}

export interface ScoreVM {
  blue: number
  red: number
  /** Half-suits neither team scored. */
  voided: number
  remaining: number
  halfSuits: HalfSuitVM[]
  /** Set only once the game is over. */
  winner: 'blue' | 'red' | 'tie' | null
}

export function scoreVM(s: GameState): ScoreVM {
  const halfSuits = halfSuitsVM(s)
  const voided = halfSuits.filter((h) => h.state === 'void').length
  const remaining = halfSuits.filter((h) => h.state === 'open').length
  const winner =
    s.phase !== 'finished' ? null : s.score[0] > s.score[1] ? 'blue' : s.score[1] > s.score[0] ? 'red' : 'tie'
  return { blue: s.score[0], red: s.score[1], voided, remaining, halfSuits, winner }
}

/* ------------------------------------------------------------------- log --- */

export interface LogEntryVM {
  /** Stable key for React. */
  id: string
  kind: PublicEvent['type']
  /** One plain sentence, already in the guide's voice. */
  text: string
  /** Cards to render inline alongside the sentence, if any. */
  cards: CardDisplay[]
  /** Whose action it was, for team colouring. */
  actor: Seat | null
  /** Set on asks: did it land? */
  hit: boolean | null
  /** Set on claims. */
  outcome: Outcome | null
}

function subject(seat: Seat): string {
  return seat === YOU ? 'You' : seatName(seat)
}

function verb(seat: Seat, youForm: string, otherForm: string): string {
  return seat === YOU ? youForm : otherForm
}

export function logVM(s: GameState): LogEntryVM[] {
  return s.log.map((e, i): LogEntryVM => {
    const id = `${i}-${e.type}`
    switch (e.type) {
      case 'game_started':
        return {
          id,
          kind: e.type,
          text: `Cards dealt. ${subject(e.startingSeat)} to open.`,
          cards: [],
          actor: e.startingSeat,
          hit: null,
          outcome: null,
        }
      case 'ask': {
        const d = cardDisplay(e.card)
        const asked = e.target === YOU ? 'you' : seatName(e.target)
        return {
          id,
          kind: e.type,
          text: e.hit
            ? `${subject(e.asker)} ${verb(e.asker, 'ask', 'asks')} ${asked} for ${d.spoken} — and ${verb(e.target, 'you hand', `${seatName(e.target)} hands`)} it over.`
            : `${subject(e.asker)} ${verb(e.asker, 'ask', 'asks')} ${asked} for ${d.spoken} — no. The turn passes to ${asked}.`,
          cards: [d],
          actor: e.asker,
          hit: e.hit,
          outcome: null,
        }
      }
      case 'claim': {
        const who = subject(e.claimer)
        const name = halfSuitName(e.halfSuit)
        const text =
          e.outcome === 'void'
            ? `${who} ${verb(e.claimer, 'claim', 'claims')} ${name} — but a card was placed in the wrong hand. Void: nobody scores it.`
            : seatTeam(e.claimer) === (e.outcome === 'team0' ? 0 : 1)
              ? `${who} ${verb(e.claimer, 'claim', 'claims')} ${name} — all six correct.`
              : `${who} ${verb(e.claimer, 'claim', 'claims')} ${name} — but the other team held one of the six, so they score it.`
        return {
          id,
          kind: e.type,
          text,
          cards: Object.keys(e.actualHolders).map((c) => cardDisplay(c as Card)),
          actor: e.claimer,
          hit: null,
          outcome: e.outcome,
        }
      }
      case 'pass':
        return {
          id,
          kind: e.type,
          text: `${subject(e.from)} ran out of cards on that claim and ${verb(e.from, 'pass', 'passes')} the turn to ${seatName(e.to)}.`,
          cards: [],
          actor: e.from,
          hit: null,
          outcome: null,
        }
      case 'designate':
        return {
          id,
          kind: e.type,
          text: `${subject(e.from)} ${verb(e.from, 'choose', 'chooses')} ${e.to === YOU ? 'you' : seatName(e.to)} to claim out the rest.`,
          cards: [],
          actor: e.from,
          hit: null,
          outcome: null,
        }
      case 'player_out':
        return {
          id,
          kind: e.type,
          text: `${subject(e.seat)} ${verb(e.seat, 'are', 'is')} out of cards and can no longer be asked.`,
          cards: [],
          actor: e.seat,
          hit: null,
          outcome: null,
        }
      case 'endgame':
        return {
          id,
          kind: e.type,
          text: `One team is out of cards. The other side must now claim every half-suit that is left, alone.`,
          cards: [],
          actor: null,
          hit: null,
          outcome: null,
        }
      case 'game_over':
        return {
          id,
          kind: e.type,
          text:
            e.winner === 'tie'
              ? `Game over — ${e.score[0]}–${e.score[1]}. A draw, which only voided half-suits can produce.`
              : `Game over — ${e.winner === 0 ? 'Blue' : 'Red'} wins it ${Math.max(...e.score)}–${Math.min(...e.score)}.`,
          cards: [],
          actor: null,
          hit: null,
          outcome: null,
        }
    }
  })
}

/* ------------------------------------------------------------ claim sheet --- */

export interface ClaimRowVM {
  card: CardDisplay
  /** The seats the learner may assign this card to — their own team, always three. */
  options: { seat: Seat; name: string }[]
  /** Current selection, or null while unplaced. */
  chosen: Seat | null
}

/** One row per card of the half-suit, each offering the learner's three team seats. */
export function claimRowsVM(halfSuit: HalfSuitId, chosen: Partial<Record<Card, Seat>>): ClaimRowVM[] {
  const options = PLAYERS.filter((p) => p.team === seatTeam(YOU)).map((p) => ({ seat: p.seat, name: p.name }))
  return halfSuitCards(halfSuit).map((card) => ({
    card: cardDisplay(card),
    options,
    chosen: chosen[card] ?? null,
  }))
}

/** True once every card has been placed — the submit button's enabled condition. */
export function claimIsComplete(halfSuit: HalfSuitId, chosen: Partial<Record<Card, Seat>>): boolean {
  return halfSuitCards(halfSuit).every((c) => chosen[c] !== undefined)
}
