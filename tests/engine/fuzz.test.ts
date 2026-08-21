/**
 * Fuzz: play hundreds of seeded games to completion with a random-legal policy and assert
 * the invariants after every single reduce. A tutorial that replays real engine actions is
 * only trustworthy if the engine cannot be driven into a nonsense state.
 */
import { describe, expect, it } from 'vitest'
import {
  ALL_HALF_SUITS,
  checkInvariants,
  halfSuitCards,
  legalActionKinds,
  legalAsks,
  newGame,
  randInt,
  reduce,
  rngFromSeed,
  seatTeam,
  teamSeats,
  unresolvedHalfSuits,
} from '../../lib/engine/index.ts'
import type { Card, GameAction, GameState, Seat } from '../../lib/engine/index.ts'

/** Pick one legal action for the seat on turn, with a bias toward asking so games develop. */
function policy(s: GameState, rng: () => number): GameAction | null {
  const seat = s.turn
  const kinds = legalActionKinds(s)
  if (kinds.length === 0) return null

  if (kinds.includes('pass')) {
    const options = teamSeats(seatTeam(seat)).filter((t) => t !== seat && s.hands[t].length > 0)
    return options.length ? { type: 'pass', seat, to: options[randInt(rng, options.length)] } : null
  }
  if (kinds.includes('designate')) {
    const options = ([0, 1, 2, 3, 4, 5] as Seat[]).filter(
      (t) => seatTeam(t) !== seatTeam(seat) && s.hands[t].length > 0,
    )
    return options.length ? { type: 'designate', seat, to: options[randInt(rng, options.length)] } : null
  }

  const open = unresolvedHalfSuits(s)
  const asks = legalAsks(s, seat)
  const mustClaim = !kinds.includes('ask') || asks.length === 0
  // Claim ~12% of the time in normal play, always when asking is impossible.
  if (open.length > 0 && (mustClaim || rng() < 0.12)) {
    const halfSuit = open[randInt(rng, open.length)]
    const mates = teamSeats(seatTeam(seat))
    const assignments = {} as Record<Card, Seat>
    for (const c of halfSuitCards(halfSuit)) {
      // Half the time guess truthfully when possible; otherwise pick any teammate.
      const real = s.hands.findIndex((h) => h.includes(c)) as Seat
      const truthful = rng() < 0.5 && mates.includes(real)
      assignments[c] = truthful ? real : mates[randInt(rng, mates.length)]
    }
    return { type: 'claim', seat, halfSuit, assignments }
  }
  if (asks.length === 0) return null
  const a = asks[randInt(rng, asks.length)]
  return { type: 'ask', seat, target: a.target, card: a.card }
}

function playOut(seed: string): { state: GameState; steps: number } {
  const rng = rngFromSeed(`policy-${seed}`)
  let s = newGame(seed, randInt(rng, 6) as Seat)
  expect(checkInvariants(s)).toEqual([])

  let steps = 0
  const LIMIT = 4000
  while (s.phase !== 'finished' && steps < LIMIT) {
    const action = policy(s, rng)
    if (action === null) break
    const r = reduce(s, action)
    if (!r.ok) throw new Error(`seed ${seed} step ${steps}: policy produced illegal ${action.type} (${r.error.code})`)
    s = r.state
    const problems = checkInvariants(s)
    if (problems.length) throw new Error(`seed ${seed} step ${steps}: ${problems.join('; ')}`)
    steps++
  }
  return { state: s, steps }
}

describe('fuzz', () => {
  const SEEDS = Array.from({ length: 300 }, (_, i) => `fuzz-${i}`)

  it('every game reaches a finished state with all nine half-suits resolved', () => {
    for (const seed of SEEDS) {
      const { state, steps } = playOut(seed)
      expect(state.phase, `seed ${seed} stalled after ${steps} steps`).toBe('finished')
      expect(Object.keys(state.halfSuits), `seed ${seed}`).toHaveLength(9)
    }
  })

  it('the score never exceeds nine and always matches the outcomes', () => {
    for (const seed of SEEDS.slice(0, 100)) {
      const { state } = playOut(seed)
      const [a, b] = state.score
      const voids = ALL_HALF_SUITS.filter((h) => state.halfSuits[h]?.outcome === 'void').length
      expect(a + b + voids).toBe(9)
      expect(a + b).toBeLessThanOrEqual(9)
    }
  })

  it('a game with no voids can never end in a tie — the point of the ninth half-suit', () => {
    let cleanGames = 0
    for (const seed of SEEDS) {
      const { state } = playOut(seed)
      const voids = ALL_HALF_SUITS.filter((h) => state.halfSuits[h]?.outcome === 'void').length
      if (voids > 0) continue
      cleanGames++
      const last = state.log.at(-1)
      expect(last).toMatchObject({ type: 'game_over' })
      if (last?.type === 'game_over') {
        expect(last.winner, `seed ${seed} tied with no voids`).not.toBe('tie')
        expect(Math.abs(state.score[0] - state.score[1]) % 2, `seed ${seed}`).toBe(1)
      }
    }
    // The policy voids plenty of half-suits, but some games must come through clean.
    expect(cleanGames).toBeGreaterThan(0)
  })

  it('never reveals a hand through the public log', () => {
    const { state } = playOut('privacy')
    const json = JSON.stringify(state.log)
    // The log may name cards only in asks and in claim reveals — never a bare hand array.
    expect(json).not.toContain('"hands"')
    expect(json).not.toContain('"hand"')
  })
})
