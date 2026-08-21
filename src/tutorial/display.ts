/**
 * How cards and half-suits are named on screen and to a screen reader.
 *
 * Two accessibility rules from docs/MOBILE_SPEC.md are enforced here rather than left to
 * the designer, because getting them wrong makes the game unplayable rather than ugly:
 *
 *  1. Suit is never communicated by colour alone. Every card carries a suit SYMBOL and a
 *     `shape` key; colour is decoration on top of that.
 *  2. The two jokers are distinguished by a written word and a distinct mark, not by hue.
 *     "Ask for the red joker" is a different move from "ask for the black joker", and a
 *     player who cannot tell them apart cannot play.
 */
import { cardHalfSuit, cardRank, cardSuit, halfSuitCards, isJoker } from '../../lib/engine/index.ts'
import type { Card, HalfSuitId, Rank, Suit } from '../../lib/engine/index.ts'

export const SUIT_SYMBOL: Record<Suit, string> = { C: '♣', D: '♦', H: '♥', S: '♠' }
export const SUIT_NAME: Record<Suit, string> = { C: 'clubs', D: 'diamonds', H: 'hearts', S: 'spades' }

/**
 * Colour family. Deliberately four-way rather than red/black: `docs/MOBILE_SPEC.md` argues
 * for a four-colour deck at arm's length, and a four-way key lets the designer collapse it
 * to two if they prefer without changing any component.
 */
export const SUIT_KEY: Record<Suit, 'clubs' | 'diamonds' | 'hearts' | 'spades'> = {
  C: 'clubs',
  D: 'diamonds',
  H: 'hearts',
  S: 'spades',
}

/** Rank as printed on a card. The only one that is not its own id is the ten. */
export function rankLabel(r: Rank): string {
  return r === 'T' ? '10' : r
}

/** Rank spoken in full, for screen readers and body copy. */
export function rankName(r: Rank): string {
  const names: Partial<Record<Rank, string>> = { T: 'ten', J: 'jack', Q: 'queen', K: 'king', A: 'ace' }
  return names[r] ?? r
}

export interface CardDisplay {
  card: Card
  /** Big glyph: "10", "Q", or the joker mark. */
  rank: string
  /** Suit symbol, or the joker mark again. Empty string for nothing. */
  suit: string
  /** Styling hook. Jokers get their own two keys so they never depend on hue. */
  key: 'clubs' | 'diamonds' | 'hearts' | 'spades' | 'joker-red' | 'joker-black'
  /** Short written label for cramped chips: "10♥", "RJ". */
  short: string
  /** Full spoken name: "ten of hearts", "the red joker". */
  spoken: string
  isJoker: boolean
}

export function cardDisplay(card: Card): CardDisplay {
  if (isJoker(card)) {
    const red = card === 'RJ'
    return {
      card,
      // A star and a crescent — two shapes, legible at 28px, distinct without colour.
      rank: red ? '★' : '☾',
      suit: red ? 'RED' : 'BLK',
      key: red ? 'joker-red' : 'joker-black',
      short: red ? 'RJ' : 'BJ',
      spoken: red ? 'the red joker' : 'the black joker',
      isJoker: true,
    }
  }
  const r = cardRank(card) as Rank
  const s = cardSuit(card) as Suit
  return {
    card,
    rank: rankLabel(r),
    suit: SUIT_SYMBOL[s],
    key: SUIT_KEY[s],
    short: `${rankLabel(r)}${SUIT_SYMBOL[s]}`,
    spoken: `${rankName(r)} of ${SUIT_NAME[s]}`,
    isJoker: false,
  }
}

/** Half-suit name as the guide says it out loud. */
export function halfSuitName(id: HalfSuitId): string {
  if (id === 'EIGHTS') return 'Eights & Jokers'
  const half = id.startsWith('LOW') ? 'Low' : 'High'
  const suit = SUIT_NAME[id.slice(-1) as Suit]
  return `${half} ${suit}`
}

/** Compact form for a chip: "Low ♠", "8s & 🃏". */
export function halfSuitShort(id: HalfSuitId): string {
  if (id === 'EIGHTS') return '8s + Jokers'
  const half = id.startsWith('LOW') ? 'Low' : 'High'
  return `${half} ${SUIT_SYMBOL[id.slice(-1) as Suit]}`
}

/** The range a half-suit covers, for the reference card: "2–7", "9–A", "8s and both jokers". */
export function halfSuitRange(id: HalfSuitId): string {
  if (id === 'EIGHTS') return 'the four 8s and both jokers'
  return id.startsWith('LOW') ? '2 through 7' : '9 through Ace'
}

/** Every card of a half-suit, ready to render. */
export function halfSuitDisplay(id: HalfSuitId): CardDisplay[] {
  return halfSuitCards(id).map(cardDisplay)
}

/** Group a hand into its half-suits, in canonical order — how a player physically holds it. */
export function groupHand(hand: readonly Card[]): { halfSuit: HalfSuitId; name: string; cards: CardDisplay[] }[] {
  const groups = new Map<HalfSuitId, Card[]>()
  for (const c of hand) {
    const h = cardHalfSuit(c)
    const list = groups.get(h)
    if (list) list.push(c)
    else groups.set(h, [c])
  }
  return [...groups.entries()].map(([halfSuit, cards]) => ({
    halfSuit,
    name: halfSuitName(halfSuit),
    cards: cards.map(cardDisplay),
  }))
}
