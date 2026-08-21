/**
 * The guide, wired together.
 *
 * This file owns composition only. Every rule lives in `lib/engine`, every word lives in
 * `src/tutorial/script.ts`, and every pixel is Codex's — the components here render
 * semantic markup with styling hooks and no opinions about how it should look.
 */
import { useMemo } from 'react'
import { ACTS } from './tutorial/script.ts'
import { useTutorial, savedStartIndex } from './tutorial/useTutorial.ts'
import { claimRowsVM, handVM, logVM, scoreVM, tableVM } from './tutorial/viewmodels.ts'
import { AppShell } from './components/AppShell.tsx'
import { Annotation } from './components/Annotation.tsx'
import { AskChoice } from './components/AskChoice.tsx'
import { CheatSheet } from './components/CheatSheet.tsx'
import { ClaimSheet } from './components/ClaimSheet.tsx'
import { HandFan } from './components/HandFan.tsx'
import { LogPanel } from './components/LogPanel.tsx'
import { ScoreRail } from './components/ScoreRail.tsx'
import { StepNav } from './components/StepNav.tsx'
import { TableView } from './components/TableView.tsx'
import s from './App.module.css'

export default function App() {
  const t = useTutorial(savedStartIndex())

  const seats = useMemo(() => tableVM(t.game), [t.game])
  const hand = useMemo(() => handVM(t.game), [t.game])
  const score = useMemo(() => scoreVM(t.game), [t.game])
  const log = useMemo(() => logVM(t.game), [t.game])

  const act = ACTS.find((a) => a.id === t.act)
  const isCheatSheet = t.step.id === 'cheat-sheet'

  const claimRows = useMemo(
    () => (t.checkpoint?.kind === 'claim' ? claimRowsVM(t.checkpoint.halfSuit, t.placements) : []),
    [t.checkpoint, t.placements],
  )

  const checkpointPanel =
    t.checkpoint?.kind === 'ask-choice' ? (
      <AskChoice
        checkpoint={t.checkpoint}
        chosen={t.chosenOption}
        wrongNote={t.wrongNote}
        solved={t.status === 'revealed'}
        attempts={t.attempts}
        onChoose={t.chooseOption}
        onReveal={t.revealAnswer}
      />
    ) : t.checkpoint?.kind === 'claim' ? (
      <ClaimSheet
        checkpoint={t.checkpoint}
        rows={claimRows}
        canSubmit={t.canSubmitClaim}
        solved={t.status === 'revealed'}
        error={t.claimError}
        attempts={t.attempts}
        onPlace={t.place}
        onSubmit={t.submitClaim}
        onReveal={t.revealAnswer}
      />
    ) : null

  return (
    <AppShell
      header={<ScoreRail score={score} />}
      table={
        <>
          <TableView seats={seats} />
          <LogPanel entries={log} limit={4} />
        </>
      }
      annotation={
        <div className={s.annotationZone}>
          <Annotation step={t.step} actTitle={act?.title ?? ''} />
          {checkpointPanel}
        </div>
      }
      hand={<HandFan groups={hand} />}
      nav={
        <StepNav
          stepIndex={t.stepIndex}
          stepCount={t.stepCount}
          progress={t.progress}
          blocked={t.isBlocked}
          isFinished={t.isFinished}
          onBack={t.back}
          onNext={t.next}
          onRestart={t.restart}
        />
      }
      overlay={isCheatSheet ? <CheatSheet /> : undefined}
    />
  )
}
