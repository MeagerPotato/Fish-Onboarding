# QA_DESKTOP.md — desktop verification and acceptance criteria

The desktop counterpart to `docs/MOBILE_SPEC.md` §11, referenced by `CODEX_HANDOFF.md` §7.7.

**Part 1** records what was tested against the running app and what it did.
**Part 2** lists the defects found.
**Part 3** is the numbered checklist the design must satisfy. Every item there is objectively
pass/fail — no item requires taste, and no item is a matter of opinion about how it looks.

---

## 0. Conditions of this pass

| | |
|---|---|
| Build under test | dev server, `npm run dev` on `http://localhost:5174`, Vite 8.2.2 |
| Date | 2026-08-20 |
| Steps | 19, across 6 acts, 4 interactive checkpoints |
| Viewports | 1280×800, 1440×900, 1920×1080, 1024×768, plus 640×400 (≈ 200% zoom of 1280×800) |
| CSS present | `src/index.css` reset only. **Every `*.module.css` is still an empty class list.** |
| Therefore not tested | anything visual: layout, spacing, colour, contrast, dark mode, focus-ring design, print. Those are Part 3's job, not this pass's. |
| Driven by | DOM + real key events in the page; no screenshots (the pane does not composite headless) |

Everything below is a measurement or a DOM fact. Where a question could only be answered by
CSS that does not exist yet, it was written as a criterion in Part 3 instead of guessed at.

---

## 1. What was verified

### 1.1 The walkthrough

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | 19 steps, linear, reachable end to end | PASS | `[data-testid="progress"]` reads `1 / 19` … `19 / 19`; step ids `welcome … cheat-sheet` |
| 2 | Selector contract complete | PASS | 39 testids queried in one batch on a checkpoint step returned an empty missing list (`nav-next/back`, `progress`, `step-title`, `step-body`, `annotation`, `checkpoint-ask`, `ask-option-0…3`, `table`, `seat-0…5`, `count-0…5`, `hand`, `log`, `log-entry`, `score-rail`, `score-blue/red`, all nine `half-suit-*`); `nav-restart`, `cheat-sheet`, `checkpoint-claim`, `claim-rows`, `claim-<CARD>-seat-<N>`, `claim-submit`, `claim-progress`, `claim-error`, `claim-reveal` and `checkpoint-reveal` each exercised on their own steps |
| 3 | `ask-option-*` renders exactly 4 options with `data-state` ∈ `idle\|wrong\|correct` | PASS | all three states observed on both ask checkpoints |
| 4 | **cp1** (step 4) — Next blocked before answering | PASS | `nav-next.disabled === true` on arrival |
| 5 | cp1 — wrong answer explains itself and stays blocked | PASS | `ask-option-0` → `data-state="wrong"`, `[data-testid="ask-option-why-0"]` = "Mia is your partner. You may never ask a teammate…", `[data-testid="checkpoint-hint"]` = "Not that one — try again.", Next still disabled |
| 6 | cp1 — "show me the answer" appears after 2 wrong attempts | PASS | `[data-testid="checkpoint-reveal"]` absent after 1 attempt, present after 2 |
| 7 | cp1 — reveal control works | PASS | click → option 3 `data-state="correct"`, all 4 options `disabled`, `checkpoint-reveal-text` shown, Next enabled |
| 8 | cp1 — documented answer is the app's answer (index 3, Ravi / 5♠) | PASS | option 3 text = "Ask Ravi for the 5 of spades" |
| 9 | cp1 — solving advances the world | PASS | counts `9,9,9,9,9,9` → `10,8,9,9,9,9`; log gains "You ask Ravi for 5 of spades — and Ravi hands it over." |
| 10 | cp1 — Back then forward keeps it solved | PASS | 4/19 → 3/19 → 4/19; `data-state="correct"` retained, Next still enabled |
| 11 | **cp2** (step 9) — documented answer is the app's answer (index 0, Dana / 3♠) | PASS | option 0 text = "Ask Dana for the 3 of spades"; prompt "Which ask is guaranteed to hit?" |
| 12 | cp2 — wrong ×2 → reveal offered; correct click solves instead | PASS | reveal appears at attempt 2; clicking option 0 → `correct`, Next enabled, counts → `10,7,8,11,11,7` |
| 13 | **cp3** (step 11, `LOW-S`) — 6 rows × 3 own-team seats | PASS | rows `2S,3S,4S,5S,6S,7S`; each `claim-<CARD>-seat-{0,2,4}` = You / Mia / Kofi; no opponent seats offered |
| 14 | cp3 — submit blocked until all six placed | PASS | `claim-submit.disabled` true at 0 and 3 placed, false at 6; `claim-progress` reads "0 / 3 / 6 of 6 placed" |
| 15 | cp3 — wrong claim shows the void warning and stays blocked | PASS | all six → You ⇒ `[data-testid="claim-error"]` = "That is the trap… the half-suit is voided — gone from the game, scored by nobody."; `nav-next` still disabled |
| 16 | cp3 — deduction hints open after 1 wrong attempt | PASS | `[data-testid="claim-hints"]` present, contains per-card reasoning |
| 17 | cp3 — changing a placement clears the error | PASS | `claim-error` → `null` after next `claim-2S-seat-4` click |
| 18 | cp3 — reveal control appears after 2 wrong attempts | PASS | `[data-testid="claim-reveal"]` absent at 1, present at 2 |
| 19 | cp3 — documented answer is the app's answer | PASS | 2S/3S/4S/5S/7S → seat 0, 6S → seat 2 accepted; `claim-solved` shown, score 1–0, counts → `6,7,7,10,11,7` |
| 20 | cp3 — Back then forward keeps it solved | PASS | 11/19 → 10/19 → 11/19; score still 1–0, all radios `disabled`, placements retained |
| 21 | **cp4** (step 17, `EIGHTS`) — rows `8C,8D,8H,8S,RJ,BJ` | PASS | same three own-team options per row |
| 22 | cp4 — reveal control works and matches the documented answer | PASS | after 2 wrong claims, `claim-reveal` → 8C/8D/8H = seat 0, 8S/RJ/BJ = seat 4 (Kofi) |
| 23 | Game ends 5–4 to Blue | PASS | `score-blue`=5, `score-red`=4, log "Game over — Blue wins it 5–4." |
| 24 | All nine half-suits resolved, rail agrees with the score | PASS | 9 chips: `LOW-C,LOW-S,HIGH-C,HIGH-H,EIGHTS`=`team0` (5); `LOW-D,LOW-H,HIGH-D,HIGH-S`=`team1` (4); 0 `open`, 0 `void`; no `score-voided` element |
| 25 | Ninth half-suit is marked | PASS | `half-suit-EIGHTS[data-ninth="true"]` |
| 26 | Final step swaps Next for Restart | PASS | `nav-next` absent, `[data-testid="nav-restart"]` = "Start again" |
| 27 | Cheat sheet renders complete | PASS | `[data-testid="cheat-sheet"]`, 6 sections, 54 `[data-card]` (9 half-suits × 6) |
| 28 | `nav-restart` returns to step 1 **and** clears the run | PASS *(after fix D1)* | 1/19, score 0–0, counts `9,9,9,9,9,9`; cp1 back to 4 × `idle`, enabled, Next disabled, no reveal control |
| 29 | Back works across the whole range and stops at step 1 | PASS | 11/19 → 1/19 one step at a time, then `nav-back.disabled === true` |
| 30 | A double/triple tap cannot skip an unanswered checkpoint | PASS | three synchronous `nav-next` clicks at 3/19 land on **4/19**, not 5 or 6 |

### 1.2 Progress persistence (`localStorage: fish-onboarding:progress`)

| # | Check | Result | Evidence |
|---|---|---|---|
| 31 | Cleared storage → starts at step 1 | PASS | `localStorage.clear()` + reload → `1 / 19` |
| 32 | Progress past step 4 → reload resumes there | PASS | advanced to `6 / 19`, stored `{"stepIndex":5}`, reload → `6 / 19` |
| 33 | Saved position older than 2 h is ignored | PASS | `{stepIndex:12, at: now-3h}` → `1 / 19` |
| 34 | Unparseable value is ignored silently | PASS | `'{not json'` → `1 / 19`, no console output |
| 35 | Position before step 4 is not worth resuming | PASS | `{stepIndex:2}` → `1 / 19` |
| 36 | Out-of-range position is clamped, not crashed | PASS | `{stepIndex:99}` → `19 / 19` |

### 1.3 Errors and integrity

| # | Check | Result | Evidence |
|---|---|---|---|
| 37 | Console during a complete 19-step walk | PASS — **0 errors, 0 warnings** | in-page interceptor on `console.error`/`console.warn` + `window.onerror` + `unhandledrejection`; captured array empty across back-to-step-1, all 19 steps, all 4 checkpoints |
| 38 | No React key / `act` / hook warnings | PASS | none captured; see D6 for pre-session buffer noise |
| 39 | Network — no external hosts | PASS | every request in the log is `http://localhost:5174/…`; zero third-party origins, zero font files, zero images beyond the local `favicon.svg` |
| 40 | Network — no 4xx/5xx | PASS | all responses 200 or 304 across 4 full page loads |
| 41 | Dev-server log clean | PASS | `preview_logs` shows only `hmr update` / `page reload` lines; no build or transform errors |
| 42 | `index.html` self-contained | PASS | no CDN links, no webfont, one local `/favicon.svg` |
| 43 | No duplicate DOM `id`s | PASS | `checkpoint-prompt`, `claim-prompt`, `nav-blocked` each appear at most once |
| 44 | Every `role="img"` carries an accessible name | PASS | 0 elements with `role="img"` and no `aria-label` |
| 45 | Landmarks present | PASS | `header`, `main`, `footer`, `nav[aria-label="Guide navigation"]`, labelled `section`s for rail / table / log / hand / checkpoint |
| 46 | Heading order | **PARTIAL** | checkpoint steps are `h1 → h2 → h3`; the other 15 steps are `h1 → h3` (hand group names). See D5 |

### 1.4 Keyboard

| # | Check | Result | Evidence |
|---|---|---|---|
| 47 | Every control is reachable by Tab, in DOM order | PASS | cp1 tab ring: `ask-option-0 → 1 → 2 → 3 → nav-back →` (chrome) `→ ask-option-0`. cp3 tab ring: 6 radio groups (`claim-2S … claim-7S`) `→ nav-back` |
| 48 | Checkpoint controls come **before** navigation in the tab order | PASS | options/radios precede `nav-back`; nothing in header, table or hand is focusable, so the first tab stop on a checkpoint step is the checkpoint itself |
| 49 | Disabled Next is correctly out of the tab order | PASS | `nav-next` absent from the focusable set while blocked |
| 50 | Focus is programmatically visible | PASS | focused control matches `:focus-visible`; UA outline resolves to `auto 1px` (no CSS has suppressed it) |
| 51 | No custom key handling that could break native behaviour | PASS | `grep` over `src/`: zero `onKeyDown`/`onKeyUp`/`onKeyPress`, zero `tabIndex`, zero `role="button"` divs, zero `preventDefault` — all controls are real `<button>` / `<input type="radio">` |
| 52 | `claim-submit` reachable while disabled | **FAIL** | not in the tab order at 0-of-6; see D3 |
| 53 | Focus survives advancing a step | PARTIAL | non-checkpoint steps keep focus on `nav-next`; advancing **onto** a checkpoint drops focus to `<body>`. See D4 |
| 54 | Enter / Space activation, radio arrow keys | **NOT TESTABLE HERE** | the automation harness delivers trusted `keydown` with no native key code, so the browser generates no default action. Proved with a control: a vanilla `<button>` injected into the page also failed to fire `click` on Enter. Must be re-checked by hand — Criterion 30 |

### 1.5 Desktop viewports — structural only

No horizontal overflow, no clipped-to-zero elements, no unreachable content, and no navigation
error at any viewport. `hOver` = `documentElement.scrollWidth > clientWidth`.

| Viewport | clientWidth | Horizontal overflow | Elements past the right edge | Zero-height testids | Steps completed |
|---|---|---|---|---|---|
| 1280×800 | 1265 (15px scrollbar) | none at any of 19 steps | 0 | 0 | 19/19 |
| 1440×900 | 1425 | none | 0 | 0 | 19/19 |
| 1920×1080 | 1920 | none | 0 | 0 | 19/19 |
| 1024×768 | 1009 | none | 0 | 0 | 19/19 |
| 640×400 (≈200% zoom) | 640 | none | 0 | 0 | spot-checked at cp3 |

**Vertical, at 1280×800 (document height vs the 800px viewport).** This is the real desktop
problem and it is entirely a CSS problem — recorded here so Part 3's numbers are grounded:

| Step | header | table | annotation | hand | nav | document |
|---|---|---|---|---|---|---|
| `welcome` | 240 | 168 | 120 | 356 | 112 | 996 |
| `cp1` unanswered | 240 | 168 | 372 | 356 | 112 | 1248 |
| `cp2` unanswered | 240 | 336 | 372 | 328 | 112 | 1388 |
| **`cp3` unanswered** | 240 | 336 | **654** | 376 | 112 | **1718** |
| `cp4` unanswered | 240 | 240 | 630 | 100 | 112 | 1322 |
| `cheat-sheet` | 240 | 240 | 120 | 24 | 112 | 3148 (overlay alone 2412) |

18 of 19 steps exceed 800px today (only `why-nine` fits, at exactly 800). Worst case is
**1718px against an 800px viewport — 918px to remove at `cp3`**. Per-viewport maxima:
1280×800 → 3148, 1440×900 → 3148, 1920×1080 → 3124, 1024×768 → 3172 (all the cheat sheet).

The claim sheet specifically, at 1280×800 scrolled to top: `claim-rows` is **406px tall
(6 rows × 68px)** starting at y=756, so it ends 362px below the fold; `claim-submit` sits at
y=1186 and the nav footer at y=1606. That is the measurement Criterion 6 has to beat.

---

## 2. Defects found

### D1 — "Start again" replayed the guide with every checkpoint pre-answered — **FIXED**

**Severity: Medium.** Reproduction (before the fix): finish the guide to 19/19, click
`[data-testid="nav-restart"]`, then Next ×3. Step 4 arrived with all four
`button[data-testid^="ask-option-"]` `disabled`, option 3 already `data-state="correct"`,
`checkpoint-reveal-text` visible and `nav-next` enabled. The same held for all four
checkpoints; both claim sheets came back with their radios `disabled` and the answers filled
in. A second run of the guide had no interaction left in it at all — which is exactly the
club-table case where one laptop is handed to the next person.

Cause: `restart` in `src/tutorial/useTutorial.ts` was `useCallback(() => setStepIndex(0), [])`.
It moved the index and left `solved`, `solvedRef` and the working answers untouched.

Fix: `restart` now clears `solvedRef`, `solved` and the working state together with the index.
`npm run verify` passes afterwards — typecheck, lint, 81/81 tests. Re-verified in the browser
(row 28 above).

### D2 — Only the last four log entries are ever rendered, and the rest are unreachable — **NOT FIXED**

**Severity: Medium.** `src/App.tsx` renders `<LogPanel entries={log} limit={4} />`. Measured
against the script (`replay()` + `logVM`): at **cp3 the log holds 16 public events and shows
4**; at **cp4 it holds 31 and shows 4**; at the end it holds 35 and shows 4. There is no
disclosure control anywhere — `[data-testid="log"]` has no expander, and the log sheet
described in `MOBILE_SPEC.md` §4.7 does not exist yet — so 12 to 31 events are simply
unreachable on every viewport.

This contradicts the component's own contract (`LogPanel.tsx`: *"The guide's checkpoints are
only solvable because this is on screen, so it is never hidden behind an interaction on
desktop"*) and the claim checkpoints' teaching premise. In practice the guide stays solvable
because the annotation copy narrates the montages and `claim-hints` opens after one wrong
attempt — that is why this is Medium and not High.

Left in place deliberately: *how much* history is visible is a layout budget, and it should
come from a CSS scroll clamp the designer owns, not from a JS `.slice()` that CSS cannot
undo. Recommended fix, to be taken together: drop the `limit` prop in `App.tsx`, and clamp
`.entries` in `LogPanel.module.css` with `max-block-size` + `overflow-y: auto`. Criterion 12.

### D3 — `claim-submit` is unreachable and unexplained while disabled — **NOT FIXED**

**Severity: Medium for assistive tech, Low for a sighted keyboard user.**
`src/components/ClaimSheet.tsx` uses `disabled={!canSubmit}`. Measured at cp3 with 0 of 6
placed, the tab stops are the six radio groups and then `nav-back` — the submit button is not
in the tab order at all, so nothing announces why the claim cannot be made. The only cue is
`[data-testid="claim-progress"]` ("0 of 6 placed"), which is a count, not an instruction.

`MOBILE_SPEC.md` §5.5.3 is explicit and applies to desktop equally: *the disabled state must
state why in visible text, and the button must remain focusable (`aria-disabled`, not the
`disabled` attribute)*. `[data-testid="nav-next"]` has the same shape: `disabled` plus
`aria-describedby="nav-blocked"`, where the sr-only explanation can never be reached because a
disabled button never takes focus.

Left in place: the correct fix adds user-visible copy ("Assign all 6 cards to continue"),
which is a content decision, and a half-fix (`aria-disabled` with no visible reason) would
produce a button that looks live and does nothing. Criteria 26 and 27.

### D4 — Advancing onto a checkpoint drops focus to `<body>` — **NOT FIXED**

**Severity: Low today, Medium the moment the DOM above the checkpoint gains a focusable
control.** Reproduction: at step 3 focus `[data-testid="nav-next"]` and activate it. The step
becomes `cp1`, Next becomes `disabled`, and `document.activeElement` is `<body>`. Same at step
18 → 19, where `nav-next` unmounts and `nav-restart` mounts. On the 15 ordinary steps focus
correctly stays on `nav-next`.

The recovery today is a single Tab, because nothing in the header, table or hand zone is
focusable, so the first tab stop is `ask-option-0`. That property is accidental: add one
focusable control above the checkpoint — a log expander (D2), a cheat-sheet shortcut — and the
keyboard user is thrown to the top of the page four times per run. Criterion 28.

### D5 — Heading level skips from `h1` to `h3` on the 15 non-checkpoint steps — **NOT FIXED**

**Severity: Low.** `Annotation` renders the step title as `h1`; `HandFan` renders each
half-suit group name as `h3`. On a checkpoint step the checkpoint's `h2` sits between them and
the outline is clean; on the other 15 steps there is no `h2`, so the outline reads `h1 → h3`.
Left alone because closing the gap means either re-levelling the hand headings (which changes
their weight relative to the checkpoint question) or adding a visible section heading — both
design decisions. Criterion 25.

### D6 — Environment note: a stale empty module transform, not an app defect

At the start of this pass the app rendered an empty `#root`. `GET
/src/tutorial/useTutorial.ts?t=1787286341551` returned **200 with `ETag:
W/"0-2jmj7l5rSw0yVb/vlWAYkK/YBwk"` — the ETag of a zero-byte body** — and the console showed
`SyntaxError: The requested module '/src/tutorial/useTutorial.ts' does not provide an export
named 'savedStartIndex'`. The file on disk was complete. A concurrent process was rewriting
files in this worktree (`CODEX_HANDOFF.md`, `CURRICULUM.md` and `README.md` all reappeared
mid-session), and Vite had cached a transform read while one file was momentarily zero bytes.

Cleared by touching the source file, which issues a fresh HMR timestamp. **If the app ever
renders a blank page after a git operation, this is why** — touch a file under `src/` or
restart the dev server. Nothing in the application code is implicated.

The pre-existing console errors in the buffer (`React has detected a change in the order of
Hooks` / `Rendered more hooks than during the previous render`) are timestamped 21:23–21:25,
before this pass, and are the ordinary Fast Refresh artefact of editing a hook file with the
app mounted. They did not recur in any clean load.

### D7 — Informational: `MOBILE_SPEC.md` says 26 steps; the app has 19

`MOBILE_SPEC.md` §0 and §11 refer to "step 1 of 26" and "all 26 steps", and its URL contract
specifies `/step/1 … /step/26`. The shipped script is 19 steps (`CODEX_HANDOFF.md` §1 agrees),
and there is no router — the current step is not reflected in the URL at all. Neither file is
editable from here; flagged so the numbers are not taken literally when the mobile criteria
are worked through.

### D8 — Informational: `savedStartIndex()` runs on every render

`src/App.tsx` calls `useTutorial(savedStartIndex())`, so every render of the root component
does a synchronous `localStorage.getItem` + `JSON.parse` whose result `useState` discards
after mount. Behaviour is correct and the cost is negligible at this scale. No change made.

---

## 3. Desktop acceptance criteria

Run at **1280×800** unless an item names another size, in a browser at 100% zoom, with the
guide driven from step 1 to step 19. Every item is objectively pass/fail. Items marked
*(regression)* are passing today and must not be broken by the design.

### Fit — the desktop layout problem

1. At **1024×768, 1280×800, 1440×900 and 1920×1080**, at every one of the 19 steps and with
   every checkpoint both unanswered and answered, `document.documentElement.scrollWidth` is
   **equal to** `clientWidth`. No horizontal page scrollbar appears at any point.
   *(regression — true today at all four sizes)*
2. At **1280×800**, on all 19 steps, `document.documentElement.scrollHeight ≤ clientHeight`:
   the document itself never scrolls. Today 18 of 19 steps fail this, with a worst case of
   1718px against 800px.
3. At 1280×800, on every step, the five zones — `[data-zone="header"]`, `"table"`,
   `"annotation"`, `"hand"`, `"nav"` — all have a non-zero height and all lie fully inside the
   viewport rectangle at the same time, with no scrolling and no overlap. Checked by
   `getBoundingClientRect()`: every zone's `top ≥ 0` and `bottom ≤ 800`.
4. Same as 3 at **1024×768** (the supported floor), where the budget is 768px.
5. Zone heights are **stable between steps**: for any two consecutive steps at 1280×800, the
   heights of the header, table, hand and nav zones each change by **0px**. Only
   `[data-zone="annotation"]` may change height. (`CODEX_HANDOFF.md` §3, structural rule 1.)
6. At 1024×768 and above, on both claim checkpoints, all **six** `[data-testid="claim-rows"] >
   li` elements are simultaneously inside the viewport, together with `[data-testid="claim-submit"]`
   and `[data-testid="claim-progress"]`. No row is reachable only by scrolling, and the sheet
   contains no internal scroll container that can hide a row. (`CODEX_HANDOFF.md` §3,
   structural rule 2.) Today the block is 406px tall and ends 362px below the fold.
7. On both ask checkpoints at 1024×768 and above, all four `button[data-testid^="ask-option-"]`
   are simultaneously inside the viewport along with `[data-testid="nav-next"]`.
8. Where a zone's content genuinely cannot fit — the cheat sheet is the only expected case —
   the overflow is **inside that zone's own scroll container**, not the document. The
   `<body>`/`<html>` scroll height still satisfies criterion 2 while that container scrolls.
9. At 1280×800 with browser zoom at **200%** (effective 640×400 CSS px), there is still no
   horizontal page scroll and no control is clipped out of reach.
   *(regression — 640×400 passes today)*
10. No element anywhere has a computed `right` beyond `documentElement.clientWidth` at any of
    the four viewports. *(regression — 0 such elements today)*
11. No element carrying a `data-testid` renders with a computed height of 0 at any step or
    viewport. *(regression — 0 today)*

### Content that must remain reachable

12. The public log is fully reachable on desktop: either every entry `logVM` produces is
    rendered, or `[data-testid="log"]` provides a visible, keyboard-operable control that
    reveals the rest. Concretely, at step 11 the learner can reach **all 16** log entries and
    at step 17 **all 31**. See D2 — this needs the `limit={4}` prop dropped from `App.tsx` as
    well as CSS, so raise it rather than working around it.
13. All six seats `[data-testid="seat-0…5"]` and all six counts `[data-testid="count-0…5"]`
    are visible at every step without interaction. A seat that is out shows `—` and remains
    visible; it is not removed or hidden. *(regression)*
14. All nine `[data-testid="half-suit-*"]` chips are visible at every step, and each chip's
    state (`open` / `team0` / `team1` / `void`) is distinguishable without colour — by glyph,
    shape, weight or text. The ninth (`[data-ninth]`) is distinguishable from the other eight.
15. The learner's whole hand is visible without scrolling or interaction at every step: at
    1280×800, `[data-testid="hand"]` shows all `[data-card]` elements it is given (9 at the
    deal, peaking at 11). No horizontal scroller, no "+3 more".
16. `[data-testid="annotation"]`'s full body text is visible without truncation at 1280×800 on
    all 19 steps. No `text-overflow: ellipsis`, no `-webkit-line-clamp` on
    `[data-testid="step-body"]`.
17. Every card face keeps a rank glyph **and** a suit glyph at every size used on desktop; the
    two jokers stay distinguishable from each other without colour. (`CODEX_HANDOFF.md` §4.1–2.)
18. On the final step, `[data-testid="cheat-sheet"]` renders all nine half-suits and all 54
    card faces, and every one of its six sections is reachable by scrolling that panel.
    *(regression — 54 cards today)*

### Interaction — pointer

19. Every control listed in the selector contract responds to a single click at every viewport:
    `nav-next`, `nav-back`, `nav-restart`, the four `ask-option-*`, all 18 `claim-*-seat-*`
    labels per claim, `claim-submit`, `claim-reveal`, `checkpoint-reveal`, `claim-hints`.
    *(regression — all confirmed today)*
20. No two interactive controls overlap: for every pair of focusable elements, either their
    bounding boxes do not intersect, or the pair is a `<label>` and the `<input>` it wraps.
21. Clicking a `claim-*-seat-*` label anywhere in its box selects that seat's radio — the
    whole label is the target, not just the dot. *(regression — label clicks work today)*
22. Every control is at least **44×44px** with at least 8px between adjacent ones, at all four
    desktop viewports. (`CODEX_HANDOFF.md` §4.3; `index.css` already sets the floor — do not
    override `min-block-size`/`min-inline-size` on `button` below it.)
23. `[data-testid="nav-next"]` is visibly distinguishable in its disabled state, and that
    difference is not carried by colour alone.
24. The progress readout survives styling: `[data-testid="progress"]` stays `aria-hidden`, and
    its fill is driven by an inline `inline-size` percentage that CSS must not override (see
    `CODEX_HANDOFF.md` §6).

### Interaction — keyboard and assistive tech

25. Tabbing from the top of the document reaches every interactive control on the current step
    with no stop skipped and no trap, in an order that matches the visual order at 1280×800.
    Today the DOM order is checkpoint-first, then `nav-back`; if the design moves navigation
    above the checkpoint visually, the DOM must move with it. Also close the `h1 → h3` heading
    gap (D5) or leave the outline unchanged — do not deepen it.
26. `[data-testid="claim-submit"]` is **focusable while it cannot yet be used** (`aria-disabled`,
    not the `disabled` attribute), and a visible sentence states why — e.g. "Assign all 6 cards
    to continue". (`MOBILE_SPEC.md` §5.5.3; fails today — D3.)
27. The same applies to `[data-testid="nav-next"]` while a checkpoint is unanswered: the reason
    it is blocked is available to a keyboard user who lands on it, not only in an `aria-describedby`
    string attached to an unfocusable element.
28. Activating Next onto a checkpoint step leaves focus somewhere inside
    `[data-testid="checkpoint-ask"]` or `[data-testid="checkpoint-claim"]`, not on `<body>`.
    (Fails today — D4. It is currently masked by there being nothing focusable above the
    checkpoint; if the design adds one, this becomes required, not optional.)
29. Every focusable element has a focus indicator with **at least 3:1 contrast** against its
    adjacent background, at least 2px thick, visible in both light and dark schemes, and
    visible on the radio inputs specifically — `[data-testid^="claim-"] input[type=radio]` must
    never be `opacity: 0` or `appearance: none` without a replacement indicator on the label.
    (`CODEX_HANDOFF.md` §4.6.) No rule anywhere sets `outline: none` without a replacement.
30. **Keyboard-only completion, verified by hand with no mouse:** from step 1, reach step 19
    and solve all four checkpoints using only Tab / Shift-Tab, arrow keys and Enter/Space.
    Specifically: arrow keys move and select within each `claim-<CARD>` radio group; Space or
    Enter activates every `<button>`. This could not be exercised by automation (row 54) and
    must be re-checked manually after any change to the controls.
31. Selecting a seat in a claim row keeps focus in that row — choosing a radio must not move
    focus, scroll the sheet, or collapse a row.
32. `[data-testid="claim-progress"]`, `[data-testid="claim-error"]` and the ask checkpoint's
    feedback remain in live regions after styling: none of them is `display: none` while
    active, and none is moved out of the accessibility tree by `aria-hidden` on an ancestor.

### State and integrity

33. A complete run at each of the four viewports produces **zero** console errors and zero
    warnings. *(regression — 0/0 today across a full 19-step walk)*
34. A complete run issues **zero** requests to any host other than the app's own origin, and no
    request returns 4xx or 5xx. Zero webfont files unless one subset face is deliberately added
    within the byte budget; zero raster images. *(regression — 100% same-origin today)*
35. After any CSS change, `npm run verify` still passes: typecheck, lint, 81/81 tests.
36. `nav-restart` returns the guide to step 1 with every checkpoint unanswered and re-answerable.
    *(regression — fixed in D1; the check is that step 4's options are `data-state="idle"` and
    enabled after a restart)*
37. Solved state survives navigation: solving a checkpoint, going Back and returning shows the
    same answer, still solved, with `nav-next` enabled. *(regression)*
38. Clearing `localStorage` and reloading starts at `1 / 19`; advancing past step 4 and
    reloading resumes at the same step. *(regression)*
39. Three rapid activations of `nav-next` immediately before a checkpoint advance exactly one
    step. *(regression)*
40. The game still ends **5–4 to Blue** with all nine half-suits resolved and the rail matching
    `score-blue` / `score-red`. *(regression — any change that breaks this is a change to the
    script or engine, which are off limits)*

### Print and take-away

41. `[data-testid="cheat-sheet"]` prints from a desktop browser onto **one or two** A4/Letter
    pages with nothing clipped and nothing lost — suits still readable in greyscale, the void
    outcome still distinguishable from a win and a loss.
42. The print stylesheet drops the shell chrome: `[data-zone="header"]`, `"table"`, `"hand"`
    and `"nav"` do not appear in the printed output, and no `position: fixed` element repeats
    across pages. Printing forces a light scheme. (`MOBILE_SPEC.md` §10.2.)
43. All cheat-sheet text is selectable and copyable — no `user-select: none` anywhere in that
    subtree.
