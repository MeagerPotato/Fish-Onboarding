/**
 * Card and half-suit constants plus pure helpers. RULES.md rows 1-3 and §2.
 */
import type { Card, HalfSuitId, Joker, Rank, Seat, Suit, Team } from './types.ts'

export const SUITS: readonly Suit[] = ['C', 'D', 'H', 'S']
export const LOW_RANKS: readonly Rank[] = ['2', '3', '4', '5', '6', '7']
export const HIGH_RANKS: readonly Rank[] = ['9', 'T', 'J', 'Q', 'K', 'A']
export const JOKERS: readonly Joker[] = ['RJ', 'BJ']

/** The 9th half-suit: the four 8s then the two jokers (RULES.md row 3). */
export const EIGHTS_CARDS: readonly Card[] = [...SUITS.map((s): Card => `8${s}`), ...JOKERS]

/**
 * All nine half-suits in canonical display order: the four LOW, the four HIGH,
 * then EIGHTS last — the odd one out, which is exactly how the guide introduces it.
 */
export const ALL_HALF_SUITS: readonly HalfSuitId[] = [
  ...SUITS.map((s): HalfSuitId => `LOW-${s}`),
  ...SUITS.map((s): HalfSuitId => `HIGH-${s}`),
  'EIGHTS',
]

const HALF_SUIT_CARDS: ReadonlyMap<HalfSuitId, readonly Card[]> = new Map(
  ALL_HALF_SUITS.map((id) => {
    if (id === 'EIGHTS') return [id, EIGHTS_CARDS] as const
    const ranks = id.startsWith('LOW') ? LOW_RANKS : HIGH_RANKS
    const suit = id.slice(-1) as Suit
    return [id, ranks.map((r): Card => `${r}${suit}`)] as const
  }),
)

/**
 * All 54 cards in canonical order — half-suit-major, then rank within the half-suit.
 * Sorting a hand by this order groups each half-suit together, which is how a player
 * physically arranges their hand and how the tutorial expects to render it.
 */
export const ALL_CARDS: readonly Card[] = ALL_HALF_SUITS.flatMap((id) => halfSuitCards(id))

const CARD_SET: ReadonlySet<string> = new Set(ALL_CARDS)
const CARD_ORDER: ReadonlyMap<Card, number> = new Map(ALL_CARDS.map((c, i) => [c, i]))

const CARD_HALF_SUIT: ReadonlyMap<Card, HalfSuitId> = new Map(
  ALL_HALF_SUITS.flatMap((id) => halfSuitCards(id).map((c) => [c, id] as const)),
)

/** Runtime guard: is this string one of the 54 real cards? */
export function isCard(x: string): x is Card {
  return CARD_SET.has(x)
}

/** Runtime guard: is this string one of the 9 half-suit ids? */
export function isHalfSuitId(x: string): x is HalfSuitId {
  return HALF_SUIT_CARDS.has(x as HalfSuitId)
}

/** The half-suit a card belongs to. Every one of the 54 cards has exactly one. */
export function cardHalfSuit(c: Card): HalfSuitId {
  return CARD_HALF_SUIT.get(c) ?? 'EIGHTS'
}

/** The six cards of a half-suit, in canonical order. Unknown ids yield []. */
export function halfSuitCards(id: HalfSuitId): readonly Card[] {
  if (id === 'EIGHTS') return EIGHTS_CARDS
  const ranks = id.startsWith('LOW') ? LOW_RANKS : id.startsWith('HIGH') ? HIGH_RANKS : null
  if (!ranks) return []
  const suit = id.slice(-1) as Suit
  if (!SUITS.includes(suit)) return []
  return ranks.map((r): Card => `${r}${suit}`)
}

/** Is this card one of the two jokers? */
export function isJoker(c: Card): c is Joker {
  return c === 'RJ' || c === 'BJ'
}

/** The suit of a card, or null for the jokers (which belong to no suit). */
export function cardSuit(c: Card): Suit | null {
  return isJoker(c) ? null : (c[1] as Suit)
}

/** The rank of a card, or null for the jokers. */
export function cardRank(c: Card): Rank | null {
  return isJoker(c) ? null : (c[0] as Rank)
}

/** Canonical comparison — half-suit-major, then rank. Keeps hands deterministically sorted. */
export function cardCompare(a: Card, b: Card): number {
  return (CARD_ORDER.get(a) ?? -1) - (CARD_ORDER.get(b) ?? -1)
}

/** A new array of the hand in canonical sorted order. */
export function sortHand(hand: readonly Card[]): Card[] {
  return [...hand].sort(cardCompare)
}

/** Teams alternate by seat: 0,2,4 = team 0; 1,3,5 = team 1 (RULES.md row 1). */
export function seatTeam(s: Seat): Team {
  return (s % 2) as Team
}

export const ALL_SEATS: readonly Seat[] = [0, 1, 2, 3, 4, 5]

/**
 * Half-suits needed to win. The game stops the moment a team reaches this (RULES.md row 22).
 * Five of nine is an unbeatable majority, so nothing is decided by playing the rest out.
 */
export const HALF_SUITS_TO_WIN = 5

/** The three seats of a team, ascending. */
export function teamSeats(t: Team): readonly Seat[] {
  return t === 0 ? [0, 2, 4] : [1, 3, 5]
}

/** The opposing team. */
export function otherTeam(t: Team): Team {
  return t === 0 ? 1 : 0
}

/** Total cards in a team's three hands. */
export function teamCardCount(hands: readonly (readonly Card[])[], t: Team): number {
  return teamSeats(t).reduce<number>((n, s) => n + hands[s].length, 0)
}
