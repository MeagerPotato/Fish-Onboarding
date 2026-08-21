/**
 * The learner's own hand, grouped by half-suit.
 *
 * Grouping is not decoration: which half-suits you hold is exactly what determines which
 * asks are legal, so a hand that shows its half-suits is a hand that teaches the rule.
 * The engine already sorts hands into this order (lib/engine/cards.ts).
 */
import { PlayingCard } from './PlayingCard.tsx'
import type { HandGroupVM } from '../tutorial/viewmodels.ts'
import type { Card } from '../../lib/engine/index.ts'
import s from './HandFan.module.css'

export interface HandFanProps {
  groups: HandGroupVM[]
  /** Cards the current step is drawing attention to. */
  highlight?: Card[]
  /** Half-suit the current step is drawing attention to. */
  highlightHalfSuit?: string
}

export function HandFan({ groups, highlight = [], highlightHalfSuit }: HandFanProps) {
  const total = groups.reduce((n, g) => n + g.cards.length, 0)

  return (
    <section className={s.hand} data-testid="hand" aria-label={`Your hand, ${total} cards`}>
      {total === 0 ? (
        <p className={s.empty} data-testid="hand-empty">
          You are out of cards.
        </p>
      ) : (
        <ol className={s.groups}>
          {groups.map((group) => (
            <li
              key={group.halfSuit}
              className={s.group}
              data-half-suit={group.halfSuit}
              data-highlighted={highlightHalfSuit === group.halfSuit ? 'true' : undefined}
            >
              <h3 className={s.groupName}>{group.name}</h3>
              <ol className={s.cards}>
                {group.cards.map((card) => (
                  <li key={card.card} className={s.cardSlot}>
                    <PlayingCard card={card} size="md" highlighted={highlight.includes(card.card)} />
                  </li>
                ))}
              </ol>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
