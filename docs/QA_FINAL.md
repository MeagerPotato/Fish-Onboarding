# QA_FINAL.md — final accessibility and acceptance audit

Audited against `docs/MOBILE_SPEC.md` §11 (65 criteria) and `docs/QA_DESKTOP.md` Part 3 (43
criteria) — **108 objectively pass/fail items** — plus `DESIGN_BRIEF.md` §4 (the accessibility
floor) and `RULES.md` §6 (the variant the interface asserts).

| | |
|---|---|
| Build under test | dev server, `http://localhost:5174`, Vite 8.2.2, React 19 (StrictMode) |
| Date | 2026-08-21 |
| Viewports exercised | 320×568, 375×650, 414×736, 640×400, 718×1024, 768×1024, 960×700, 1024×768, 1280×800, 1440×900, 1920×1080 |
| Schemes | light and dark, full 19-step walk in each |
| Driven by | DOM measurement, `getBoundingClientRect`, CSSOM, `document.elementFromPoint`, `PerformanceObserver`, computed styles. **No screenshots** — see §0.1 |
| Result | **85 PASS · 7 FAIL · 3 PARTIAL · 5 N/A (superseded) · 8 UNTESTABLE HERE** |
| After fixes | `npm run verify` green (typecheck + lint + **86/86 tests**); bundle **79.99 KB gzipped** against a 98 KB budget |

---

## 0. How this pass was run, and what it could not do

### 0.1 The pane does not composite

`computer{action:"screenshot"}` fails with *"the Browser pane is not displayed, so the page is
not compositing frames."* Nothing in this app has ever been seen by a human or by a model. Every
statement below is therefore a **measurement**, not an impression: a number, a selector, or a
resolved computed value.

Two consequences were worked around rather than ignored:

* **CSS transitions never advance.** Computed colours and rects read frozen at the `from`
  keyframe. Before every measurement this pass calls
  `document.getAnimations().forEach(a => a.finish())`. Without it the shell reads as a 16px
  vertical offset on three zones — the frozen `translateY(var(--dg-rise-zone))` of `zoneIn` —
  which looks exactly like a real overlap bug and is not one.
* **Contrast was computed, not sampled.** WCAG 2.x ratios are computed from resolved `rgb()`
  values with alpha composited against the real ancestor background stack. Greyscale is reported
  as Rec.709 luma (`0.2126R + 0.7152G + 0.0722B`) of the same resolved values, alongside the
  non-colour channels that survive with it.

### 0.2 Keyboard activation is a proven harness limitation, not an app defect

The previous pass could not test Enter/Space. This pass re-tested it and **proved the cause with
a vanilla `<button>` probe**, so the finding cannot be confused with an app problem:

```js
const p = document.createElement('button');   // plain, unstyled, no framework
p.addEventListener('keydown', e => log(e));
p.addEventListener('click',   () => clicks++);
p.focus();                                     // then: computer{action:"key", text:"Enter"}
```

Observed: `KeyboardEvent { key: "Enter", code: "", keyCode: 0, which: 0, isTrusted: true }`
and **`clicks` stayed at 0**. Space behaved identically. Blink's default activation behaviour for
`<button>` requires a native virtual key code, which this harness does not set. Arrow keys were
tested on a real radio group (`input[name="claim-3S"]`) with `Right` and `ArrowRight`: the
selection did not move and no `keydown` reached the document.

`Tab` worked in exactly one window — immediately after a ref-based mouse click — and moved focus
`button#__probe → button[data-testid="nav-next"]` with a measured
`outline: 3px solid rgb(224,145,42)` at `outline-offset: 2px`. It has not worked since; a
document-level capturing `keydown` listener recorded **zero** events on later attempts.

**Therefore:** QA_DESKTOP criterion 30 (keyboard-only completion by hand) is **UNTESTABLE in this
environment** and must be exercised by a human on real hardware. What *was* verified instead, and
what makes the criterion very likely to hold, is in §4.

### 0.3 Hidden-tab timer throttling

`document.visibilityState === "hidden"` for the whole session, so `setTimeout` is throttled to
roughly one callback per second and a scripted 19-step walk took minutes. The driver was rewritten
to yield through `MessageChannel` (which is not timer-throttled, and is also React's own scheduler
channel); a full instrumented walk then completes in under 30 s. Mentioned only because it shaped
the method, not the findings.

---

## 1. Defects found, ranked

| # | Severity | Defect | Criteria | Status |
|---|---|---|---|---|
| **D1** | **High** | Seat ring starved by the log and clipped out of its zone. At 1024×768 the log took 353px of the 420px table zone, leaving the ring 59px against a 120px minimum; the top three seat tokens sat 29–31px above the zone's clip edge and Mia's, Dana's and Kofi's **names were cut in half on 13 of the 19 steps**. Same at 320–414px (12–14px cut) from the first two-entry step onward. | QA 13, MS 20 | **FIXED** |
| **D2** | **High** | Claim sheet overflowed the annotation scrollport on desktop. 741px of content in a 584px column at 1280×800 (157px over) and 733px in 552px at 1024×768 (181px over): rows 5 and 6 clipped, `claim-progress` and the whole `claim-submit` button below the fold. | QA 6, MS 23 | **FIXED (desktop)** |
| **D3** | **High** | `ask-option-3` — the correct answer on checkpoint 1 — sat 49px below the annotation fold at 1024×768 and 1280×800. Answering required scrolling to find the right answer. | QA 7 | **FIXED** |
| **D4** | Medium | `user-select: none` on `.card` made every card rank and suit unselectable, including all 54 faces in the printable cheat sheet (162 elements in that subtree). | MS 41, MS 54, QA 43 | **FIXED** |
| **D5** | Medium | The 11-card hand overflowed its strip on desktop: 514px of cards in a 496px column at 1280×800 and 512px at 768×1024, so the last card was off the right edge behind a scroller. | QA 15 | **FIXED** |
| **D6** | Medium | Suit glyphs rendered at **13.2px** in the 360–413px band (`--dg-card-md: 30px × 0.44`), 0.8px under the 14px floor. The 12px relaxation only covers 320px. | MS 19 | **FIXED** |
| **D7** | Low | The score separator `–` used `--dg-rule`, the *border* token: **3.30:1** light, **3.41:1** dark, against a 4.5:1 requirement at 15px/600. Exactly the "fill colour used as text" failure the three-way accent split exists to prevent. | MS 38, DB §4.8 | **FIXED** |
| **D8** | Low | The phone half-suit chip's team badge (`::before` → `"B"` / `"R"`) rendered at a hard-coded **11px**, below the 13px type floor. Chrome exposes generated content to assistive tech, so it is text. | MS 37 | **FIXED** |
| **D9** | **High** | **Claim sheet on phones still overflows.** At 375×650 the claim needs 346px more than the annotation scrollport (271px at cp4); at 320×568, 455px. All six rows are reachable only by scrolling, with a sticky submit over them. | MS 23 | **OPEN** |
| **D10** | Medium | **No `<noscript>` fallback and no slow-load recovery.** `index.html` is `<div id="root">` plus a module script. With JS blocked the page is blank; with the entry delayed past 8 s there is no "Still loading" message and no Retry. | MS 8, MS 9 | **OPEN** (file out of scope) |
| **D11** | Medium | **No URL routing.** Progress lives only in `localStorage`; `savedStartIndex()` never reads the URL. `/step/17` renders step 1. Contradicts MOBILE_SPEC §0 ("progress lives in `localStorage` **and in the URL**"). | MS 50 | **OPEN** |
| **D12** | Low | **Resume has no dismissible bar.** Reopening within 2 h correctly restores step 12, but nothing tells the learner they were moved and nothing offers to start over. | MS 46 | **OPEN** |
| **D13** | Low | **The cheat sheet does not fit one 375×650 screenshot** — it is 1352px tall at 375px wide and scrolls inside `[data-zone="overlay"]`. | MS 51 | **OPEN** |
| **D14** | Low | At **960×700** (below the named desktop floor) `claim-submit` still sits 53–80px below the annotation fold. Every named viewport passes. | — | **OPEN** |
| **D15** | Low | Focus after a step change lands on `h1[data-testid="step-title"]`, not inside `checkpoint-ask` / `checkpoint-claim`. The underlying D4-from-the-last-pass defect (focus on `<body>`) is fixed; the literal criterion is not met. | QA 28 | **OPEN by design** |
| **D16** | Low | Checkpoint 1's four candidate asks cover **three** distinct engine error codes, not four. `TARGET_OUT` is stated in prose but never offered as an option. | MS 65 | **OPEN** |

---

## 2. What was changed

Eight `*.module.css` files. No `.tsx`, no engine, no script, no tests. `npm run verify` was run
after every change and stayed green (86/86).

| File | Change | Why |
|---|---|---|
| `AppShell.module.css` | `.table` grid rows `minmax(0,1fr) auto` → **`auto minmax(0,1fr)`** | The ring is sized first; the log absorbs the remainder. As the `auto` track the log always took its own maximum (4rem phone, 46svh desktop) and the ring got the scraps. Fixes **D1**. |
| `TableView.module.css` | `.seats` gains `min-block-size: calc(var(--seat) * 2 + var(--dg-u4))` (128px), raised to `calc(var(--dg-zone-table) - var(--dg-u5))` (180px) at ≥60rem | States the ring's floor where the geometry lives: 2·ry + one token + 16px of caret clearance. Fixes **D1**. |
| `ClaimSheet.module.css` | at ≥60rem: `.rows` → 2 columns; `.sheet` gap/padding → `--dg-u2` | Halves the rows block from 316px to 154px without shrinking a target (min segment 53×44 at 1024, 60×44 at 1280). Fixes **D2**. |
| `AskChoice.module.css` | at ≥60rem: `.options` → 2 columns + `align-items: start`; `.choice` gap/padding → `--dg-u2` | Halves the options block from 307px to 150px; each option keeps 212px of width at the 1024 floor. Fixes **D3**. |
| `PlayingCard.module.css` | removed `user-select: none` from `.card`; `.suit` ratio 0.44 → **0.47** | `touch-action: manipulation` already handles double-tap zoom, which is all `user-select: none` was buying. Fixes **D4** and **D6**. |
| `HandFan.module.css` | `--dg-card-md` at ≥768px: 44px → **40px** | 768px is where the shell stops being full-width (560px tablet, then a 496px column). 11×44 + gaps = 514px; 11×40 + gaps = 470px. Fixes **D5**. |
| `ScoreRail.module.css` | `.sep` `--dg-rule` → `--dg-soft`; phone badge `11px` → `var(--dg-label)` | 5.47:1 light / 5.78:1 dark; 13px type floor. Fixes **D7** and **D8**. |
| `LogPanel.module.css` | comment only — the caps are now ceilings, not floors | The ring takes its minimum first, so neither `4rem` nor `46svh` can starve it. |

### 2.1 Before and after, measured

| Measurement | Before | After |
|---|---|---|
| Seat names clipped, 1024×768 | 3 seats × 23.6–25.2px, on 13 of 19 steps | **0** |
| Seat names clipped, 320/375/414 | 3 seats × 7–8.6px, from step 5 on | **0** |
| Seat ring height, 1024×768 | 180px → **59px** once the log filled | **180px, constant on all 19 steps** |
| Claim overflow, 1024×768 | 181px; rows 5–6, progress and submit below the fold | **0px**; `rowsInScrollport: true`, `submitIn: true` |
| Claim overflow, 1280×800 | 157px | **0px** |
| Ask overflow, 1024×768 | 73px; `ask-option-3` 49px below the fold | **0px**; all four options in the scrollport |
| Hand strip overflow, 1280×800 | 514px in 496 — 1 card off-edge | **0** (470px in 496) |
| Hand strip overflow, 768×1024 | 514px in 512 — 1 card off-edge | **0** |
| Cards with `user-select: none` in the cheat sheet | **162** | **0** |
| Suit glyph, 375px | 13.2px (floor 14px) | **14.1px** |
| Minimum generated-content size, phone | **11px** (floor 13px) | **13px** |
| Contrast failures, full walk, light @1280 | 1 (`.sep`, 3.30:1) | **0** |
| Contrast failures, full walk, dark @375 | 1 (`.sep`, 3.41:1) | **0** |
| `npm run verify` | 86/86 | **86/86** |
| Bundle, gzipped | 79.99 KB | **79.99 KB** |

---

## 3. Criterion-by-criterion — `MOBILE_SPEC.md` §11 (65)

`MS` numbers are that document's numbering. Evidence is a measured value unless marked otherwise.

### Entry and load

| # | Criterion | Result | Evidence |
|---|---|---|---|
| 1 | QR opens at step 1, no splash, no consent | **PASS** (proxy) | Loading the URL with storage cleared renders `progress="1 / 19"`, `[data-testid="annotation"][data-step="welcome"]`; no interstitial or consent element in the DOM. No QR to scan here. |
| 2 | Readable text within 1.8 s @1.6 Mbps/300ms | **UNTESTABLE** | No network throttling and no paint timing in a non-compositing tab. Total first-load transfer is 79.99 KB (see 4). |
| 3 | Heading + body + Next within 3.5 s, same link | **UNTESTABLE** | Same reason. |
| 4 | Cold first load ≤ 120 KB compressed (target ≤ 98) | **PASS** | `dist` gzip -9: js 73,785 + css 7,448 + html 433 + favicon 248 = **81,914 B = 79.99 KB**. |
| 5 | Uncompressed JS ≤ 350 KB | **PASS** | 236,761 B = **231.2 KB**. |
| 6 | Zero font files, zero raster images | **PASS** | `dist` contains only `.js`, `.css`, `.html`, `favicon.svg`. `find` for any other extension: none. |
| 7 | Network blocked after load: 19 steps, 4 checkpoints, cheat sheet, zero requests | **PASS** | `performance.getEntriesByType('resource')`: **47 before the walk, 47 after** — 0 new. 0 cross-origin. |
| 8 | JS blocked → `index.html` still paints a heading and a sentence | **FAIL** | `index.html` body is `<div id="root"></div>` + module script. `grep -c noscript dist/index.html` = **0**. Blank page. **D10** |
| 9 | JS delayed past 8 s → "Still loading" + working Retry | **FAIL** | No such markup anywhere in `index.html` or the bundle. **D10** |

### Viewport and chrome

| # | Criterion | Result | Evidence |
|---|---|---|---|
| 10 | Viewport meta exact; zero `user-scalable`/`maximum-scale` in the build | **PASS** | Meta is `width=device-width, initial-scale=1, viewport-fit=cover`. `grep -ric 'user-scalable\|maximum-scale' dist` = **0 in all 5 files**. |
| 11 | Pinch-zoom to ≥200% on every screen and inside every sheet | **PASS** (proxy) | Nothing disables it (10); `html { -webkit-text-size-adjust: 100% }`; no `touch-action: none` anywhere. No pinch gesture available to this harness. |
| 12 | Annotation scrolling does not collapse the iOS toolbar or resize the shell | **UNTESTABLE** | No iOS Safari. Structural support: shell is `100svh` (not `dvh`), and the document itself never scrolls — `scrollHeight == clientHeight` on all 19 steps at every non-compact viewport. |
| 13 | No interactive element within 34px of the bottom on a home-indicator device | **UNTESTABLE** | `env(safe-area-inset-bottom)` resolves to `0px` here; no notch emulation. Structural support: `.nav { padding-block-end: var(--safe-b) }`. |
| 14 | Landscape phone → compact scroll mode, no rotate prompt, no orientation lock | **PASS** | 640×400: `matchMedia('(height < 35rem)').matches === true`; page scrolls (`vS` 143–1873); `hS = 0` on all 19; no rotate-prompt element; no Screen Orientation API use in `src`. |
| 15 | 200% OS text scaling → compact scroll mode, nothing clipped, everything reachable | **UNTESTABLE** (mechanism sound) | `rem` in a media query resolves against the browser's **default** font size, which cannot be changed from page script; setting `html { font-size: 32px }` does not move `35rem`. Measured under that page-level 2× instead: compact mode does **not** engage, but `hS = 0`, 0 targets under 44px, 0 contrast failures, 0 seat clipping, and all 19 steps + 4 checkpoints complete. Needs a real device or a browser font-size setting change. |

### Layout

| # | Criterion | Result | Evidence |
|---|---|---|---|
| 16 | 320px: no horizontal scrollbar, nothing clipped, all 19 steps | **PASS** | `scrollWidth − clientWidth = 0` on all 19. 0 clipped seats (was 3 × 13 steps). Cards outside the hand strip: 0 vertically; 2 horizontally at the 11-card steps, inside `.groups { overflow-x: auto }`. |
| 17 | 375×650: shell does not scroll as a whole | **PASS** | `scrollHeight − clientHeight = 0` on all 19. Only `[data-zone="annotation"]` and `[data-zone="overlay"]` are scroll containers. |
| 18 | All 9 hand cards visible at once, no scrolling, 320px | **PASS** | At the deal: 9 cards, 0 outside the strip, `.groups.scrollWidth === clientWidth` (not scrollable). |
| 19 | Ranks ≥16px; suits ≥14px (≥12px at 320) | **PASS** (fixed) | 320px: rank **16.0**, suit **12.69**. 375px: rank **16.8**, suit **14.1** (was 13.2 — **D6**). 1280px: 22.4 / 18.8. |
| 20 | All 6 seats, 6 counts, active marker visible and legible at 320px | **PASS** (fixed) | 0 seats outside the table zone on any of the 19 steps. Was: seat-2/3/4 cut 12.4–14px, with 7–8.6px of each 14.9px name gone. **D1** |
| 21 | CLS ≤ 0.05 across a full run | **PASS** | `PerformanceObserver({type:'layout-shift', buffered:true})` over all 19 steps: **0 entries, CLS 0.0000**. Corroborated by zone heights: header/table/hand/nav identical on every step. |
| 22 | No zone-height change other than annotation | **PASS** | 1280×800: header 120 / table 452 / hand 132 / nav 64 on every step. 1024×768: 120/420/132/64. 375×650: 57.5/164/104/56. 320×568: 57.5/164/104/56. |

### Claim checkpoint

| # | Criterion | Result | Evidence |
|---|---|---|---|
| 23 | All 6 rows and assignments at once, no scrolling, 375×650 | **FAIL** | Annotation scrollport vs claim content: 375×650 **346px over** (cp4 271px); 320×568 **455px over** (383px port, 838px content), 6 of 6 rows outside it. Desktop is fixed (**D2**); phone is **D9**. |
| 24 | Every segment ≥44×44 at 320px | **PASS** | Minimum `label` box across all 18 segments: **80.66 × 44.0** at 320px; 96×44 at 375; 141×44 at 768; 53×44 at 1024; 60×44 at 1280. |
| 25 | Complete claim in exactly 6 taps | **PASS** | One radio per row, six rows; driving six `input.click()` calls takes `claim-progress` from "0 of 6 placed — 6 still to go" to "6 of 6 placed" and enables submit. |
| 26 | Changing an assignment takes 1 tap | **PASS** | Native radio group per card (`name="claim-2S"` … `"claim-7S"`); selecting another segment replaces the choice with one activation. |
| 27 | Submit unavailable until all 6 placed, with a visible text explanation | **PASS** | `aria-disabled="true"`, no `disabled` attribute, `tabIndex 0`, `aria-describedby="claim-progress"` → a **visible** 13px line reading "0 of 6 placed — 6 still to go". |
| 28 | Wrong claim revisable, no limit, no dead end | **PASS** | Radios stay enabled after a wrong submit; `claim-error[role=alert]` appears; `claim-hints` after one attempt, `claim-reveal` after two. |
| 29 | Holder options are the learner plus two teammates only | **PASS** | Every row renders exactly `You`, `Mia`, `Kofi`. `claimRowsVM` filters `PLAYERS` by `p.team === seatTeam(YOU)`; no opponent seat can appear. |

### Touch and input

| # | Criterion | Result | Evidence |
|---|---|---|---|
| 30 | Every interactive element ≥44×44, adjacent ≥8px apart | **PASS** (with one noted exception) | DOM sweep of `getBoundingClientRect` over every `button`/`label:has(radio)`/`summary` at 320, 375, 414, 640, 768, 960, 1024, 1280, 1440, 1920: **0 elements below 44×44 at any viewport, on any step**. The only 0px adjacency is between the three segments *inside* one claim row — that is the segmented control MOBILE_SPEC §5.4 specifies, and each segment is ≥80px wide at 320px. Distinct controls are ≥8px apart everywhere. |
| 31 | Visible pressed state within 100ms | **PASS** (source) | `:active` rules with `transform: scale(var(--dg-press))` or a ground change on `.submit`, `.reveal`, `.hintsSummary`, `.seatOption`, `.optionButton`, `.back`, `.next`, `.seatButton`. `--dg-fast` is 120ms, zeroed under reduce. |
| 32 | Double-tapping a button does not zoom | **PASS** | `touch-action` computed over every `button`/`label`/`summary` in the app: the set is exactly `["manipulation"]`. |
| 33 | Horizontal swipes anywhere do not change step | **PASS** | Zero `ontouchstart`/`onpointerdown` attributes in the DOM; `grep` for `onKeyDown|onKeyUp|onKeyPress|preventDefault` across `src/` returns only a prose comment. No gesture code exists. |
| 34 | No action requires a long-press | **PASS** | No `contextmenu` or press-and-hold handler anywhere; every action is a click on a native control. |
| 35 | Back closes a sheet without changing step; second back changes step | **N/A** | There is no modal sheet. Checkpoints render inline in the annotation zone (AppShell's claim mode yields zones instead of opening a dialog — see the file header there). Nothing to close. |
| 36 | Closing a sheet returns focus to its opener | **N/A** | Same reason. |

### Legibility

| # | Criterion | Result | Evidence |
|---|---|---|---|
| 37 | Body text ≥17px; nothing below 13px | **PASS** (fixed) | `[data-testid="step-body"]` computes to **17px** at every viewport. Minimum text on any element with a text node: **13px**. Minimum generated content: **13px** (was 11px on the phone chip badge — **D8**). |
| 38 | 4.5:1 / 3:1 contrast, both schemes | **PASS** (fixed) | Full 19-step walk with every element carrying a text node, alpha composited against its real ancestor stack: **0 failures** in light @1280×800 and **0 failures** in dark @375×650. Previously one: `.sep` at 3.30 / 3.41; now **5.47 light, 5.78 dark**. |
| 39 | Greyscale: suits, teams, active seat, every score-board cell state | **PASS** | See §5. |
| 40 | No image contains text | **PASS** | Zero raster images in the build; the only SVG is the favicon. |
| 41 | Card ranks and suits selectable as text | **PASS** (fixed) | `user-select` on every `[data-card]` is now `auto` (0 with `none`). **D4** |

### Motion

| # | Criterion | Result | Evidence |
|---|---|---|---|
| 42 | Reduce Motion: nothing animates | **PASS** (simulated) | The real media query cannot be emulated here; the `@media (prefers-reduced-motion: reduce)` block was confirmed present in the CSSOM and its declarations applied verbatim. Result: max `animationDuration`/`transitionDuration` across every element = **0.00001s**; `--dg-fast: 0ms`, `--dg-slow: 0ms`, `--dg-rise-zone: 0px`, `--dg-press: 1`. |
| 43 | Reduce Motion: all 19 steps and 4 checkpoints still completable, states perceivable | **PASS** | Full walk under the simulated reduce block: 19/19 steps, all 4 checkpoints solved, final score 5–4, zone heights identical to the normal run, 0 new problems. |
| 44 | No animation while idle | **PASS** | After `finish()` + **6.0 s** of no interaction: `document.getAnimations()` = 7 entries, **0 in `playState: "running"`**, all `finished`. Elements with `animation-iteration-count: infinite`: **0**. Only three keyframes exist (`zoneIn`, `entry`, `stepIn`), all one-shot. |
| 45 | Sheet open/close ≥55fps on mid-tier Android | **UNTESTABLE** | No device, and no frames are composited. |

### Persistence

| # | Criterion | Result | Evidence |
|---|---|---|---|
| 46 | Step 12 → close → reopen within 2 h restores step 12 **with a dismissible bar** | **FAIL** (half) | Restore works: stored `{"stepIndex":11,...}`, reload → `12 / 19`, step `two-outcomes`. **No resume bar exists** — no element matching `[data-testid*=resume]`/`[data-testid*=restore]`, and nothing in `App.tsx` renders one. **D12** |
| 47 | The same sequence after 2 h opens step 1 | **PASS** | Wrote `{stepIndex:11, at: Date.now() − 3h}` and reloaded → `1 / 19`. `RESUME_WINDOW_MS` is 2 h. |
| 48 | `localStorage` disabled or throwing: runs normally, no error | **PASS** | Replaced `window.localStorage` with a throwing getter, then walked: **19/19 steps, 5–4, zero console errors**. Both call sites are inside `try`/`catch` (`loadProgress`, `saveProgress`). |
| 49 | Lock at step 12, return after 5 min, bfcache | **UNTESTABLE** | No device lock and no bfcache instrumentation available. |
| 50 | `/step/17` renders step 17 | **FAIL** | There is no router. `savedStartIndex()` reads `localStorage` only; `react-router-dom` was deliberately dropped (MOBILE_SPEC §12 Q1) and `vercel.json` rewrites every path to `index.html`. **D11** |

### Cheat sheet

| # | Criterion | Result | Evidence |
|---|---|---|---|
| 51 | The primary panel fits one 375×650 screenshot, no scrolling | **FAIL** | `[data-testid="cheat-sheet"]` is **1352px** tall at 375px wide; `[data-zone="overlay"]` is 704px of scrollport over 1349px of content. **D13** |
| 52 | Prints one A4 page and one Letter page, black on white, no chrome, nothing clipped | **PASS** (simulated) | All `@media print` rules extracted from the CSSOM and re-applied unconditionally at a 190mm (718px) print-content width: sheet is **247.2mm = 0.89 A4 pages / 0.95 Letter pages**, 6 sections, 54 cards, `docOverflowX = 0`. |
| 53 | Printing from dark mode still produces a light page | **PASS** | The print block redefines the tokens at `:root` (`--dg-paper #fff`, `--dg-ink #000`, all four suit tokens `#000`) and forces `body { background:#fff; color:#000 }`. Under simulation: body `rgb(255,255,255)` / `rgb(0,0,0)`; the set of card colours collapses to `["rgb(0,0,0)"]`. |
| 54 | All cheat sheet text selectable and copyable | **PASS** (fixed) | Elements with `user-select: none` in the `cheat-sheet` subtree: **0** (was **162**). **D4** |
| 55 | "book" confined to the one permitted glossary line | **PASS** | `grep -oic book dist/**`: **1 occurrence**, in `assets/index-*.js`, reading `…call a half-suit a <em>book</em>. It means the same thing: six…`. Zero in the CSS and HTML. Zero occurrences of `HS`/`h-suit`; "half-suit" appears 12× in the rendered sheet. |

### Variant conformance (`RULES.md`)

| # | Criterion | Result | Evidence |
|---|---|---|---|
| 56 | `T` renders as "10" everywhere; zero standalone "T" ranks in the DOM | **PASS** | Rendered DOM: **0** cards whose rank glyph is exactly `T`; **4** reading `10`. |
| 57 | "10" fits a hand chip at 320px with ≥2px side bearing | **PASS** | Side bearing at 320px: **4.9px** each side (6.0px at 375, 8.8px at 1024). Not clipped, not ellipsised. |
| 58 | Red and black jokers distinguishable in greyscale, at chip size and full size, both fully labelled in the accessible name | **PASS** | Distinct glyph `★` vs `☾`; distinct text `RED` vs `BLK`; a filled plaque for black against an outlined one for red; greyscale luma **194.0 vs 234.0** (Δ40.0). Accessible names: `"the red joker"`, `"the black joker"`. |
| 59 | A seat at 0 cards shows the word "out", carries it in the accessible name, keeps its ring position | **PASS** (substance) | `.seat[data-out] > *::after { content: "out" }` — measured as `"out"` on all six seats at the end; count shows `—`; accessible name is `"Ravi, Red team, out of cards"`. Ring positions are byte-identical before and after going out (seat-0 @160,126 … seat-5 @297,124). The spec's literal `" — out"` string differs; the information is present. |
| 60 | Three claim outcomes including **void**, each with a distinct heading, glyph and rule sentence | **N/A — superseded** | `RULES.md` §6, confirmed by the club 2026-08-21: *"An incorrect declaration — for any reason — awards the half-suit to the opposing team; there is no void outcome."* Two outcomes are implemented and are distinct by glyph (`✓` vs `→`), by border colour and by sentence. The tests pin the two-outcome rule; this criterion is stale. |
| 61 | After submitting, the true holder of all six cards is displayed | **PASS** | `[data-testid="claim-solved"][role=status]` renders `checkpoint.reveal` plus all six `deductions`, each naming its card and its holder. |
| 62 | Six rows for a half-suit the learner holds zero cards of | **PASS** (construction) | `claimRowsVM` maps `halfSuitCards(halfSuit)` — always the six cards of the half-suit, never the hand. Not exercised by the scripted game (the learner holds cards in both claims). |
| 63 | Pass / designate screens: ≥44px seat rows, correct filtering, stated reason | **N/A** | The guide never offers a pass or designate choice; the criterion is conditional ("Where … is offered"). |
| 64 | The final result screen renders a tie | **N/A — superseded** | `RULES.md` §6: nine is odd and every half-suit is awarded, so *"A draw is impossible."* The scripted game ends 5–4 on purpose. |
| 65 | Each wrong answer names the broken rule; the four asks cover four distinct engine error codes | **PARTIAL** | Naming: **PASS** — option 0 "Mia is on your team…", option 1 "You hold no high diamond…", option 2 "The 2 of spades is already in your hand…". Codes: **FAIL as written** — the three wrong options map to `TARGET_TEAMMATE`, `NO_CARD_OF_HALF_SUIT`, `ASKING_OWN_CARD`; the fourth option is by construction the *legal* ask, so four error codes is impossible. `TARGET_OUT` is taught in prose only. **D16** |

---

## 4. Criterion-by-criterion — `QA_DESKTOP.md` Part 3 (43)

### Fit

| # | Criterion | Result | Evidence |
|---|---|---|---|
| 1 | `scrollWidth == clientWidth` at 1024/1280/1440/1920, every step, checkpoints both states | **PASS** | 0 difference on all 19 steps at all four, before and after solving each checkpoint. |
| 2 | 1280×800: `scrollHeight ≤ clientHeight` on all 19 | **PASS** | 800 == 800 on all 19. (The doc recorded 18 of 19 failing, worst case 1718px.) |
| 3 | Five zones non-zero, inside the viewport, no overlap, 1280×800 | **PASS** | header 16–136, table 136–588, annotation 136–720, hand 588–720, nav 720–784. 0 zero-height, 0 outside, 0 overlapping pairs. |
| 4 | Same at 1024×768 | **PASS** | header 16–136, table 136–556, annotation 136–688, hand 556–688, nav 688–752. Same three zeros. |
| 5 | Zone heights stable between consecutive steps; only annotation may change | **PASS** | 1280×800 first step vs last: `header:120 table:452 annotation:584 hand:132 nav:64` — identical, and identical on every step in between. |
| 6 | Six claim rows + `claim-submit` + `claim-progress` in view at 1024+, no internal scroller hiding a row | **PASS** (fixed) | 1024×768, 1280×800, 1440×900, 1920×1080, both claims: annotation `scrollHeight − clientHeight = **0**`, `rowsInScrollport: true`, `submitIn: true`, `progIn: true`. Was 181px / 157px over. **D2** |
| 7 | Four ask options + `nav-next` in view at 1024+ | **PASS** (fixed) | Both asks at all four viewports: annotation overflow **0**, `optsIn: true`. Was: `ask-option-3` 49px below the fold at 1024 and 1280. **D3** |
| 8 | Overflow lives in the zone's own container, not the document | **PASS** | Only `[data-zone="overlay"]` (cheat sheet) exceeds its box: 704px client over 1349px scroll, while the document stays 800 == 800. Every other zone's overflow is 0 at every desktop viewport. |
| 9 | 200% zoom (640×400): no horizontal page scroll, nothing clipped out of reach | **PASS** | `hS = 0` on all 19; compact scroll mode engages; ask overflow 0, claim overflow 0, `optsIn`/`rowsIn`/`submitIn` all true; min segment 141×44. |
| 10 | No element with computed `right` beyond `clientWidth` | **PASS** | 0 at 1024, 1280, 1440, 1920. |
| 11 | No `data-testid` element with 0 computed height | **PASS** (desktop) | 0 at all four desktop viewports. Below 960px, claim mode deliberately zeroes `[data-zone="hand"]` and its testids — the documented yield-the-zone behaviour in AppShell. |

### Content that must remain reachable

| # | Criterion | Result | Evidence |
|---|---|---|---|
| 12 | Every `logVM` entry reachable: 16 at step 11, 31 at step 17 | **PASS** | `log-entry` count: 16 at cp3, 31 at endgame/cp4, 35 at the end. The `limit` prop is not passed. Scroll container at 1024×768: 232px of viewport over 965px (step 11) and 1555px (step 17) of content. |
| 13 | Six seats and six counts visible at every step; an out seat shows `—` and stays | **PASS** (fixed) | 0 seats outside the table zone on any of the 19 steps at any viewport. Was: 3 seats cut 23.6–25.2px on 13 of 19 steps at 1024×768. Out seats show `—` and hold position. **D1** |
| 14 | Nine chips visible; state distinguishable without colour; the ninth distinguishable | **PASS** | 9 chips at every step. State: border-style `dashed` (open) vs `solid` (settled), plus a `B`/`R` badge letter, plus font-weight 500→600, plus a ground change. Ninth: 2px accent frame, accent tint, terminal 3×3 cell and its own label "8s + Jokers". Struck-through when play stopped before it was played. |
| 15 | Whole hand visible without scrolling at 1280×800, peaking at 11, no horizontal scroller | **PASS** (fixed) | 0 cards outside the strip on all 19 steps; `.groups` not scrollable. Was 514px in 496 with one card off-edge. **D5** |
| 16 | Full annotation body visible without truncation at 1280×800 on all 19 | **PASS** | Annotation overflow 0 on all 19 steps. No `text-overflow: ellipsis` or `-webkit-line-clamp` on `[data-testid="step-body"]` in source. |
| 17 | Every card keeps a rank glyph and a suit glyph; jokers distinguishable without colour | **PASS** | Every `[data-card]` renders `.rank` + `.suit`; joker plaques `★/RED` and `☾/BLK` differ by glyph, by label, by fill and by Δ40 luma. |
| 18 | Cheat sheet renders 9 half-suits, 54 card faces, six reachable sections | **PASS** | 9 `[data-half-suit]`, **54** `[data-card]`, 6 `<section>`, headings H2 → H3 → H4 with no skipped level. |

### Interaction — pointer

| # | Criterion | Result | Evidence |
|---|---|---|---|
| 19 | Every listed control responds to a single click at every viewport | **PASS** | The entire 19-step walk, including all four checkpoints, `claim-reveal`, `checkpoint-reveal` and `nav-restart`, was driven by single clicks at 11 viewports. |
| 20 | No two interactive controls overlap (label/input pairs excepted) | **PASS** (desktop) | `elementFromPoint` at each control's centre returns that control (or its own descendant) for **every** control at 1024, 1280, 1440, 1920 — 0 occluded. On phones the sticky `claim-progress`/`claim-submit` sit over rows scrolling beneath them; that is the documented pattern in AppShell's claim-mode block, not a collision between two live targets. |
| 21 | Clicking a `claim-*-seat-*` label anywhere selects its radio | **PASS** | All claims were solved by clicking through the label's `input`; label geometry is 80.7–141px wide × 44–45px tall and the input is wrapped, so the whole box is the target. |
| 22 | ≥44×44 with ≥8px between adjacent, all four desktop viewports | **PASS** | 0 controls under 44×44 at 1024/1280/1440/1920 on any step. `index.css`'s `button { min-block-size: var(--dg-node-min) }` is not overridden anywhere. |
| 23 | `nav-next` disabled state distinguishable, not by colour alone | **PASS** | Blocked vs free, greyscale: border-style **dashed vs solid**; border luma **105.3 vs 154.4**; text luma **143.3 vs 187.6**; ground luma **27.9 vs 43.2**; plus the visible reason line "Answer above to continue". |
| 24 | `progress` stays `aria-hidden`; the fill is inline-driven and not overridden | **PASS** | `aria-hidden="true"`. The fill uses an inline `--progress` ratio with `transform: scaleX(var(--progress, 0))` — a compositor transform, not a width; no CSS rule sets it. |

### Interaction — keyboard and assistive tech

| # | Criterion | Result | Evidence |
|---|---|---|---|
| 25 | Tab reaches every control, no skips, no trap, order matches visual order | **PARTIAL** | Sequential focus order enumerated from the DOM (no positive `tabindex` anywhere, the only `tabindex` is `-1` on the step heading, so DOM order *is* tab order). At cp3 that order is: 18 claim radios → `claim-submit` → `nav-back` → `nav-next`, which matches the visual order top-to-bottom. Native radio-group semantics collapse each group to one stop, giving 9 real stops. Heading outline has no gap on any step: h1 → h2 → h3 (the `h1 → h3` gap noted as D5 in the previous pass is closed by `HandFan`'s visually-hidden h2). Live Tab traversal itself: see §0.2. |
| 26 | `claim-submit` focusable while unusable, with a visible sentence saying why | **PASS** | `aria-disabled="true"`, **no** `disabled` attribute, `tabIndex 0`, `data-blocked="true"`, `aria-describedby="claim-progress"` → a visible line reading "0 of 6 placed — 6 still to go". |
| 27 | Same for `nav-next` while a checkpoint is unanswered | **PASS** | `aria-disabled="true"`, no `disabled` attribute, `tabIndex 0`, `aria-describedby="nav-blocked"` → visible `<p id="nav-blocked">Answer above to continue</p>` at 13px, inside the nav zone. Attributes flip to `aria-disabled="false"` / no describedby the moment the checkpoint is solved. |
| 28 | Next onto a checkpoint leaves focus inside `checkpoint-ask`/`checkpoint-claim`, not `<body>` | **PARTIAL** | Focus lands on `h1[data-testid="step-title"]` — inside `[data-zone="annotation"]`, a sibling of the checkpoint, **not** on `<body>`. The previous pass's D4 (focus lost to body) is fixed; the literal criterion is not met. This is deliberate: `Annotation.tsx` moves focus to the heading so the step is announced, and the next Tab reaches the checkpoint first. **D15** |
| 29 | Focus indicator ≥3:1, ≥2px, both schemes, visible on radios; no `outline: none` without a replacement | **PASS** | Global `:focus-visible { outline: var(--dg-s-focus) solid var(--dg-accent-line); outline-offset: 2px }` — **3px**. Accent-line vs paper: **3.69:1** light (`#b87214` on `#fdfaf2`), **7.31:1** dark (`#e0912a` on `#14130e`). Measured on a real focus: `3px solid rgb(224,145,42)`, offset 2px, on both `nav-next` (88×44) and the step heading (406×38). The single `outline: none` in the codebase is `.radio:focus-visible`, inside `@supports selector(:has(*))`, paired with a 3px ring moved onto the label — a replacement, not a removal. No radio is `opacity: 0` or `appearance: none`. |
| 30 | Keyboard-only completion, verified by hand | **UNTESTABLE HERE** | Proven harness limitation — see §0.2. Everything that *can* be checked, is: every control is a native `<button type="button">` or a native `<input type="radio">` inside a `<label>`, so activation is the UA's; there are no key handlers and no `preventDefault` in `src`; no positive `tabindex`; no `inert`, no `aria-modal`, no focus trap; each card is its own radio group so arrows cannot escape a row. **Must be re-checked by a human on real hardware before release.** |
| 31 | Selecting a seat keeps focus in that row | **PASS** | `place()` only sets state — no `focus()`, no `scrollIntoView`, no remount. Measured: `[data-zone="annotation"].scrollTop` unchanged (0 → 0) across a radio selection, and no row collapses. |
| 32 | `claim-progress`, `claim-error` and ask feedback stay in live regions | **PASS** | At cp1 after a wrong answer: `ask-option-why-0[role=status]`, `checkpoint-hint[role=status]`, and the step announcer — all `display: block`, none under an `aria-hidden` ancestor. At cp3: `claim-progress[aria-live=polite]` visible at 13px; `claim-error[role=alert]` and `claim-solved[role=status]` render in their states. |

### State and integrity

| # | Criterion | Result | Evidence |
|---|---|---|---|
| 33 | Zero console errors and warnings across a full run at each viewport | **PASS** | Across every walk at all 11 viewports, both schemes, plus the reduced-motion and throwing-storage runs: only `[vite] connecting/connected` and the React DevTools `info` notice. `onlyErrors` read: "No console logs." |
| 34 | Zero cross-origin requests, no 4xx/5xx, zero webfonts, zero raster images | **PASS** | Every request is `http://localhost:5174/…`, all 200. 0 new requests during a full walk (47 → 47). `dist` contains no font and no raster image. |
| 35 | `npm run verify` still passes after any CSS change | **PASS** | Run after every one of the eight edits: typecheck ✓, lint (`--max-warnings 0`) ✓, **86/86 tests**. |
| 36 | `nav-restart` returns to step 1 with every checkpoint unanswered and re-answerable | **PASS** | After restart: `1 / 19`, step `welcome`; advancing to step 4 gives four options at `data-state="idle"`, all enabled, `nav-next` `aria-disabled="true"`. |
| 37 | Solved state survives navigation | **PASS** | Solve cp1 → Next → Back: `ask-option-3` still `data-state="correct"`, `nav-next` still `aria-disabled="false"`. |
| 38 | Clearing `localStorage` → `1 / 19`; advancing past step 4 and reloading resumes | **PASS** | Cleared + reload → `1 / 19`. Advance to `12 / 19`, stored `{"stepIndex":11,…}`, reload → `12 / 19`. |
| 39 | Three rapid `nav-next` immediately before a checkpoint advance exactly one step | **PASS** | From `3 / 19` (`ask-intro`), three synchronous clicks → **`4 / 19`, step `cp1`**. The functional update in `move()` re-reads `solvedRef` inside the updater. |
| 40 | The game still ends 5–4 to Blue with all nine half-suits resolved | **PASS** | Final `score-blue = 5`, `score-red = 4`; the nine chip states are `team0, team1, team1, team0, team0, team1, team0, team1, team0` — 5 Blue, 4 Red, none open. |

### Print and take-away

| # | Criterion | Result | Evidence |
|---|---|---|---|
| 41 | Cheat sheet prints onto one or two A4/Letter pages, nothing clipped, suits readable in greyscale, outcomes distinguishable | **PASS** | 0.89 A4 / 0.95 Letter pages at a 190mm content width. All suit colours resolve to `rgb(0,0,0)` and are carried by glyph; jokers keep `★RED` / `☾BLK`; the two claim outcomes carry distinct `::before` glyphs `✓` and `→`. (There is no void outcome — see MS 60.) |
| 42 | Print drops shell chrome; no `position: fixed` repeats; light scheme forced | **PASS** | Under print simulation: `[data-zone="header"|"table"|"hand"|"nav"]` all compute `display: none`; elements with `position: fixed` = **0**; body forced to `#fff` / `#000`; `@page { margin: 10mm }`. |
| 43 | All cheat-sheet text selectable — no `user-select: none` in that subtree | **PASS** (fixed) | 0 elements with `user-select: none` in the `cheat-sheet` subtree (was 162 — the 54 card figures and their rank/suit spans). **D4** |

---

## 5. Colour independence — measured in greyscale

Rec.709 luma of the resolved colours, plus the channels that remain when hue is removed. Dark
scheme shown; light was measured too and behaves the same way (the channels are identical; only
the luma values invert).

| Distinction | Luma A | Luma B | Δ | Non-colour channels that survive |
|---|---|---|---|---|
| **Team** Blue vs Red (chip) | 159.1 | 194.0 | 34.9 | Badge **letter `B` vs `R`**; badge shape circle vs square; trailing corner radius **12px vs 4px**; and the chip's own `.srOnly` sentence "…won by Blue" |
| **Suit** clubs / hearts / spades | 164.3 | 164.3 | **0** | The **glyph** ♣ ♥ ♠ ♦ is the entire channel and is always present, plus `data-suit` and the accessible name ("2 of clubs"). Colour adds nothing and is not relied on. |
| **Suit** diamonds | 173.1 | — | — | Same. |
| **Jokers** red vs black | 194.0 | 234.0 | 40.0 | Glyph **★ vs ☾**; text **RED vs BLK**; outlined plaque vs filled plaque; accessible names "the red joker" / "the black joker" |
| **Hit vs miss** (log) | 241.0 | 164.3 | 76.7 | Glyph **↺ vs ↳**; border-style **solid vs dashed**; border-width **2px vs 1px**; font-weight **600 vs 400**; ground 18.9 vs 27.9; and the sentence itself ("…hands it over" / "no. The turn passes to…") |
| **Claim outcome** Blue vs Red awarded | border 159.1 | border 194.0 | 34.9 | Trailing radius **12px vs 4px**; both carry `✓`, and a claim that goes *against* the claimer flips to `✗` and a dashed edge; the sentence names the team |
| **Checkpoint** wrong vs idle | border 194.0 | border 105.3 | 88.7 | Border-style **dashed vs solid**; a `✕ ` glyph on the reason paragraph; the reason text itself |
| **Checkpoint** correct vs idle | border 159.1 | border 105.3 | 53.8 | Inset **1.5px ring**; ground 27.9 vs 18.9; a `✓ ` glyph on the reason |
| **Half-suit** open vs won | ground 43.2 | ground 27.9 | 15.3 | Border-style **dashed vs solid**; **no badge vs a `B`/`R` badge**; font-weight **500 vs 600**; radius 4px vs 4/12px; `.srOnly` "still in play" vs "won by Blue" |
| **Seat** active vs idle | ground 27.9 | ground 18.9 | 9.0 | **3px accent outline** on the active token; a caret above it; every other seat steps to **opacity 0.82**; and `", to act"` in the accessible name |
| **Seat** out vs in play | — | — | — | Dashed edge; **45° hatched ground**; the count reads `—`; the team marker is replaced by the **word "out"**; accessible name "…, out of cards" |
| **Next** blocked vs free | text 143.3 | text 187.6 | 44.3 | Border-style **dashed vs solid**; border luma 105.3 vs 154.4; ground 27.9 vs 43.2; the visible sentence "Answer above to continue" |
| **Claim row** placed vs unplaced | border 241.0 | border 105.3 | 135.7 | Border-style **solid vs dashed** |
| **Claim segment** chosen vs not | ground 43.2 | ground 18.9 | 24.3 | Native **filled radio dot**; inset **2px ring**; **bold** label |

Every distinction carries at least one non-colour channel, and in most cases three or four. No
state anywhere is signalled by hue alone. `filter: grayscale(1)` was also applied to
`documentElement` for each of these reads; nothing became ambiguous.

---

## 6. Screen-reader semantics

| Check | Result | Evidence |
|---|---|---|
| Heading outline, every step | **PASS** | Level sequences per step: `1 2 3 3 3 3 3`, `1 2 2 3 3 3 3 3` (checkpoints), `1 2 3`, `1 2`. Cheat sheet: `1 2 2 3 3 3 3 3 4 4 4 4 4 4 4 4 4 3`. **No skipped level on any step.** The `h1 → h3` gap from the previous pass is closed by `HandFan`'s visually-hidden `h2 id="hand-heading"`. |
| Every control has an accessible name | **PASS** | Sweep of every `button`, `input`, `summary`, `a[href]` for aria-label / aria-labelledby / associated `<label>` / text content: **0 nameless controls** on any step. Claim radios take their name from the wrapping label (`input.labels[0].textContent === "You"`), and each row's `<fieldset><legend class="srOnly">` reads "Who holds the 2 of spades?". |
| `aria-disabled` controls stay in the tab order and are described by a reachable explanation | **PASS** | `nav-next` and `claim-submit` both: `aria-disabled="true"`, no `disabled` attribute, `tabIndex 0`, `aria-describedby` pointing at a **visible** element (`nav-blocked`, `claim-progress`) that is not `sr-only`. `nav-back` at step 1 is the one genuinely `disabled` control — deliberate, and there is no "why" to explain at the start of a stepper. |
| Live regions announce a step change exactly once | **PASS** | On a non-checkpoint step there is exactly **one** live region: `<span aria-live="polite">Step 12 of 19</span>`. `Annotation.tsx` moves focus to the `h1` (which announces the title) and is deliberately *not* also a live region. Number and title are announced once each; nothing is announced twice. |
| Phone score chips expose their state | **PASS** | Below 960px `.chipLabel` is visually clipped, but each `<li>` still contains `<span class="srOnly">`. Measured at 375×650, step 12: `half-suit-LOW-S` → **"Low spades: won by Blue"**; the other eight → "…: still in play". |
| `progress` hidden from AT | **PASS** | `aria-hidden="true"`; the accessible step count comes from the live region instead. |
| Focus after a step change | **PASS** (not on body) | `document.activeElement` = `h1[data-testid="step-title"]`, with a visible 3px ring. See QA 28 / **D15**. |
| Log and table semantics | **PASS** | `[data-testid="log"]` is `region "What has happened so far"`; each entry is a full sentence plus card `img`s with names ("the black joker"). Each seat is a `group` named "Ravi, Red team, 7 cards" (or "…, to act" / "…, out of cards"). |

---

## 7. Viewport results after the fixes

Full instrumented 19-step walk at each. "Problems" counts steps with any of: page scroll, a
zero-height or out-of-viewport zone, overlapping zones, an occluded control, a clipped seat, a
sub-44px target, or a contrast failure.

| Viewport | Mode | Page scroll | Zones (h/t/a/hand/nav) | Ring | Seat clip | Ask fits | Claim fits | Targets <44 | Contrast fails |
|---|---|---|---|---|---|---|---|---|---|
| 320×568 | fixed | 0 / 0 | 57.5 / 164 / 186.5 / 104 / 56 | 128 | **0** | no (scrolls) | no (455px over) | 0 | 0 |
| 375×650 | fixed | 0 / 0 | 57.5 / 164 / 268.5 / 104 / 56 | 128 | **0** | no (400px over) | no (346px over) | 0 | 0 |
| 414×736 | fixed | 0 / 0 | 57.5 / 164 / — / 104 / 56 | 128 | **0** | no | no | 0 | 0 |
| 640×400 | **compact** | 0 / page | block flow | 128 | **0** | **yes** | **yes** | 0 | 0 |
| 768×1024 | fixed 1-col | 0 / 0 | 57.5 / 200 / 570.5 / 132 / 64 | 128 | **0** | **yes** | **yes** | 0 | 0 |
| 960×700 | fixed 2-col | 0 / 0 | 120 / 352 / 484 / 132 / 64 | 180 | **0** | **yes** | rows yes, submit 53–80px low | 0 | 0 |
| 1024×768 | fixed 2-col | 0 / 0 | 120 / 420 / 552 / 132 / 64 | 180 | **0** | **yes** | **yes** (seg 53×44) | 0 | 0 |
| 1280×800 | fixed 2-col | 0 / 0 | 120 / 452 / 584 / 132 / 64 | 180 | **0** | **yes** | **yes** (seg 60×44) | 0 | 0 |
| 1440×900 | fixed 2-col | 0 / 0 | 120 / 552 / 684 / 132 / 64 | 180 | **0** | **yes** | **yes** | 0 | 0 |
| 1920×1080 | fixed 2-col | 0 / 0 | 120 / 732 / 864 / 132 / 64 | 180 | **0** | **yes** | **yes** | 0 | 0 |
| 375×650, root 32px | fixed | 0 / 0 | 128 / 164 / 198 / 104 / 56 | 128 | **0** | no | no | 0 | 0 |

Every one of these completed all 19 steps and all 4 checkpoints and ended 5–4 to Blue.

On phones the annotation zone scrolls — by design (MOBILE_SPEC §4.2 makes it the one flexing,
scrolling zone). Measured overflow per step at 320×568 ranges 29–107px on ordinary steps and
424–483px on checkpoints; at 375×650, 26px on one ordinary step and 271–400px on checkpoints.
The ordinary steps are within the design's intent; the checkpoints are **D9**.

---

## 8. Still open, with a recommendation for each

**D9 — the claim sheet does not fit a phone (High).** At 375×650 the claim needs 346px more than
it has. It is *usable* — the rows scroll, the submit stays pinned and visible, and all four
checkpoints were solved at every phone width — but "all six rows at once" is the pedagogical
point of the control, and it is not met. The two-column trick that fixed desktop cannot be used
here: at 375px each segment would fall to ~38px, under the 44px floor.
*Recommendation:* implement MOBILE_SPEC §5.4's 88svh bottom sheet for the claim on phones only.
At 650px that is 572px against roughly 506px of sheet content once the step title and body move
out of the scroll — it fits, with room. Budget for the parts the current inline design avoids:
`role="dialog"` + `aria-modal`, a focus trap, focus return to the opener (MS 36), and a
`popstate` handler so the hardware back button closes the sheet rather than changing step
(MS 35) — those two criteria are currently N/A only because no sheet exists.

**D10 — no `<noscript>`, no slow-load recovery (Medium).** `index.html` is outside this pass's
editable set, so it was reported rather than changed.
*Recommendation:* add a `<noscript>` block carrying the step-1 heading and its first sentence,
and an inline script that reveals a "Still loading — Retry" panel if the module has not
hydrated within 8 s. Roughly 25 lines of static HTML plus an inline script; it costs well under
1 KB against a 18 KB budget headroom.

**D11 — no URL routing (Medium).** `/step/17` renders step 1. `react-router-dom` was dropped
deliberately (MOBILE_SPEC §12 Q1, ~20 KB) and that call was right.
*Recommendation:* do not reintroduce a router. Read and write the step from
`location.hash` in `useTutorial` — `#/step/17` — with `history.replaceState` on `next`/`back`
and a `hashchange` listener. Roughly 15 lines, zero bytes of dependency, and it also gives
deep-linkable QR targets and back-button step navigation.

**D12 — resume has no dismissible bar (Low).** Learners handed a laptop mid-run land on step 12
with no explanation.
*Recommendation:* render a dismissible bar in `App.tsx` when `savedStartIndex() > 0` — "Picking
up where you left off. Start from the beginning?" with a button that calls `t.restart()`. It also
makes the shared-device case (a club table) work properly.

**D13 — cheat sheet does not fit one 375×650 screenshot (Low).** It is 1352px tall.
*Recommendation:* accept it, or take MOBILE_SPEC §10.1's two-panel option — a screenshot-sized
primary card (the four gates, hit/miss, the two claim outcomes) plus a second panel for the nine
half-suits. It prints on one page today, which is the more valuable of the two take-aways.

**D14 — 960×700 leaves the submit below the fold (Low).** Outside every named acceptance
viewport; the 1024×768 floor and everything above it pass.
*Recommendation:* either raise the two-column breakpoint to a `(width >= 60rem) and
(height >= 46rem)` query so short-but-wide windows use the taller one-column layout, or
compress the score rail to a single row of nine chips below 46rem of height, which returns ~70px
to the annotation.

**D15 — focus lands on the step heading, not inside the checkpoint (Low, by design).**
*Recommendation:* leave it. Moving focus into the checkpoint would skip the teaching text that
frames the question, which is worse for a screen-reader user than one extra Tab. Amend
QA_DESKTOP criterion 28 to read "not on `<body>`, and the checkpoint is the next stop in the tab
order" — which is what the build does.

**D16 — checkpoint 1 covers three engine error codes, not four (Low).** The criterion as written
is self-contradictory: one of the four options must be the legal ask.
*Recommendation:* amend the criterion to "the three incorrect asks cover three distinct engine
error codes and each names its rule", which the build satisfies. If the fourth gate
(`TARGET_OUT`) is wanted as an option, it needs a scripted position where a player is already
out at step 4 — a change to `script.ts`, which is off limits to this pass.

### Also worth recording

* **MOBILE_SPEC criteria 60 and 64 are stale**, not failing. They require a *void* claim outcome
  and a *tie* result screen. `RULES.md` §6, confirmed by the club on 2026-08-21, removes both:
  an incorrect declaration always awards the half-suit to the opposition, so a draw is
  impossible. The engine, the tests and the interface all implement the confirmed rule. These
  two criteria should be struck from MOBILE_SPEC §11.
* **MOBILE_SPEC criterion 30's "≥8px between adjacent targets" and §5.4's segmented control
  contradict each other.** The three segments of a claim row abut by definition. §5.4 wins; the
  segments are ≥80px wide at 320px and each is its own 44px-tall target.
* **The `35rem` height breakpoint is right, but for a subtler reason than the comment in
  `AppShell.module.css` gives.** `rem` inside a media query resolves against the browser's
  *default* font size, not against `html { font-size }`. OS/browser text scaling does move it, so
  compact mode will engage on a real device; a stylesheet that scales the root will not. Worth a
  sentence in that comment so nobody "fixes" it later.
* **No `<noscript>`, no service worker, no analytics, no third-party host.** Content-Security-
  Policy in `vercel.json` is `default-src 'none'` with `connect-src 'none'`, consistent with a
  zero-request app after load.
