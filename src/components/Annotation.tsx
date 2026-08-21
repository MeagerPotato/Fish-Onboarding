/**
 * The teaching text for the current step.
 *
 * This is the only zone in the shell that flexes (docs/MOBILE_SPEC.md §4), so it owns the
 * page's vertical slack.
 *
 * Focus moves to the heading on every step change. That is the standard accessible pattern
 * for a stepper: without it, advancing drops focus to <body>, so the next Tab restarts from
 * the top of the document and a screen-reader user is told nothing about where they landed.
 * Because focus lands on the heading, the heading is announced — which is why this is
 * deliberately NOT an aria-live region as well. Doing both announces every step twice.
 */
import { useEffect, useRef } from 'react'
import type { Step } from '../tutorial/script.ts'
import s from './Annotation.module.css'

export interface AnnotationProps {
  step: Step
  /** Act title, shown as an eyebrow. */
  actTitle: string
}

export function Annotation({ step, actTitle }: AnnotationProps) {
  const heading = useRef<HTMLHeadingElement>(null)
  const firstRender = useRef(true)

  useEffect(() => {
    // Don't steal focus on the very first paint — the learner has not navigated yet, and
    // grabbing focus on load moves the screen reader off the top of the document.
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    heading.current?.focus()
  }, [step.id])

  return (
    <section className={s.annotation} data-testid="annotation" data-mode={step.mode} data-step={step.id}>
      <p className={s.eyebrow} data-testid="act-title">
        {actTitle}
      </p>
      <h1 className={s.title} data-testid="step-title" ref={heading} tabIndex={-1}>
        {step.title}
      </h1>
      <p className={s.body} data-testid="step-body">
        {step.body}
      </p>
    </section>
  )
}
