/**
 * Structural invariants that must hold after every reduce. Used by the fuzz test and by
 * the tutorial script test, which replays the whole teaching game and checks each step.
 * Returns a list of violations rather than throwing.
 */
import type { Card, GameState } from './types.ts'
import { ALL_CARDS, ALL_HALF_SUITS, cardCompare, halfSuitCards, seatTeam, teamCardCount } from './cards.ts'

export function checkInvariants(s: GameState): string[] {
  const problems: string[] = []

  // 1. Card conservation: every one of the 54 cards is in exactly one hand or one resolved half-suit.
  const inHands = new Map<Card, number>()
  s.hands.forEach((h, seat) => {
    for (const c of h) {
      if (inHands.has(c)) problems.push(`${c} is in two hands (seats ${inHands.get(c)} and ${seat})`)
      inHands.set(c, seat)
    }
  })
  const resolved = new Set<Card>(
    ALL_HALF_SUITS.filter((h) => s.halfSuits[h]).flatMap((h) => [...halfSuitCards(h)]),
  )
  for (const c of ALL_CARDS) {
    const held = inHands.has(c)
    const gone = resolved.has(c)
    if (held && gone) problems.push(`${c} belongs to a resolved half-suit but is still in a hand`)
    if (!held && !gone) problems.push(`${c} has vanished: in no hand and in no resolved half-suit`)
  }

  // 2. Hands stay canonically sorted.
  s.hands.forEach((h, seat) => {
    for (let i = 1; i < h.length; i++) {
      if (cardCompare(h[i - 1], h[i]) >= 0) {
        problems.push(`seat ${seat}'s hand is not canonically sorted at index ${i}`)
        break
      }
    }
  })

  // 3. Score matches the resolved half-suits.
  const tally: [number, number] = [0, 0]
  for (const h of ALL_HALF_SUITS) {
    const r = s.halfSuits[h]
    if (!r) continue
    if (r.outcome === 'team0') tally[0] += 1
    else if (r.outcome === 'team1') tally[1] += 1
  }
  if (tally[0] !== s.score[0] || tally[1] !== s.score[1])
    problems.push(`score ${s.score.join('-')} disagrees with resolved half-suits ${tally.join('-')}`)

  // 4. Phase consistency.
  const resolvedCount = ALL_HALF_SUITS.filter((h) => s.halfSuits[h]).length
  if (resolvedCount === ALL_HALF_SUITS.length && s.phase !== 'finished')
    problems.push(`all ${ALL_HALF_SUITS.length} half-suits are resolved but phase is ${s.phase}`)
  if (s.phase === 'finished' && resolvedCount !== ALL_HALF_SUITS.length)
    problems.push(`phase is finished with only ${resolvedCount} half-suits resolved`)
  if (s.phase === 'playing' && teamCardCount(s.hands, 0) === 0 && resolvedCount < ALL_HALF_SUITS.length)
    problems.push('team 0 is out of cards but phase is still playing')
  if (s.phase === 'playing' && teamCardCount(s.hands, 1) === 0 && resolvedCount < ALL_HALF_SUITS.length)
    problems.push('team 1 is out of cards but phase is still playing')
  if (s.phase === 'awaitPass' && s.hands[s.turn].length !== 0)
    problems.push('awaitPass but the seat to act still holds cards')
  if (s.phase === 'awaitDesignate' && teamCardCount(s.hands, seatTeam(s.turn)) !== 0)
    problems.push("awaitDesignate but the claimant's team still holds cards")

  return problems
}
