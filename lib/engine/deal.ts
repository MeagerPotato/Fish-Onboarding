/**
 * Deterministic PRNG, seeded shuffle, and the two ways to start a game's hands.
 *
 * The tutorial does NOT use the seeded deal: it uses `validateDeal` on a hand-authored
 * deal, because a teaching game has to put specific cards in specific places. The seeded
 * path exists for the fuzz tests, which need thousands of arbitrary but reproducible games.
 */
import type { Card } from './types.ts'
import { ALL_CARDS, sortHand } from './cards.ts'

/* ----------------------------------------------------------------- rng --- */

/** xmur3 string hash — a well-mixed 32-bit seed generator from a string. */
export function hashSeed(str: string): () => number {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    h ^= h >>> 16
    return h >>> 0
  }
}

/** mulberry32 — fast 32-bit PRNG returning floats in [0, 1). */
export function mulberry32(a: number): () => number {
  let s = a >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** PRNG in [0, 1) seeded from an arbitrary string. Same seed, same stream, every platform. */
export function rngFromSeed(seed: string): () => number {
  return mulberry32(hashSeed(seed)())
}

/** Uniform integer in [0, n). */
export function randInt(rng: () => number, n: number): number {
  return Math.floor(rng() * n)
}

/* ---------------------------------------------------------------- deal --- */

/** Fisher-Yates shuffle. Returns a new array; the input is untouched. */
export function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(rng, i + 1)
    const tmp = a[i]
    a[i] = a[j]
    a[j] = tmp
  }
  return a
}

/**
 * Deal all 54 cards round-robin into 6 hands of 9, each canonically sorted.
 * Deterministic: the same seed produces byte-identical hands.
 */
export function dealHands(seed: string): Card[][] {
  const deck = shuffle(ALL_CARDS, rngFromSeed(seed))
  const hands: Card[][] = [[], [], [], [], [], []]
  deck.forEach((c, i) => hands[i % 6].push(c))
  return hands.map(sortHand)
}

export type DealProblem =
  | { kind: 'seat_count'; seats: number }
  | { kind: 'hand_size'; seat: number; size: number }
  | { kind: 'duplicate'; card: Card }
  | { kind: 'unknown_card'; card: string }
  | { kind: 'missing'; cards: Card[] }

/**
 * Validate a hand-authored deal: exactly 6 hands of 9, covering all 54 cards once each.
 * Returns the sorted hands, or the specific problems found — never throws, so the
 * tutorial's deal can be checked in a unit test with a readable failure.
 */
export function validateDeal(
  hands: readonly (readonly string[])[],
): { ok: true; hands: Card[][] } | { ok: false; problems: DealProblem[] } {
  const problems: DealProblem[] = []
  if (hands.length !== 6) problems.push({ kind: 'seat_count', seats: hands.length })

  const seen = new Set<string>()
  const known = new Set<string>(ALL_CARDS)
  hands.forEach((h, seat) => {
    if (h.length !== 9) problems.push({ kind: 'hand_size', seat, size: h.length })
    for (const c of h) {
      if (!known.has(c)) problems.push({ kind: 'unknown_card', card: c })
      else if (seen.has(c)) problems.push({ kind: 'duplicate', card: c as Card })
      else seen.add(c)
    }
  })

  const missing = ALL_CARDS.filter((c) => !seen.has(c))
  if (missing.length > 0) problems.push({ kind: 'missing', cards: missing })

  if (problems.length > 0) return { ok: false, problems }
  return { ok: true, hands: hands.map((h) => sortHand(h as readonly Card[])) }
}

/** Human-readable one-liner for a deal problem, used in test failures and the trace script. */
export function describeDealProblem(p: DealProblem): string {
  switch (p.kind) {
    case 'seat_count':
      return `expected 6 hands, got ${p.seats}`
    case 'hand_size':
      return `seat ${p.seat} has ${p.size} cards, expected 9`
    case 'duplicate':
      return `${p.card} is dealt more than once`
    case 'unknown_card':
      return `"${p.card}" is not one of the 54 cards`
    case 'missing':
      return `${p.cards.length} card(s) never dealt: ${p.cards.join(', ')}`
  }
}
