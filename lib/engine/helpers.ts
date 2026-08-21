/**
 * Legal-move enumeration and single-ask legality explanation.
 *
 * `explainAsk` exists for the tutorial: checkpoint 1 shows four candidate asks and has to
 * tell the learner *which gate* each illegal one trips. Rather than hard-coding that copy
 * against the rules, the checkpoint asks the engine and renders the answer, so the lesson
 * cannot disagree with the reducer.
 */
import type { Card, ErrorCode, GameState, HalfSuitId, Seat } from './types.ts'
import { ALL_CARDS, ALL_HALF_SUITS, ALL_SEATS, cardHalfSuit, isCard, seatTeam } from './cards.ts'

/**
 * Every legal ask for `seat`: empty unless it is that seat's turn in `playing`.
 * A seat can hold cards and still have zero legal asks (its hand is a union of complete
 * half-suits with every opponent out) — that simply yields an empty list.
 */
export function legalAsks(s: GameState, seat: Seat): { target: Seat; card: Card }[] {
  if (s.phase !== 'playing' || s.turn !== seat) return []
  const hand = s.hands[seat]
  if (hand.length === 0) return []
  const mine = new Set(hand.map(cardHalfSuit))
  const held = new Set(hand)
  const askable = ALL_CARDS.filter((c) => mine.has(cardHalfSuit(c)) && !held.has(c))
  const out: { target: Seat; card: Card }[] = []
  for (const target of ALL_SEATS) {
    if (seatTeam(target) === seatTeam(seat) || s.hands[target].length === 0) continue
    for (const card of askable) out.push({ target, card })
  }
  return out
}

/** The half-suits `seat` can legally ask into — those it holds at least one card of. */
export function askableHalfSuits(s: GameState, seat: Seat): HalfSuitId[] {
  const mine = new Set(s.hands[seat].map(cardHalfSuit))
  return ALL_HALF_SUITS.filter((h) => mine.has(h))
}

/** The unresolved half-suits, in canonical order. */
export function unresolvedHalfSuits(s: GameState): HalfSuitId[] {
  return ALL_HALF_SUITS.filter((h) => !s.halfSuits[h])
}

export type AskVerdict =
  | { legal: true; wouldHit: boolean }
  | { legal: false; code: ErrorCode; gate: AskGate; because: string }

/**
 * Which of the four beginner-facing gates an illegal ask trips (RULES.md §3).
 * `other` covers the structural errors a learner never meets in the tutorial
 * (wrong phase, not your turn, invalid card).
 */
export type AskGate = 'opponent' | 'half-suit' | 'own-card' | 'target-has-cards' | 'other'

const GATE_BY_CODE: Partial<Record<ErrorCode, AskGate>> = {
  TARGET_TEAMMATE: 'opponent',
  TARGET_SELF: 'opponent',
  NO_CARD_OF_HALF_SUIT: 'half-suit',
  ASKING_OWN_CARD: 'own-card',
  TARGET_OUT: 'target-has-cards',
}

/**
 * Explain one candidate ask against the true state: legal (and whether it would hit),
 * or the first gate it fails and a beginner-readable reason.
 *
 * Mirrors `reduceAsk`'s check order exactly. `tests/engine/explain.test.ts` cross-checks
 * every possible ask in a sample of states against `reduce`, so the two cannot diverge.
 */
export function explainAsk(s: GameState, seat: Seat, target: Seat, card: Card, seatName: (x: Seat) => string): AskVerdict {
  const fail = (code: ErrorCode, because: string): AskVerdict => ({
    legal: false,
    code,
    gate: GATE_BY_CODE[code] ?? 'other',
    because,
  })

  if (s.phase !== 'playing') return fail('WRONG_PHASE', 'the game is not in normal play right now.')
  if (seat !== s.turn) return fail('NOT_YOUR_TURN', `it is ${seatName(s.turn)}'s turn, not yours.`)
  if (s.hands[seat].length === 0) return fail('ASKER_OUT', 'you have no cards left, so you cannot ask.')
  if (target === seat) return fail('TARGET_SELF', 'you cannot ask yourself for a card.')
  if (seatTeam(target) === seatTeam(seat))
    return fail('TARGET_TEAMMATE', `${seatName(target)} is on your team, and you may never ask a teammate.`)
  if (s.hands[target].length === 0)
    return fail('TARGET_OUT', `${seatName(target)} is out of cards, so there is nothing to ask for.`)
  if (!isCard(card)) return fail('INVALID_CARD', 'that is not one of the 54 cards.')

  const halfSuit = cardHalfSuit(card)
  const hand = s.hands[seat]
  if (!hand.some((c) => cardHalfSuit(c) === halfSuit))
    return fail('NO_CARD_OF_HALF_SUIT', `you hold no card of that half-suit, so you may not ask into it.`)
  if (hand.includes(card)) return fail('ASKING_OWN_CARD', 'that card is already in your own hand.')

  return { legal: true, wouldHit: s.hands[target].includes(card) }
}

/** Which action kinds are available to the seat whose move it is. */
export function legalActionKinds(s: GameState): ('ask' | 'claim' | 'pass' | 'designate')[] {
  switch (s.phase) {
    case 'playing': {
      const kinds: ('ask' | 'claim' | 'pass' | 'designate')[] = []
      if (legalAsks(s, s.turn).length > 0) kinds.push('ask')
      if (unresolvedHalfSuits(s).length > 0) kinds.push('claim')
      return kinds
    }
    case 'endgame':
      return ['claim']
    case 'awaitPass':
      return ['pass']
    case 'awaitDesignate':
      return ['designate']
    case 'finished':
      return []
  }
}

/** True holder of a card, or -1 once its half-suit has been claimed away. */
export function holderOf(s: GameState, card: Card): Seat | -1 {
  return s.hands.findIndex((h) => h.includes(card)) as Seat | -1
}
