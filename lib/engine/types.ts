/**
 * Core types for the Fish (Literature) rules engine — the 9 half-suit variant.
 * Pure data: no imports, no side effects. See RULES.md for the pinned rule set.
 *
 * Terminology (RULES.md §0): a set of six collectable cards is a HALF-SUIT.
 * The word "book" appears nowhere in this codebase.
 */

export type Suit = 'C' | 'D' | 'H' | 'S'

/** All thirteen ranks — the 8s are in play in this variant (RULES.md row 2). */
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A'

/** The two jokers are distinct, individually askable cards (RULES.md §2). */
export type Joker = 'RJ' | 'BJ'

/** 54 cards: a standard 52 plus both jokers. */
export type Card = `${Rank}${Suit}` | Joker

export type Half = 'LOW' | 'HIGH'

/**
 * The nine half-suits (RULES.md row 3):
 * LOW-x = 2..7 of a suit, HIGH-x = 9..A of a suit, and EIGHTS = the four 8s + both jokers.
 */
export type HalfSuitId = `${Half}-${Suit}` | 'EIGHTS'

export type Seat = 0 | 1 | 2 | 3 | 4 | 5

/** team = seat % 2 — seats 0,2,4 are team 0 (A); seats 1,3,5 are team 1 (B). */
export type Team = 0 | 1

export type Phase = 'playing' | 'awaitPass' | 'awaitDesignate' | 'endgame' | 'finished'

export type Outcome = 'team0' | 'team1' | 'void'

/** Outcome record of a resolved (scored or void) half-suit. */
export interface HalfSuitResult {
  halfSuit: HalfSuitId
  outcome: Outcome
  claimer: Seat
  /** The claimant's stated locations. Always restricted to their own team. */
  assignments: Record<Card, Seat>
  /** True holders at the moment of the claim, before removal. Always revealed. */
  actualHolders: Record<Card, Seat>
}

export type PublicEvent =
  | { type: 'game_started'; startingSeat: Seat }
  | { type: 'ask'; asker: Seat; target: Seat; card: Card; hit: boolean }
  | {
      type: 'claim'
      claimer: Seat
      halfSuit: HalfSuitId
      assignments: Record<Card, Seat>
      actualHolders: Record<Card, Seat>
      outcome: Outcome
    }
  | { type: 'pass'; from: Seat; to: Seat }
  | { type: 'designate'; from: Seat; to: Seat }
  | { type: 'player_out'; seat: Seat }
  | { type: 'endgame'; claimingTeam: Team }
  | { type: 'game_over'; score: [number, number]; winner: 0 | 1 | 'tie' }

export interface GameState {
  phase: Phase
  turn: Seat
  /** Six hands, index = seat. Always kept in canonical sorted order. */
  hands: Card[][]
  halfSuits: Partial<Record<HalfSuitId, HalfSuitResult>>
  score: [number, number]
  log: PublicEvent[]
  moveIndex: number
}

export type GameAction =
  | { type: 'ask'; seat: Seat; target: Seat; card: Card }
  | { type: 'claim'; seat: Seat; halfSuit: HalfSuitId; assignments: Record<Card, Seat> }
  | { type: 'pass'; seat: Seat; to: Seat }
  | { type: 'designate'; seat: Seat; to: Seat }

export type ErrorCode =
  | 'WRONG_PHASE'
  | 'NOT_YOUR_TURN'
  | 'ASKER_OUT'
  | 'TARGET_TEAMMATE'
  | 'TARGET_SELF'
  | 'TARGET_OUT'
  | 'INVALID_CARD'
  | 'NO_CARD_OF_HALF_SUIT'
  | 'ASKING_OWN_CARD'
  | 'HALF_SUIT_RESOLVED'
  | 'BAD_ASSIGNMENTS'
  | 'ASSIGN_OPPONENT'
  | 'PASS_TARGET_OUT'
  | 'PASS_TARGET_NOT_TEAMMATE'
  | 'DESIGNATE_TARGET_INVALID'
  | 'INVALID_ACTION'

export interface EngineError {
  code: ErrorCode
  message: string
}

export type ReduceResult =
  | { ok: true; state: GameState; events: PublicEvent[] }
  | { ok: false; error: EngineError }

/** Public projection of the game. Never contains any hidden hand card identity. */
export interface PublicState {
  phase: Phase
  turn: Seat
  counts: number[]
  score: [number, number]
  halfSuits: Partial<Record<HalfSuitId, HalfSuitResult>>
  log: PublicEvent[]
  moveIndex: number
}
