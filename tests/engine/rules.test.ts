/**
 * The rules, checked against RULES.md §3 (ask legality), §4 (claim resolution),
 * §5 (out of cards / endgame) and §7 (the seven worked examples).
 */
import { describe, expect, it } from 'vitest'
import {
  ALL_HALF_SUITS,
  checkInvariants,
  explainAsk,
  halfSuitCards,
  legalActionKinds,
  legalAsks,
  newGameFromDeal,
  reduce,
  sortHand,
  unresolvedHalfSuits,
} from '../../lib/engine/index.ts'
import type { Card, GameAction, GameState, HalfSuitId, Seat } from '../../lib/engine/index.ts'

/* --------------------------------------------------------------- fixtures --- */

type Placement = Partial<Record<HalfSuitId, Seat[]>>

/**
 * Build a legal 54-card deal from partial constraints: name the seats for the half-suits
 * a test cares about, and every remaining card is dealt to whichever seat is emptiest.
 * Greedy balancing over 54 cards and 6 seats lands on exactly 9 each, so the test only
 * has to state the part that matters.
 */
function dealWith(fixed: Placement): string[][] {
  const hands: string[][] = [[], [], [], [], [], []]
  for (const h of ALL_HALF_SUITS) {
    const seats = fixed[h]
    if (!seats) continue
    halfSuitCards(h).forEach((c, i) => hands[seats[i]].push(c))
  }
  for (const h of ALL_HALF_SUITS) {
    if (fixed[h]) continue
    for (const c of halfSuitCards(h)) {
      let best = 0
      for (let s = 1; s < 6; s++) if (hands[s].length < hands[best].length) best = s
      hands[best].push(c)
    }
  }
  return hands
}

function game(fixed: Placement = {}, startingSeat: Seat = 0): GameState {
  return newGameFromDeal(dealWith(fixed), startingSeat)
}

function must(r: ReturnType<typeof reduce>): GameState {
  if (!r.ok) throw new Error(`expected success, got ${r.error.code}: ${r.error.message}`)
  expect(checkInvariants(r.state)).toEqual([])
  return r.state
}

function code(s: GameState, a: GameAction): string {
  const r = reduce(s, a)
  return r.ok ? 'OK' : r.error.code
}

/** Claim assignments taken from where the cards actually are (a guaranteed-correct claim). */
function trueAssignments(s: GameState, h: HalfSuitId): Record<Card, Seat> {
  const out = {} as Record<Card, Seat>
  for (const c of halfSuitCards(h)) out[c] = s.hands.findIndex((hd) => hd.includes(c)) as Seat
  return out
}

/** All six cards assigned to one seat — used when the claim is meant to be wrong. */
function allTo(h: HalfSuitId, seat: Seat): Record<Card, Seat> {
  const out = {} as Record<Card, Seat>
  for (const c of halfSuitCards(h)) out[c] = seat
  return out
}

const names = (s: Seat) => `P${s}`

/* -------------------------------------------------------------------- ask --- */

describe('ask legality (RULES.md §3)', () => {
  // Seat 0 holds 2C/3C/4C of LOW-C; seat 1 holds 5C/6C/7C; seat 2 holds all of LOW-H.
  const s = game({ 'LOW-C': [0, 0, 0, 1, 1, 1], 'LOW-H': [2, 2, 2, 2, 2, 2] })

  it('allows a legal ask into a half-suit you hold', () => {
    expect(code(s, { type: 'ask', seat: 0, target: 1, card: '5C' })).toBe('OK')
  })

  it('rejects asking a teammate', () => {
    expect(code(s, { type: 'ask', seat: 0, target: 2, card: '5C' })).toBe('TARGET_TEAMMATE')
  })

  it('rejects asking yourself', () => {
    expect(code(s, { type: 'ask', seat: 0, target: 0, card: '5C' })).toBe('TARGET_SELF')
  })

  it('rejects a half-suit you hold no card of', () => {
    expect(code(s, { type: 'ask', seat: 0, target: 1, card: '2H' })).toBe('NO_CARD_OF_HALF_SUIT')
  })

  it('rejects asking for a card already in your hand', () => {
    expect(code(s, { type: 'ask', seat: 0, target: 1, card: '2C' })).toBe('ASKING_OWN_CARD')
  })

  it('rejects a card that is not one of the 54', () => {
    expect(code(s, { type: 'ask', seat: 0, target: 1, card: '1C' as Card })).toBe('INVALID_CARD')
  })

  it('rejects acting out of turn', () => {
    expect(code(s, { type: 'ask', seat: 1, target: 0, card: '2C' })).toBe('NOT_YOUR_TURN')
  })

  it('checks the gates in the order RULES.md §3 lists them', () => {
    // Asking a teammate for a card of a half-suit you do not hold trips the teammate gate first.
    expect(code(s, { type: 'ask', seat: 0, target: 2, card: '2H' })).toBe('TARGET_TEAMMATE')
  })
})

describe('the jokers are ordinary cards (RULES.md §7.6)', () => {
  // 8C/8D/8H at seat 0, 8S/RJ/BJ at seat 1.
  const s = game({ EIGHTS: [0, 0, 0, 1, 1, 1] })

  it('lets an eight license asking for a joker', () => {
    expect(code(s, { type: 'ask', seat: 0, target: 1, card: 'RJ' })).toBe('OK')
  })

  it('lets a joker license asking for an eight', () => {
    const after = must(reduce(s, { type: 'ask', seat: 0, target: 1, card: 'BJ' }))
    const stripped = { ...after, hands: after.hands.map((h, i) => (i === 0 ? ['BJ' as Card] : h)) }
    // A hand of nothing but the black joker still licenses asking for any eight.
    const withRest = {
      ...stripped,
      hands: stripped.hands.map((h, i) => (i === 2 ? sortHand([...h, ...after.hands[0].filter((c) => c !== 'BJ')]) : h)),
    }
    expect(code(withRest, { type: 'ask', seat: 0, target: 1, card: '8S' })).toBe('OK')
  })

  it('treats the two jokers as distinct askable cards', () => {
    const after = must(reduce(s, { type: 'ask', seat: 0, target: 1, card: 'RJ' }))
    expect(after.hands[0]).toContain('RJ')
    expect(after.hands[0]).not.toContain('BJ')
    expect(code(after, { type: 'ask', seat: 0, target: 1, card: 'RJ' })).toBe('ASKING_OWN_CARD')
    expect(code(after, { type: 'ask', seat: 0, target: 1, card: 'BJ' })).toBe('OK')
  })
})

describe('hit and miss (RULES.md rows 9-10)', () => {
  const spec: Placement = { 'LOW-C': [0, 0, 0, 1, 1, 3] }

  it('a hit moves the card and keeps the turn', () => {
    const s = game(spec)
    const after = must(reduce(s, { type: 'ask', seat: 0, target: 1, card: '5C' }))
    expect(after.turn).toBe(0)
    expect(after.hands[0]).toContain('5C')
    expect(after.hands[1]).not.toContain('5C')
    expect(after.hands[0]).toHaveLength(10)
    expect(after.hands[1]).toHaveLength(8)
    expect(after.log.at(-1)).toMatchObject({ type: 'ask', hit: true })
  })

  it('a miss moves no card and passes the turn to the target', () => {
    const s = game(spec)
    // 7C is at seat 3, not seat 1.
    const after = must(reduce(s, { type: 'ask', seat: 0, target: 1, card: '7C' }))
    expect(after.turn).toBe(1)
    expect(after.hands[0]).toHaveLength(9)
    expect(after.hands[1]).toHaveLength(9)
    expect(after.log.at(-1)).toMatchObject({ type: 'ask', hit: false })
  })

  it('enumerates only legal asks, and every one reduces cleanly', () => {
    const s = game(spec)
    const asks = legalAsks(s, 0)
    expect(asks.length).toBeGreaterThan(0)
    for (const a of asks) expect(code(s, { type: 'ask', seat: 0, ...a })).toBe('OK')
    for (const seat of [1, 2, 3, 4, 5] as Seat[]) expect(legalAsks(s, seat)).toEqual([])
  })

  it('explainAsk agrees with reduce on every candidate ask', () => {
    const s = game(spec)
    const probe = ALL_HALF_SUITS.flatMap((h) => halfSuitCards(h))
    for (const target of [0, 1, 2, 3, 4, 5] as Seat[]) {
      for (const card of probe) {
        const verdict = explainAsk(s, 0, target, card, names)
        const actual = code(s, { type: 'ask', seat: 0, target, card })
        if (verdict.legal) expect(actual, `${card} to ${target}`).toBe('OK')
        else expect(actual, `${card} to ${target}`).toBe(verdict.code)
      }
    }
  })
})

/* ------------------------------------------------------------------ claim --- */

describe('claim resolution (RULES.md §4, §7.1-7.3)', () => {
  // Team A (0,2,4) holds all of LOW-S: 2S@0 3S@0 4S@2 5S@2 6S@4 7S@4.
  const teamAHoldsLowS: Placement = { 'LOW-S': [0, 0, 2, 2, 4, 4] }
  const correct = { '2S': 0, '3S': 0, '4S': 2, '5S': 2, '6S': 4, '7S': 4 } as Record<Card, Seat>

  it('7.1 — all six locations right scores for the claimant, and the turn continues', () => {
    const s = game(teamAHoldsLowS)
    const after = must(reduce(s, { type: 'claim', seat: 0, halfSuit: 'LOW-S', assignments: correct }))
    expect(after.halfSuits['LOW-S']?.outcome).toBe('team0')
    expect(after.score).toEqual([1, 0])
    expect(after.turn).toBe(0)
    for (const h of after.hands) for (const c of halfSuitCards('LOW-S')) expect(h).not.toContain(c)
  })

  it('7.2 — one card with an opponent hands the half-suit to the opposing team', () => {
    // Identical claim, but 7S actually sits with seat 1.
    const s = game({ 'LOW-S': [0, 0, 2, 2, 4, 1] })
    const after = must(reduce(s, { type: 'claim', seat: 0, halfSuit: 'LOW-S', assignments: correct }))
    expect(after.halfSuits['LOW-S']?.outcome).toBe('team1')
    expect(after.score).toEqual([0, 1])
    expect(after.turn).toBe(0)
  })

  it('7.3 — the right cards in the wrong hands awards it to the opponents', () => {
    // Team A genuinely holds all six, but 4S and 6S are placed with the wrong teammates.
    // There is no void outcome: a wrong declaration, for any reason, hands it over.
    const s = game(teamAHoldsLowS)
    const swapped = { ...correct, '4S': 4, '6S': 2 } as Record<Card, Seat>
    const after = must(reduce(s, { type: 'claim', seat: 0, halfSuit: 'LOW-S', assignments: swapped }))
    expect(after.halfSuits['LOW-S']?.outcome).toBe('team1')
    expect(after.score).toEqual([0, 1])
    expect(after.turn).toBe(0)
  })

  it('a single misplaced card is enough to lose the half-suit', () => {
    const s = game(teamAHoldsLowS)
    // Five of six correct; only 6S is wrong.
    const oneWrong = { ...correct, '6S': 2 } as Record<Card, Seat>
    const after = must(reduce(s, { type: 'claim', seat: 0, halfSuit: 'LOW-S', assignments: oneWrong }))
    expect(after.halfSuits['LOW-S']?.outcome).toBe('team1')
    expect(after.score).toEqual([0, 1])
  })

  it('always reveals the true holders, whatever the outcome', () => {
    const s = game(teamAHoldsLowS)
    const swapped = { ...correct, '4S': 4, '6S': 2 } as Record<Card, Seat>
    const after = must(reduce(s, { type: 'claim', seat: 0, halfSuit: 'LOW-S', assignments: swapped }))
    expect(after.halfSuits['LOW-S']?.actualHolders).toEqual(correct)
  })

  it('rejects assigning a card to an opponent', () => {
    const s = game(teamAHoldsLowS)
    const toOpponent = { ...correct, '7S': 1 } as Record<Card, Seat>
    expect(code(s, { type: 'claim', seat: 0, halfSuit: 'LOW-S', assignments: toOpponent })).toBe('ASSIGN_OPPONENT')
  })

  it('rejects assignments that do not cover exactly the six cards', () => {
    const s = game(teamAHoldsLowS)
    const short = { '2S': 0, '3S': 0, '4S': 2, '5S': 2, '6S': 4 } as Record<Card, Seat>
    expect(code(s, { type: 'claim', seat: 0, halfSuit: 'LOW-S', assignments: short })).toBe('BAD_ASSIGNMENTS')
  })

  it('rejects re-claiming a resolved half-suit', () => {
    const s = game(teamAHoldsLowS)
    const after = must(reduce(s, { type: 'claim', seat: 0, halfSuit: 'LOW-S', assignments: correct }))
    expect(code(after, { type: 'claim', seat: 0, halfSuit: 'LOW-S', assignments: correct })).toBe(
      'HALF_SUIT_RESOLVED',
    )
  })

  it('allows claiming a half-suit you hold none of (row 16)', () => {
    // All six with teammates 2 and 4; seat 0 holds none of LOW-S.
    const s = game({ 'LOW-S': [2, 2, 2, 4, 4, 4] })
    expect(s.hands[0].some((c) => halfSuitCards('LOW-S').includes(c))).toBe(false)
    const after = must(
      reduce(s, { type: 'claim', seat: 0, halfSuit: 'LOW-S', assignments: trueAssignments(s, 'LOW-S') }),
    )
    expect(after.halfSuits['LOW-S']?.outcome).toBe('team0')
  })
})

/* ---------------------------------------------------------------- endgame --- */

describe('running out of cards (RULES.md §5, §7.4-7.5)', () => {
  it('7.4 — a claim that empties you forces a pass to a teammate with cards', () => {
    // Seat 0's nine cards are exactly LOW-S (4 of them) and HIGH-S (5 of them),
    // both wholly inside Team A, so two correct claims empty seat 0 completely.
    let s = game({ 'LOW-S': [0, 0, 0, 0, 2, 4], 'HIGH-S': [0, 0, 0, 0, 0, 2] })
    expect(s.hands[0]).toHaveLength(9)

    s = must(reduce(s, { type: 'claim', seat: 0, halfSuit: 'LOW-S', assignments: trueAssignments(s, 'LOW-S') }))
    expect(s.hands[0]).toHaveLength(5)
    expect(s.phase).toBe('playing')

    s = must(reduce(s, { type: 'claim', seat: 0, halfSuit: 'HIGH-S', assignments: trueAssignments(s, 'HIGH-S') }))
    expect(s.hands[0]).toHaveLength(0)
    expect(s.phase).toBe('awaitPass')
    expect(legalActionKinds(s)).toEqual(['pass'])
    expect(s.score).toEqual([2, 0])

    expect(code(s, { type: 'pass', seat: 0, to: 1 })).toBe('PASS_TARGET_NOT_TEAMMATE')
    expect(code(s, { type: 'ask', seat: 0, target: 1, card: '2C' })).toBe('WRONG_PHASE')

    const after = must(reduce(s, { type: 'pass', seat: 0, to: 2 }))
    expect(after.turn).toBe(2)
    expect(after.phase).toBe('playing')
  })

  it('a player emptied by an opponent taking their last card just drops out', () => {
    const base = game({ 'LOW-C': [0, 0, 0, 1, 1, 1] })
    // Move all of seat 1's cards except 5C to its teammate at seat 3.
    const spare = base.hands[1].filter((c) => c !== '5C')
    const s: GameState = {
      ...base,
      hands: base.hands.map((h, i) =>
        i === 1 ? (['5C'] as Card[]) : i === 3 ? sortHand([...h, ...spare]) : h,
      ),
    }
    expect(checkInvariants(s)).toEqual([])

    const r = reduce(s, { type: 'ask', seat: 0, target: 1, card: '5C' })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.state.hands[1]).toHaveLength(0)
    expect(r.events.some((e) => e.type === 'player_out' && e.seat === 1)).toBe(true)
    expect(r.state.turn).toBe(0)
    expect(r.state.phase).toBe('playing')
    // Seat 1 can no longer be asked.
    expect(code(r.state, { type: 'ask', seat: 0, target: 1, card: '6C' })).toBe('TARGET_OUT')
  })

  it('7.5 — emptying your own whole team forces designating an opponent', () => {
    // Team A's 27 cards are exactly LOW-C, LOW-D, LOW-H, LOW-S and 3 of HIGH-C.
    let s = game({
      'LOW-C': [0, 0, 0, 2, 2, 2],
      'LOW-D': [4, 4, 4, 0, 0, 0],
      'LOW-H': [2, 2, 2, 4, 4, 4],
      'LOW-S': [0, 0, 0, 2, 2, 2],
      'HIGH-C': [4, 4, 4, 1, 1, 1],
    })
    for (const h of ['LOW-C', 'LOW-D', 'LOW-H', 'LOW-S'] as HalfSuitId[]) {
      s = must(reduce(s, { type: 'claim', seat: 0, halfSuit: h, assignments: trueAssignments(s, h) }))
    }
    expect(s.hands[0]).toHaveLength(0)
    expect(s.hands[2]).toHaveLength(0)
    expect(s.hands[4]).toHaveLength(3)

    // The last Team A cards are the three HIGH-C at seat 4; claiming HIGH-C gives it to
    // Team B (they hold the other three) and empties Team A entirely.
    s = must(reduce(s, { type: 'pass', seat: 0, to: 4 }))
    s = must(reduce(s, { type: 'claim', seat: 4, halfSuit: 'HIGH-C', assignments: allTo('HIGH-C', 4) }))
    expect(s.halfSuits['HIGH-C']?.outcome).toBe('team1')
    expect(s.phase).toBe('awaitDesignate')
    expect(legalActionKinds(s)).toEqual(['designate'])

    expect(code(s, { type: 'designate', seat: 4, to: 0 })).toBe('DESIGNATE_TARGET_INVALID')
    const after = must(reduce(s, { type: 'designate', seat: 4, to: 3 }))
    expect(after.turn).toBe(3)
    expect(after.phase).toBe('endgame')
    expect(legalActionKinds(after)).toEqual(['claim'])
    expect(code(after, { type: 'ask', seat: 3, target: 0, card: '9D' })).toBe('WRONG_PHASE')
  })
})

/* ------------------------------------------------------------------ score --- */

describe('scoring and the tiebreaking ninth half-suit (RULES.md §6, §7.7)', () => {
  /**
   * Eight half-suits owned outright — four by each team — and LOW-C split 3/3 between
   * seat 0 and seat 1. Because a claim never loses the turn (row 17), seat 0 can resolve
   * all eight alone: the four Team B owns score for Team B under the opponent-holds rule.
   */
  const splitDeal: Placement = {
    'LOW-C': [0, 0, 0, 1, 1, 1],
    'LOW-D': [0, 0, 0, 0, 0, 0],
    'LOW-H': [2, 2, 2, 2, 2, 2],
    'LOW-S': [2, 2, 2, 4, 4, 4],
    'HIGH-C': [4, 4, 4, 4, 4, 4],
    'HIGH-D': [1, 1, 1, 1, 1, 1],
    'HIGH-H': [3, 3, 3, 3, 3, 3],
    'HIGH-S': [3, 3, 3, 5, 5, 5],
    EIGHTS: [5, 5, 5, 5, 5, 5],
  }

  /** Resolve the eight owned half-suits from seat 0, arriving at 4-4 with LOW-C left. */
  function toFourAll(): GameState {
    let s = game(splitDeal)
    // Team B's four first: seat 0 claims them, an opponent holds every card, Team B scores.
    for (const h of ['HIGH-D', 'HIGH-H', 'HIGH-S', 'EIGHTS'] as HalfSuitId[]) {
      s = must(reduce(s, { type: 'claim', seat: 0, halfSuit: h, assignments: allTo(h, 0) }))
    }
    expect(s.score).toEqual([0, 4])
    // Then Team A's four, correctly placed. LOW-D is seat 0's own and goes last.
    for (const h of ['LOW-H', 'LOW-S', 'HIGH-C', 'LOW-D'] as HalfSuitId[]) {
      s = must(reduce(s, { type: 'claim', seat: 0, halfSuit: h, assignments: trueAssignments(s, h) }))
    }
    return s
  }

  it('reaches 4-4 with one half-suit unresolved and the game not over', () => {
    const s = toFourAll()
    expect(s.score).toEqual([4, 4])
    expect(unresolvedHalfSuits(s)).toEqual(['LOW-C'])
    expect(s.phase).toBe('playing')
    expect(s.turn).toBe(0)
    expect(s.hands[0]).toEqual(['2C', '3C', '4C'])
    expect(s.hands[1]).toEqual(['5C', '6C', '7C'])
  })

  it('7.7 — collecting the last half-suit wins it 5-4, with no tie available', () => {
    let s = toFourAll()
    // Three hits take the rest of LOW-C; each keeps the turn.
    for (const card of ['5C', '6C', '7C'] as Card[]) {
      s = must(reduce(s, { type: 'ask', seat: 0, target: 1, card }))
      expect(s.turn).toBe(0)
    }
    expect(s.hands[1]).toHaveLength(0)
    expect(s.phase).toBe('endgame')

    const final = must(
      reduce(s, { type: 'claim', seat: 0, halfSuit: 'LOW-C', assignments: trueAssignments(s, 'LOW-C') }),
    )
    expect(final.phase).toBe('finished')
    expect(final.score).toEqual([5, 4])
    expect(final.log.at(-1)).toMatchObject({ type: 'game_over', winner: 0, score: [5, 4] })
  })

  it('losing the last half-suit ends it 4-5 — still decisive, still no tie', () => {
    const s = toFourAll()
    // Claiming LOW-C while seat 1 holds three of them hands it straight to Team B.
    const final = must(reduce(s, { type: 'claim', seat: 0, halfSuit: 'LOW-C', assignments: allTo('LOW-C', 0) }))
    expect(final.phase).toBe('finished')
    expect(final.score).toEqual([4, 5])
    expect(final.log.at(-1)).toMatchObject({ type: 'game_over', winner: 1 })
  })

  it('every resolved half-suit is awarded to someone, so a draw cannot happen', () => {
    // Misplacing among your own team used to void. It now hands the half-suit over, which
    // means the awarded total always equals the resolved total and 4-4-with-a-gap is gone.
    const v = game({ 'LOW-C': [0, 0, 0, 2, 2, 4] })
    const wrong = { ...trueAssignments(v, 'LOW-C'), '2C': 2, '5C': 0 } as Record<Card, Seat>
    const after = must(reduce(v, { type: 'claim', seat: 0, halfSuit: 'LOW-C', assignments: wrong }))
    expect(after.halfSuits['LOW-C']?.outcome).toBe('team1')
    expect(after.score[0] + after.score[1]).toBe(1)
    expect(ALL_HALF_SUITS.filter((h) => after.halfSuits[h])).toHaveLength(1)
  })

  it('stops the instant a team reaches five, leaving the rest unplayed', () => {
    // A team holds 27 cards, so it can never hold five whole half-suits at once. Team B
    // instead owns four outright and shares a fifth, and seat 0 hands all five over by
    // claiming them badly. A claim never ends the turn, so seat 0 can do it in one go.
    let s = game({
      'LOW-C': [0, 0, 0, 1, 3, 5],
      'LOW-D': [1, 1, 3, 3, 5, 5],
      'LOW-H': [1, 1, 3, 3, 5, 5],
      'HIGH-D': [1, 1, 3, 3, 5, 5],
      'HIGH-S': [1, 1, 3, 3, 5, 5],
    })

    for (const h of ['LOW-D', 'LOW-H', 'HIGH-D', 'HIGH-S'] as HalfSuitId[]) {
      s = must(reduce(s, { type: 'claim', seat: 0, halfSuit: h, assignments: allTo(h, 0) }))
      expect(s.turn, 'a claim must never end the turn').toBe(0)
      expect(s.phase).toBe('playing')
    }
    expect(s.score).toEqual([0, 4])

    // Seat 0 holds three low clubs; the other three are spread across Team B, so this is
    // awarded to them and takes them to five.
    const final = must(reduce(s, { type: 'claim', seat: 0, halfSuit: 'LOW-C', assignments: allTo('LOW-C', 0) }))
    expect(final.score).toEqual([0, 5])
    expect(final.phase).toBe('finished')
    expect(final.log.at(-1)).toMatchObject({ type: 'game_over', winner: 1, score: [0, 5] })

    // Four half-suits were never played, and nothing further is legal.
    expect(unresolvedHalfSuits(final)).toHaveLength(4)
    expect(code(final, { type: 'claim', seat: 0, halfSuit: 'LOW-S', assignments: allTo('LOW-S', 0) })).toBe(
      'WRONG_PHASE',
    )
    expect(code(final, { type: 'ask', seat: 0, target: 1, card: '5C' })).toBe('WRONG_PHASE')
  })

  it('needs all nine resolved before it can finish', () => {
    const s = game()
    expect(unresolvedHalfSuits(s)).toHaveLength(9)
    expect(s.phase).toBe('playing')
    expect(ALL_HALF_SUITS).toHaveLength(9)
  })
})
