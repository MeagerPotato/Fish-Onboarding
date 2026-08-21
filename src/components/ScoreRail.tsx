/**
 * All nine half-suits and who has won them.
 *
 * The ninth is marked (`data-ninth`) because the guide keeps pointing at it: nine is odd on
 * purpose, and the rail is where that becomes visible rather than just stated.
 */
import type { ScoreVM } from '../tutorial/viewmodels.ts'
import s from './ScoreRail.module.css'

export interface ScoreRailProps {
  score: ScoreVM
  /** Half-suit the current step is talking about. */
  spotlight?: string
}

export function ScoreRail({ score, spotlight }: ScoreRailProps) {
  return (
    <section className={s.rail} data-testid="score-rail" aria-label="Half-suits won">
      <p className={s.score} data-testid="score">
        <span className={s.team} data-team="0">
          Blue <b data-testid="score-blue">{score.blue}</b>
        </span>
        <span className={s.sep} aria-hidden="true">
          –
        </span>
        <span className={s.team} data-team="1">
          Red <b data-testid="score-red">{score.red}</b>
        </span>
        {score.winner === null && score.toWin > 0 ? (
          <span className={s.toWin} data-testid="score-to-win">
            {score.toWin} to win
          </span>
        ) : null}
      </p>

      <ol className={s.chips}>
        {score.halfSuits.map((h) => (
          <li
            key={h.id}
            className={s.chip}
            data-testid={`half-suit-${h.id}`}
            data-state={h.state}
            data-ninth={h.isNinth ? 'true' : undefined}
            data-spotlight={spotlight === h.id ? 'true' : undefined}
          >
            <span className={s.chipLabel}>{h.short}</span>
            <span className={s.srOnly}>
              {h.name}:{' '}
              {h.state === 'open' ? 'still in play' : `won by ${h.state === 'team0' ? 'Blue' : 'Red'}`}
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}
