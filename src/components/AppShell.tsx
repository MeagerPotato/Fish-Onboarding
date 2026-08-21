/**
 * The five-zone shell: header, table, annotation, hand, nav.
 *
 * The zone contract comes from docs/MOBILE_SPEC.md §4 and is the one structural decision the
 * designer should not quietly change: only the annotation zone flexes. Everything else is a
 * fixed block, which is what keeps layout shift near zero when the step changes and stops
 * the table jumping under the learner's thumb.
 *
 * The shell sizes to `100svh` — the *small* viewport height — not `dvh` and not `vh`.
 * `dvh` would resize the table as the browser toolbar collapses; `svh` never moves, and
 * because the document itself never scrolls, the toolbar never collapses in the first place.
 */
import type { ReactNode } from 'react'
import s from './AppShell.module.css'

export interface AppShellProps {
  header: ReactNode
  table: ReactNode
  annotation: ReactNode
  hand: ReactNode
  nav: ReactNode
  /** Rendered over the whole shell — the checkpoint sheets and the final reference card. */
  overlay?: ReactNode
}

export function AppShell({ header, table, annotation, hand, nav, overlay }: AppShellProps) {
  return (
    <div className={s.shell} data-testid="app-shell">
      <header className={s.header} data-zone="header">
        {header}
      </header>

      <main className={s.main} data-zone="main">
        <div className={s.table} data-zone="table">
          {table}
        </div>

        <div className={s.annotation} data-zone="annotation">
          {annotation}
        </div>

        <div className={s.hand} data-zone="hand">
          {hand}
        </div>
      </main>

      <footer className={s.nav} data-zone="nav">
        {nav}
      </footer>

      {overlay ? (
        <div className={s.overlay} data-zone="overlay">
          {overlay}
        </div>
      ) : null}
    </div>
  )
}
