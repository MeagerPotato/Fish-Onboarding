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
          <li>6 players, 2 teams of 3, sitting in alternate seats.</li>
          <li>54 cards: a full pack plus both jokers. 9 each.</li>
          <li>9 half-suits of 6 cards. Win 5 and the game is over.</li>
        </ul>
      </section>

      <section className={s.block}>
        <h3 className={s.heading}>Your turn: ask, or claim</h3>
        <p className={s.lead}>An ask must pass all four:</p>
        <ol className={s.gates}>
          <li data-gate="opponent">Ask an opponent. Never a teammate.</li>
          <li data-gate="half-suit">You must already hold a card of that half-suit.</li>
          <li data-gate="own-card">Never ask for a card you already hold.</li>
          <li data-gate="target-has-cards">The player you ask must still have cards.</li>
        </ol>
        <ul className={s.list}>
          <li>
            <strong>Hit</strong> — they hand it over and you go again.
          </li>
          <li>
            <strong>Miss</strong> — the turn goes to whoever you asked.
          </li>
        </ul>
      </section>

      <section className={s.block}>
        <h3 className={s.heading}>Claiming a half-suit</h3>
        <p className={s.lead}>
          Name the half-suit, then name who holds each of its six cards. Three things can happen:
        </p>
        <ul className={s.outcomes}>
          <li data-outcome="win">
            <strong>All six right</strong> — your team scores it.
          </li>
          <li data-outcome="lose">
            <strong>An opponent holds even one</strong> — the other team scores it.
          </li>
          <li data-outcome="void">
            <strong>All six on your team, but one named wrong</strong> — void, nobody scores.
          </li>
        </ul>
        <p className={s.note}>A claim never ends your turn. You may claim a half-suit you hold no cards of.</p>
      </section>

      <section className={s.block}>
        <h3 className={s.heading}>Running out</h3>
        <ul className={s.list}>
          <li>Someone takes your last card — you drop out. Play carries on around you.</li>
          <li>Your own claim empties you — pass the turn to a teammate who still has cards.</li>
          <li>Your whole team is empty — the other side claims the rest, alone.</li>
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
          Nine is odd on purpose. If the score reaches 4–4, the last half-suit breaks the tie. Only a
          void can still cause a draw.
        </p>
      </section>

      <section className={s.block} data-block="glossary">
        <h3 className={s.heading}>One word of warning</h3>
        <p className={s.note}>
          Some tables call a half-suit a <em>book</em>. It means the same thing: six cards, one point.
          This guide says half-suit because it tells you what the thing is.
        </p>
      </section>
    </article>
  )
}
