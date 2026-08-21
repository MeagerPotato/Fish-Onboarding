/**
 * The guide, wired together.
 *
 * This file owns composition only. Every rule lives in `lib/engine`, every word lives in
 * `src/tutorial/script.ts`, and every pixel is Codex's — the components here render
 * semantic markup with styling hooks and no opinions about how it should look.
 */
import { useMemo, useState } from 'react'
import { ACTS } from './tutorial/script.ts'
import { useTutorial, savedStartIndex, hashStepIndex } from './tutorial/useTutorial.ts'
import { claimRowsVM, handVM, logVM, scoreVM, tableVM } from './tutorial/viewmodels.ts'
import { AppShell } from './components/AppShell.tsx'
import { Annotation } from './components/Annotation.tsx'
import { AskChoice } from './components/AskChoice.tsx'
import { CheatSheet } from './components/CheatSheet.tsx'
import { ClaimSheet } from './components/ClaimSheet.tsx'
import { HandFan } from './components/HandFan.tsx'
import { ResumeBar } from './components/ResumeBar.tsx'
import { LogPanel } from './components/LogPanel.tsx'
import { ScoreRail } from './components/ScoreRail.tsx'
import { StepNav } from './components/StepNav.tsx'
import { TableView } from './components/TableView.tsx'
import s from './App.module.css'

export default function App() {
  const t = useTutorial(savedStartIndex())

  /*
   * The resume notice. Both facts it rests on describe how this session STARTED, and
   * neither survives being re-read: savedStartIndex() is overwritten the moment the learner
   * moves, and the hash changes on every step. So capture once, at mount.
   *
   * A deep link is deliberately excluded. Someone opening /#step-12 chose step 12, so
   * telling them they were "picked up where they left off" would simply be untrue.
   */
  const [resume] = useState(() => ({ from: savedStartIndex(), deepLinked: hashStepIndex() !== null }))
  const [resumeDismissed, setResumeDismissed] = useState(false)

  /*
   * Shown only while the learner is still standing where they were put: their first move is
   * itself the acknowledgement. No timer — an auto-dismiss would pull a focusable button out
   * from under a keyboard user mid-reach.
   */
  const showResume =
    !resumeDismissed && !resume.deepLinked && resume.from > 0 && t.stepIndex === resume.from

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
      mode={t.checkpoint?.kind === 'claim' ? 'claim' : 'default'}
      header={<ScoreRail score={score} />}
      table={
        <>
          <TableView seats={seats} />
          {/*
            No limit. The claim checkpoints are only solvable by reading the log — cp4 turns
            on two joker asks that happened many steps earlier — so truncating it in JS makes
            the guide's central promise false. The log zone is scroll-clamped in CSS instead,
            which keeps the whole history reachable. See DESIGN_BRIEF.md §6.
          */}
          <LogPanel entries={log} />
        </>
      }
      annotation={
        <div className={s.annotationZone}>
          {showResume ? (
            <ResumeBar
              stepNumber={resume.from + 1}
              onDismiss={() => setResumeDismissed(true)}
              onRestart={() => {
                setResumeDismissed(true)
                t.restart()
              }}
            />
          ) : null}
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
