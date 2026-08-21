/**
 * The public record of every ask and every claim.
 *
 * This panel IS the game. Literature is played out of the log: every question tells the
 * table which half-suits you hold, every hit tells them exactly where a card went, and the
 * whole skill is remembering it. The guide's checkpoints are only solvable because this is
 * on screen, so it is never hidden behind an interaction on desktop.
 *
 * On a phone the shell demotes it to a summary chip plus a sheet — five persistent panels do
 * not fit in 650px (docs/MOBILE_SPEC.md §4) — but the content is identical.
 */
import { PlayingCard } from './PlayingCard.tsx'
import type { LogEntryVM } from '../tutorial/viewmodels.ts'
import s from './LogPanel.module.css'

export interface LogPanelProps {
  entries: LogEntryVM[]
  /** Newest first reads better in a narrow column; oldest first reads better as a story. */
  order?: 'newest-first' | 'oldest-first'
  /** Cap the list; the guide shows the last handful in the compact layout. */
  limit?: number
}

export function LogPanel({ entries, order = 'newest-first', limit }: LogPanelProps) {
  const ordered = order === 'newest-first' ? [...entries].reverse() : entries
  const shown = limit ? ordered.slice(0, limit) : ordered

  return (
    <section className={s.panel} data-testid="log" aria-label="What has happened so far">
      <ol className={s.entries} data-order={order}>
        {shown.map((entry) => (
          <li
            key={entry.id}
            className={s.entry}
            data-testid="log-entry"
            data-kind={entry.kind}
            data-team={entry.actor === null ? undefined : entry.actor % 2}
            data-hit={entry.hit === null ? undefined : String(entry.hit)}
            data-outcome={entry.outcome ?? undefined}
          >
            <p className={s.text}>{entry.text}</p>
            {entry.kind === 'ask' && entry.cards.length > 0 ? (
              <span className={s.cards} aria-hidden="true">
                {entry.cards.map((c) => (
                  <PlayingCard key={c.card} card={c} size="sm" muted={entry.hit === false} />
                ))}
              </span>
            ) : null}
          </li>
        ))}
      </ol>
      {shown.length === 0 ? <p className={s.empty}>Nothing has happened yet.</p> : null}
    </section>
  )
}
