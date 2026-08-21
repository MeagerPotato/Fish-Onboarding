/**
 * The teaching text for the current step.
 *
 * This is the only zone in the shell that flexes (docs/MOBILE_SPEC.md §4), so it owns the
 * page's vertical slack. `aria-live` is deliberately `polite` and on the container: the
 * heading and body swap together when the step changes, and a learner using a screen reader
 * should hear the new step announced once, not twice.
 */
import type { Step } from '../tutorial/script.ts'
import s from './Annotation.module.css'

export interface AnnotationProps {
  step: Step
  /** Act title, shown as an eyebrow. */
  actTitle: string
}

export function Annotation({ step, actTitle }: AnnotationProps) {
  return (
    <section
      className={s.annotation}
      data-testid="annotation"
      data-mode={step.mode}
      data-step={step.id}
      aria-live="polite"
    >
      <p className={s.eyebrow} data-testid="act-title">
        {actTitle}
      </p>
      <h1 className={s.title} data-testid="step-title">
        {step.title}
      </h1>
      <p className={s.body} data-testid="step-body">
        {step.body}
      </p>
    </section>
  )
}
