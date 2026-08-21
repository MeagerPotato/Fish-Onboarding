/**
 * One card face.
 *
 * Accessibility contract (docs/MOBILE_SPEC.md §7): suit is carried by a SYMBOL and by
 * `data-suit`, never by colour alone, and the two jokers are told apart by a written mark
 * and a distinct shape. Styling may add colour on top; it may not replace these.
 */
import type { CardDisplay } from '../tutorial/display.ts'
import s from './PlayingCard.module.css'

export type CardSize = 'sm' | 'md' | 'lg'

export interface PlayingCardProps {
  card: CardDisplay
  size?: CardSize
  /** Dim the card without hiding it — used for cards that are not the current subject. */
  muted?: boolean
  /** Draw attention: the card an annotation is talking about right now. */
  highlighted?: boolean
  /** Renders a button instead of a figure. */
  onClick?: () => void
  selected?: boolean
  disabled?: boolean
}

export function PlayingCard({
  card,
  size = 'md',
  muted = false,
  highlighted = false,
  onClick,
  selected = false,
  disabled = false,
}: PlayingCardProps) {
  // The accessible name comes from aria-label on the wrapper, so the glyphs are hidden and
  // no visually-hidden duplicate is needed — one would only be announced twice and would
  // pollute textContent for tests.
  const content = (
    <>
      <span className={s.rank} aria-hidden="true">
        {card.rank}
      </span>
      <span className={s.suit} aria-hidden="true">
        {card.suit}
      </span>
    </>
  )

  const shared = {
    className: s.card,
    'data-testid': `card-${card.card}`,
    'data-card': card.card,
    'data-suit': card.key,
    'data-size': size,
    'data-joker': card.isJoker ? 'true' : undefined,
    'data-muted': muted ? 'true' : undefined,
    'data-highlighted': highlighted ? 'true' : undefined,
  }

  if (onClick) {
    return (
      <button
        type="button"
        {...shared}
        onClick={onClick}
        disabled={disabled}
        aria-pressed={selected}
        aria-label={card.spoken}
      >
        {content}
      </button>
    )
  }

  return (
    <figure {...shared} role="img" aria-label={card.spoken}>
      {content}
    </figure>
  )
}
