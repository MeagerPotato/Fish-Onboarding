/**
 * Checkpoints 1 and 2: pick the one ask that is correct.
 *
 * Every option stays visible and re-selectable after a wrong answer — the point is to read
 * why it was wrong and try again, not to be locked out. The explanation for a wrong option
 * is the teaching, so it is shown inline against the option the learner actually picked.
 */
import { PlayingCard } from './PlayingCard.tsx'
import { cardDisplay } from '../tutorial/display.ts'
import { seatName } from '../tutorial/table.ts'
import type { AskChoiceCheckpoint } from '../tutorial/script.ts'
import s from './AskChoice.module.css'

export interface AskChoiceProps {
  checkpoint: AskChoiceCheckpoint
  chosen: number | null
  wrongNote: string | null
  solved: boolean
  attempts: number
  onChoose: (index: number) => void
  onReveal: () => void
}

export function AskChoice({ checkpoint, chosen, wrongNote, solved, attempts, onChoose, onReveal }: AskChoiceProps) {
  return (
    <section className={s.choice} data-testid="checkpoint-ask" aria-labelledby="checkpoint-prompt">
      <p className={s.brief}>{checkpoint.brief}</p>
      <h2 className={s.prompt} id="checkpoint-prompt">
        {checkpoint.prompt}
      </h2>

      <ul className={s.options} role="list">
        {checkpoint.options.map((option, i) => {
          const card = cardDisplay(option.card)
          const isChosen = chosen === i
          const isCorrect = i === checkpoint.correct
          const state = solved && isCorrect ? 'correct' : isChosen && !isCorrect ? 'wrong' : 'idle'

          return (
            <li key={`${option.target}-${option.card}`} className={s.option}>
              <button
                type="button"
                className={s.optionButton}
                data-testid={`ask-option-${i}`}
                data-state={state}
                onClick={() => onChoose(i)}
                disabled={solved}
                aria-pressed={isChosen}
              >
                <span className={s.optionText}>
                  Ask <strong>{seatName(option.target)}</strong> for the {card.spoken}
                </span>
                <PlayingCard card={card} size="sm" />
              </button>

              {/* The reason lives with the option so it reads as feedback, not as a verdict. */}
              {isChosen && !isCorrect && !solved ? (
                <p className={s.why} data-testid={`ask-option-why-${i}`} role="status">
                  {option.note}
                </p>
              ) : null}
              {solved && isCorrect ? (
                <p className={s.why} data-testid="ask-option-why-correct">
                  {option.note}
                </p>
              ) : null}
            </li>
          )
        })}
      </ul>

      {wrongNote && !solved ? (
        <p className={s.hint} role="status" data-testid="checkpoint-hint">
          Not that one — try again.
        </p>
      ) : null}

      {attempts >= 2 && !solved ? (
        <button type="button" className={s.reveal} data-testid="checkpoint-reveal" onClick={onReveal}>
          Show me the answer
        </button>
      ) : null}

      {solved ? (
        <p className={s.reveal_text} data-testid="checkpoint-reveal-text" role="status">
          {checkpoint.reveal}
        </p>
      ) : null}
    </section>
  )
}
