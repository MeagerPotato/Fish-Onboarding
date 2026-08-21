/**
 * newGame + reduce — the pure heart of the engine.
 *
 * Implements RULES.md exactly: §3 ask legality (in the listed error order), §4 claim
 * resolution, §5 out-of-cards and endgame cascade. Never throws, never mutates its input.
 *
 * Everything the tutorial asserts about the game is produced by running real actions
 * through this reducer, so no annotation in the guide can drift away from the rules.
 */
import type {
  Card,
  EngineError,
  ErrorCode,
  GameAction,
  GameState,
  HalfSuitId,
  HalfSuitResult,
  Outcome,
  PublicEvent,
  ReduceResult,
  Seat,
  Team,
} from './types.ts'
import {
  ALL_HALF_SUITS,
  HALF_SUITS_TO_WIN,
  cardHalfSuit,
  halfSuitCards,
  isCard,
  isHalfSuitId,
  otherTeam,
  seatTeam,
  sortHand,
  teamCardCount,
} from './cards.ts'
import { dealHands, validateDeal } from './deal.ts'

const TOTAL_HALF_SUITS = ALL_HALF_SUITS.length // 9

function freshState(hands: Card[][], startingSeat: Seat): GameState {
  return {
    phase: 'playing',
    turn: startingSeat,
    hands,
    halfSuits: {},
    score: [0, 0],
    log: [{ type: 'game_started', startingSeat }],
    moveIndex: 0,
  }
}

/** Start a new deterministic game from a seed. Same seed, identical state. */
export function newGame(seed: string, startingSeat: Seat = 0): GameState {
  return freshState(dealHands(seed), startingSeat)
}

/**
 * Start a game from a hand-authored deal — the tutorial's path.
 * Throws only if the deal is malformed, which a unit test catches at build time.
 */
export function newGameFromDeal(hands: readonly (readonly string[])[], startingSeat: Seat = 0): GameState {
  const checked = validateDeal(hands)
  if (!checked.ok) {
    throw new Error(`invalid deal: ${checked.problems.map((p) => p.kind).join(', ')}`)
  }
  return freshState(checked.hands, startingSeat)
}

function err(code: ErrorCode, message: string): { ok: false; error: EngineError } {
  return { ok: false, error: { code, message } }
}

function isSeat(x: unknown): x is Seat {
  return typeof x === 'number' && Number.isInteger(x) && x >= 0 && x <= 5
}

function accept(state: GameState, patch: Partial<GameState>, events: PublicEvent[]): ReduceResult {
  return {
    ok: true,
    state: {
      ...state,
      ...patch,
      log: [...state.log, ...events],
      moveIndex: state.moveIndex + 1,
    },
    events,
  }
}

/** Pure reducer. Validates per RULES.md and returns new state + public events, or a coded error. */
export function reduce(state: GameState, action: GameAction): ReduceResult {
  switch (action.type) {
    case 'ask':
      return reduceAsk(state, action)
    case 'claim':
      return reduceClaim(state, action)
    case 'pass':
      return reducePass(state, action)
    case 'designate':
      return reduceDesignate(state, action)
    default:
      return err('INVALID_ACTION', `unknown action type ${String((action as { type?: unknown }).type)}`)
  }
}

/* ------------------------------------------------------------------ ask --- */

function reduceAsk(state: GameState, action: { seat: Seat; target: Seat; card: Card }): ReduceResult {
  const { seat, target, card } = action
  // RULES.md §3, checks in the listed order.
  if (state.phase !== 'playing') return err('WRONG_PHASE', `cannot ask in phase ${state.phase}`)
  if (seat !== state.turn) return err('NOT_YOUR_TURN', `it is seat ${state.turn}'s turn, not seat ${seat}'s`)
  if (state.hands[seat].length === 0) return err('ASKER_OUT', `seat ${seat} has no cards`)
  if (!isSeat(target)) return err('INVALID_ACTION', `target ${String(target)} is not a seat`)
  if (target === seat) return err('TARGET_SELF', 'cannot ask yourself')
  if (seatTeam(target) === seatTeam(seat))
    return err('TARGET_TEAMMATE', `seat ${target} is a teammate of seat ${seat}`)
  if (state.hands[target].length === 0) return err('TARGET_OUT', `seat ${target} has no cards`)
  // The two half-suit-relative checks below presuppose a real card; a fake card has no half-suit.
  if (typeof card !== 'string' || !isCard(card))
    return err('INVALID_CARD', `${String(card)} is not one of the 54 cards`)

  const halfSuit = cardHalfSuit(card)
  const hand = state.hands[seat]
  if (!hand.some((c) => cardHalfSuit(c) === halfSuit))
    return err('NO_CARD_OF_HALF_SUIT', `seat ${seat} holds no card of half-suit ${halfSuit}`)
  if (hand.includes(card)) return err('ASKING_OWN_CARD', `seat ${seat} already holds ${card}`)

  const hit = state.hands[target].includes(card)
  const events: PublicEvent[] = [{ type: 'ask', asker: seat, target, card, hit }]

  if (!hit) {
    // Miss: the turn passes to the player who was asked (row 10).
    return accept(state, { turn: target }, events)
  }

  // Hit: the card moves target -> asker; the asker keeps the turn (row 9).
  const hands = state.hands.map((h, i) => {
    if (i === seat) return sortHand([...h, card])
    if (i === target) return h.filter((c) => c !== card)
    return h
  })
  let phase: GameState['phase'] = state.phase
  if (hands[target].length === 0) {
    events.push({ type: 'player_out', seat: target })
    if (teamCardCount(hands, seatTeam(target)) === 0) {
      // The hit emptied a whole team. Half-suits necessarily remain (the taken card's
      // half-suit is unresolved). The asker has cards and keeps the turn (§5).
      phase = 'endgame'
      events.push({ type: 'endgame', claimingTeam: seatTeam(seat) })
    }
  }
  return accept(state, { hands, phase }, events)
}

/* ---------------------------------------------------------------- claim --- */

function reduceClaim(
  state: GameState,
  action: { seat: Seat; halfSuit: HalfSuitId; assignments: Record<Card, Seat> },
): ReduceResult {
  const { seat, halfSuit, assignments } = action
  // RULES.md §4 legality, in the listed order.
  if (typeof halfSuit !== 'string' || !isHalfSuitId(halfSuit))
    return err('INVALID_ACTION', `${String(halfSuit)} is not a half-suit`)
  if (state.halfSuits[halfSuit]) return err('HALF_SUIT_RESOLVED', `half-suit ${halfSuit} is already resolved`)
  if (state.phase !== 'playing' && state.phase !== 'endgame')
    return err('WRONG_PHASE', `cannot claim in phase ${state.phase}`)
  if (seat !== state.turn) return err('NOT_YOUR_TURN', `it is seat ${state.turn}'s turn, not seat ${seat}'s`)

  const cards = halfSuitCards(halfSuit)
  const keys = assignments && typeof assignments === 'object' ? Object.keys(assignments) : null
  if (
    keys === null ||
    keys.length !== 6 ||
    !cards.every((c) => Object.prototype.hasOwnProperty.call(assignments, c))
  )
    return err('BAD_ASSIGNMENTS', `assignments must cover exactly the 6 cards of ${halfSuit}`)

  const claimerTeam = seatTeam(seat)
  for (const c of cards) {
    const s = assignments[c]
    if (!isSeat(s) || seatTeam(s) !== claimerTeam)
      return err('ASSIGN_OPPONENT', `card ${c} assigned to seat ${String(s)}, not on team ${claimerTeam}`)
  }

  // Resolution (§4). Actual holders recorded from the true pre-removal state.
  const actualHolders = {} as Record<Card, Seat>
  let opponentHolds = false
  let allCorrect = true
  for (const c of cards) {
    const holder = state.hands.findIndex((h) => h.includes(c)) as Seat | -1
    if (holder === -1) {
      // Unreachable for an unresolved half-suit (54-card conservation), but never throw.
      return err('INVALID_ACTION', `card ${c} of unresolved half-suit ${halfSuit} is in no hand`)
    }
    actualHolders[c] = holder
    if (seatTeam(holder) !== claimerTeam) opponentHolds = true
    if (assignments[c] !== holder) allCorrect = false
  }

  // RULES.md §4: the declaration is either exactly right, or it is wrong. Wrong for ANY
  // reason — an opponent held one of the six, or a card was placed with the wrong teammate —
  // awards the half-suit to the opposing team. There is no third outcome.
  const opposing = otherTeam(claimerTeam)
  const awarded: Team = opponentHolds || !allCorrect ? opposing : claimerTeam
  const outcome: Outcome = awarded === 0 ? 'team0' : 'team1'

  const result: HalfSuitResult = {
    halfSuit,
    outcome,
    claimer: seat,
    assignments: { ...assignments },
    actualHolders,
  }
  const halfSuits = { ...state.halfSuits, [halfSuit]: result }
  const score: [number, number] = [state.score[0], state.score[1]]
  score[awarded] += 1

  // The six cards leave every hand; note any seat emptied by the removal.
  const cardSet = new Set<Card>(cards)
  const hands = state.hands.map((h) => (h.some((c) => cardSet.has(c)) ? h.filter((c) => !cardSet.has(c)) : h))
  const events: PublicEvent[] = [
    { type: 'claim', claimer: seat, halfSuit, assignments: result.assignments, actualHolders, outcome },
  ]
  for (let s = 0; s < 6; s++) {
    if (state.hands[s].length > 0 && hands[s].length === 0) events.push({ type: 'player_out', seat: s as Seat })
  }

  // Post-claim cascade (§5 precedence).
  //
  // The game stops the instant a team reaches five (RULES.md row 22). Five of nine is an
  // unbeatable majority, so any half-suits still on the table are simply never played. The
  // all-resolved check below is a belt-and-braces guard: with no void outcome, nine resolved
  // half-suits always contain a team on five, so it should be unreachable.
  const winner: Team | null = score[0] >= HALF_SUITS_TO_WIN ? 0 : score[1] >= HALF_SUITS_TO_WIN ? 1 : null
  if (winner !== null || Object.keys(halfSuits).length === TOTAL_HALF_SUITS) {
    const decided: Team = winner ?? (score[0] >= score[1] ? 0 : 1)
    events.push({ type: 'game_over', score: [score[0], score[1]], winner: decided })
    return accept(state, { hands, halfSuits, score, phase: 'finished' }, events)
  }
  if (state.phase === 'endgame') {
    // Endgame: the claiming seat keeps the turn until the game is finished.
    return accept(state, { hands, halfSuits, score }, events)
  }

  const someTeamEmpty = teamCardCount(hands, 0) === 0 || teamCardCount(hands, 1) === 0
  if (someTeamEmpty) {
    if (hands[seat].length > 0) {
      // Emptied the opposing team and still holding cards: endgame, turn stays here.
      events.push({ type: 'endgame', claimingTeam: claimerTeam })
      return accept(state, { hands, halfSuits, score, phase: 'endgame' }, events)
    }
    if (teamCardCount(hands, claimerTeam) > 0) {
      // Emptied self and the opposing team: the pass resolves first, then endgame.
      return accept(state, { hands, halfSuits, score, phase: 'awaitPass' }, events)
    }
    // The claimant's whole team is out: designate an opponent to claim out the endgame.
    return accept(state, { hands, halfSuits, score, phase: 'awaitDesignate' }, events)
  }
  if (hands[seat].length === 0) {
    // Emptied by their own claim: must pass to a teammate with cards (row 20).
    return accept(state, { hands, halfSuits, score, phase: 'awaitPass' }, events)
  }
  // The turn continues with the claimant (row 17).
  return accept(state, { hands, halfSuits, score }, events)
}

/* ----------------------------------------------------------------- pass --- */

function reducePass(state: GameState, action: { seat: Seat; to: Seat }): ReduceResult {
  const { seat, to } = action
  if (state.phase !== 'awaitPass') return err('WRONG_PHASE', `cannot pass in phase ${state.phase}`)
  if (seat !== state.turn) return err('NOT_YOUR_TURN', `it is seat ${state.turn}'s turn, not seat ${seat}'s`)
  if (!isSeat(to) || to === seat || seatTeam(to) !== seatTeam(seat))
    return err('PASS_TARGET_NOT_TEAMMATE', `seat ${String(to)} is not a teammate of seat ${seat}`)
  if (state.hands[to].length === 0) return err('PASS_TARGET_OUT', `seat ${to} has no cards`)
  return handoff(state, to, [{ type: 'pass', from: seat, to }])
}

/* ------------------------------------------------------------ designate --- */

function reduceDesignate(state: GameState, action: { seat: Seat; to: Seat }): ReduceResult {
  const { seat, to } = action
  if (state.phase !== 'awaitDesignate') return err('WRONG_PHASE', `cannot designate in phase ${state.phase}`)
  if (seat !== state.turn) return err('NOT_YOUR_TURN', `it is seat ${state.turn}'s turn, not seat ${seat}'s`)
  if (!isSeat(to) || seatTeam(to) === seatTeam(seat) || state.hands[to].length === 0)
    return err('DESIGNATE_TARGET_INVALID', `seat ${String(to)} is not an opponent with cards`)
  return handoff(state, to, [{ type: 'designate', from: seat, to }])
}

/** Shared tail of pass/designate: turn = to; endgame if a whole team is out, else playing. */
function handoff(state: GameState, to: Seat, events: PublicEvent[]): ReduceResult {
  const someTeamEmpty = teamCardCount(state.hands, 0) === 0 || teamCardCount(state.hands, 1) === 0
  if (someTeamEmpty) {
    events.push({ type: 'endgame', claimingTeam: seatTeam(to) as Team })
    return accept(state, { turn: to, phase: 'endgame' }, events)
  }
  return accept(state, { turn: to, phase: 'playing' }, events)
}
