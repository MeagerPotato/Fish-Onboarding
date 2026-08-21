/**
 * Public surface of the Fish rules engine — the 9 half-suit variant.
 * Pure TypeScript. No framework, platform, or DOM imports anywhere in lib/engine/.
 */
export type {
  Suit,
  Rank,
  Joker,
  Card,
  Half,
  HalfSuitId,
  Seat,
  Team,
  Phase,
  Outcome,
  HalfSuitResult,
  PublicEvent,
  GameState,
  GameAction,
  ErrorCode,
  EngineError,
  ReduceResult,
  PublicState,
} from './types.ts'

export {
  SUITS,
  LOW_RANKS,
  HIGH_RANKS,
  JOKERS,
  EIGHTS_CARDS,
  ALL_CARDS,
  ALL_HALF_SUITS,
  ALL_SEATS,
  isCard,
  isHalfSuitId,
  isJoker,
  cardHalfSuit,
  halfSuitCards,
  cardSuit,
  cardRank,
  cardCompare,
  sortHand,
  seatTeam,
  teamSeats,
  otherTeam,
  teamCardCount,
} from './cards.ts'

export {
  hashSeed,
  mulberry32,
  rngFromSeed,
  randInt,
  shuffle,
  dealHands,
  validateDeal,
  describeDealProblem,
} from './deal.ts'
export type { DealProblem } from './deal.ts'

export { newGame, newGameFromDeal, reduce } from './reduce.ts'

export { publicView, seatView } from './views.ts'
export type { SeatView } from './views.ts'

export {
  legalAsks,
  askableHalfSuits,
  unresolvedHalfSuits,
  explainAsk,
  legalActionKinds,
  holderOf,
} from './helpers.ts'
export type { AskVerdict, AskGate } from './helpers.ts'

export { checkInvariants } from './invariants.ts'
