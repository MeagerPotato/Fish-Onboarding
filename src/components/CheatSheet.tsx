/**
 * The reference card shown at the end.
 *
 * This is the artefact people actually take to the table — screenshotted, or printed and
 * left next to the deck. It must therefore survive being read with no other context, and it
 * must print (docs/MOBILE_SPEC.md §10): plain semantic markup, no information carried only
 * by colour, and nothing that depends on an interaction to reveal.
 *
 * It also carries the one permitted use of the word "book" in the whole product
 * (RULES.md §0) — a single glossary note, so a learner who hears it at another table knows
 * what is meant.
 */
import { ALL_HALF_SUITS } from '../../lib/engine/index.ts'
import { halfSuitDisplay, halfSuitName, halfSuitRange } from '../tutorial/display.ts'
import { PlayingCard } from './PlayingCard.tsx'
import s from './CheatSheet.module.css'

export function CheatSheet() {
  return (
    <article className={s.sheet} data-testid="cheat-sheet">
      <h2 className={s.title}>Fish, on one card</h2>

      <section className={s.block}>
        <h3 className={s.heading}>The setup</h3>
        <ul className={s.list}>
          <li>6 players, 2 teams of 3, sitting alternately.</li>
          <li>54 cards — a full pack plus both jokers. 9 each.</li>
          <li>9 half-suits of 6. Win 5 and the game is over.</li>
        </ul>
      </section>

      <section className={s.block}>
        <h3 className={s.heading}>Your turn: ask, or claim</h3>
        <p className={s.lead}>An ask must pass all four:</p>
        <ol className={s.gates}>
          <li data-gate="opponent">Ask an opponent — never a teammate.</li>
          <li data-gate="half-suit">You must already hold a card of that half-suit.</li>
          <li data-gate="own-card">Never ask for a card in your own hand.</li>
          <li data-gate="target-has-cards">The player you ask must still have cards.</li>
        </ol>
        <ul className={s.list}>
          <li>
            <strong>Hit</strong> — they hand it over and you keep the turn.
          </li>
          <li>
            <strong>Miss</strong> — the turn passes to whoever you asked.
          </li>
        </ul>
      </section>

      <section className={s.block}>
        <h3 className={s.heading}>Claiming a half-suit</h3>
        <p className={s.lead}>
          Name the half-suit, then name exactly which teammate holds each of its six cards. Three outcomes:
        </p>
        <ul className={s.outcomes}>
          <li data-outcome="win">
            <strong>All six right</strong> — your team scores it.
          </li>
          <li data-outcome="lose">
            <strong>An opponent holds any one of them</strong> — the other team scores it.
          </li>
          <li data-outcome="void">
            <strong>Your team holds all six but one is misplaced</strong> — void, nobody scores.
          </li>
        </ul>
        <p className={s.note}>Your turn continues either way. You may claim a half-suit you hold none of.</p>
      </section>

      <section className={s.block}>
        <h3 className={s.heading}>Running out</h3>
        <ul className={s.list}>
          <li>Emptied by someone else — you drop out; play continues around you.</li>
          <li>Emptied by your own claim — pass the turn to a teammate who still has cards.</li>
          <li>Whole team empty — the side with cards claims out the rest, alone.</li>
        </ul>
      </section>

      <section className={s.block} data-block="half-suits">
        <h3 className={s.heading}>The nine half-suits</h3>
        <ol className={s.halfSuits}>
          {ALL_HALF_SUITS.map((id) => (
            <li key={id} className={s.halfSuit} data-half-suit={id} data-ninth={id === 'EIGHTS' ? 'true' : undefined}>
              <h4 className={s.halfSuitName}>{halfSuitName(id)}</h4>
              <p className={s.halfSuitRange}>{halfSuitRange(id)}</p>
              <ol className={s.halfSuitCards} aria-hidden="true">
                {halfSuitDisplay(id).map((c) => (
                  <li key={c.card}>
                    <PlayingCard card={c} size="sm" />
                  </li>
                ))}
              </ol>
            </li>
          ))}
        </ol>
        <p className={s.note}>
          Nine is odd on purpose: a game where every half-suit is won cannot end level. Only a voided
          half-suit can produce a draw.
        </p>
      </section>

      <section className={s.block} data-block="glossary">
        <h3 className={s.heading}>One word of warning</h3>
        <p className={s.note}>
          Some tables call a half-suit a <em>book</em>. It means the same thing — six cards, one point.
          This guide says half-suit throughout because it tells you what the thing actually is.
        </p>
      </section>
    </article>
  )
}
