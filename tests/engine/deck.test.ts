/**
 * The deck itself — the part this variant changes. RULES.md §2.
 */
import { describe, expect, it } from 'vitest'
import {
  ALL_CARDS,
  ALL_HALF_SUITS,
  EIGHTS_CARDS,
  cardHalfSuit,
  cardRank,
  cardSuit,
  dealHands,
  halfSuitCards,
  isCard,
  isJoker,
  seatTeam,
  sortHand,
  teamSeats,
  validateDeal,
} from '../../lib/engine/index.ts'
import type { Card } from '../../lib/engine/index.ts'

describe('the 54-card deck', () => {
  it('has exactly 54 distinct cards', () => {
    expect(ALL_CARDS).toHaveLength(54)
    expect(new Set(ALL_CARDS).size).toBe(54)
  })

  it('contains both jokers and all four eights', () => {
    for (const c of ['RJ', 'BJ', '8C', '8D', '8H', '8S'] as Card[]) {
      expect(ALL_CARDS).toContain(c)
    }
  })

  it('rejects strings that are not cards', () => {
    for (const bad of ['1C', 'XZ', '8', 'J', 'RJ ', 'rj', '10C', '']) {
      expect(isCard(bad)).toBe(false)
    }
  })

  it('treats the jokers as suitless and rankless', () => {
    expect(isJoker('RJ')).toBe(true)
    expect(isJoker('BJ')).toBe(true)
    expect(isJoker('8C')).toBe(false)
    expect(cardSuit('RJ')).toBeNull()
    expect(cardRank('BJ')).toBeNull()
    expect(cardSuit('8C')).toBe('C')
    expect(cardRank('8C')).toBe('8')
  })
})

describe('the nine half-suits', () => {
  it('is nine half-suits of six, partitioning all 54 cards', () => {
    expect(ALL_HALF_SUITS).toHaveLength(9)
    const seen = new Set<Card>()
    for (const h of ALL_HALF_SUITS) {
      const cards = halfSuitCards(h)
      expect(cards, `${h} should have 6 cards`).toHaveLength(6)
      for (const c of cards) {
        expect(seen.has(c), `${c} appears in two half-suits`).toBe(false)
        seen.add(c)
      }
    }
    expect(seen.size).toBe(54)
  })

  it('puts the four eights and both jokers in EIGHTS', () => {
    expect([...EIGHTS_CARDS].sort()).toEqual(['8C', '8D', '8H', '8S', 'BJ', 'RJ'].sort())
    for (const c of EIGHTS_CARDS) expect(cardHalfSuit(c)).toBe('EIGHTS')
  })

  it('keeps 8s out of the LOW and HIGH half-suits', () => {
    for (const h of ALL_HALF_SUITS) {
      if (h === 'EIGHTS') continue
      for (const c of halfSuitCards(h)) expect(cardRank(c)).not.toBe('8')
    }
  })

  it('maps every card back to the half-suit that contains it', () => {
    for (const h of ALL_HALF_SUITS) {
      for (const c of halfSuitCards(h)) expect(cardHalfSuit(c)).toBe(h)
    }
  })

  it('returns [] for a half-suit id that does not exist', () => {
    expect(halfSuitCards('LOW-X' as never)).toEqual([])
  })

  it('lists EIGHTS last, so the guide can introduce it as the ninth', () => {
    expect(ALL_HALF_SUITS[8]).toBe('EIGHTS')
  })
})

describe('seating', () => {
  it('alternates teams around the table', () => {
    expect([0, 1, 2, 3, 4, 5].map((s) => seatTeam(s as never))).toEqual([0, 1, 0, 1, 0, 1])
    expect(teamSeats(0)).toEqual([0, 2, 4])
    expect(teamSeats(1)).toEqual([1, 3, 5])
  })
})

describe('dealing', () => {
  it('deals 9 cards to each of 6 seats, using every card exactly once', () => {
    const hands = dealHands('deck-test')
    expect(hands).toHaveLength(6)
    const all = hands.flat()
    expect(all).toHaveLength(54)
    expect(new Set(all).size).toBe(54)
    for (const h of hands) expect(h).toHaveLength(9)
  })

  it('is deterministic for a given seed and differs between seeds', () => {
    expect(dealHands('a')).toEqual(dealHands('a'))
    expect(dealHands('a')).not.toEqual(dealHands('b'))
  })

  it('returns every hand canonically sorted', () => {
    for (const h of dealHands('sorted')) expect(h).toEqual(sortHand(h))
  })

  it('groups a sorted hand by half-suit, never interleaving two of them', () => {
    for (const hand of dealHands('grouping')) {
      const runs = hand.map(cardHalfSuit).filter((h, i, a) => i === 0 || a[i - 1] !== h)
      expect(new Set(runs).size, `hand ${hand.join(' ')} interleaves half-suits`).toBe(runs.length)
    }
  })
})

describe('validateDeal', () => {
  const good = () => dealHands('valid').map((h) => [...h])

  it('accepts a well-formed deal', () => {
    const r = validateDeal(good())
    expect(r.ok).toBe(true)
  })

  it('rejects the wrong number of seats', () => {
    const r = validateDeal(good().slice(0, 5))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.problems.some((p) => p.kind === 'seat_count')).toBe(true)
  })

  it('rejects a duplicated card and reports the missing one', () => {
    const hands = good()
    hands[1][0] = hands[0][0]
    const r = validateDeal(hands)
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.problems.some((p) => p.kind === 'duplicate')).toBe(true)
      expect(r.problems.some((p) => p.kind === 'missing')).toBe(true)
    }
  })

  it('rejects a card that does not exist', () => {
    const hands = good()
    hands[0][0] = '1Z'
    const r = validateDeal(hands)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.problems.some((p) => p.kind === 'unknown_card')).toBe(true)
  })

  it('rejects a hand of the wrong size', () => {
    const hands = good()
    const moved = hands[0].pop()
    hands[1].push(moved as string)
    const r = validateDeal(hands)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.problems.filter((p) => p.kind === 'hand_size')).toHaveLength(2)
  })
})
