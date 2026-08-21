# CODEX_HANDOFF.md — the design brief

Everything except the visual design is finished. This document is the contract: what exists,
what is yours, what is not yours, and what "done" means.

**Start here:** `npm install && npm run dev`, then read `docs/DESIGN_INSPIRATION.md` and
`docs/MOBILE_SPEC.md`. Run `npm run verify` before you consider anything finished.

---

## 1. What this product is

An interactive guide that teaches a complete beginner to play Literature (Canadian Fish) in
about ten minutes — 9.2 minutes for a typical reader, 10.4 reading carefully. It is a linear
stepper: 19 steps across 6 acts, 4 of which are interactive checkpoints the learner must solve
before continuing.

Most people arrive by **scanning a QR code on a phone**, sitting at a table, wanting to start
playing. That is the primary case. Desktop matters, but it is second.

The rules variant is pinned in `RULES.md` and is not negotiable: 54 cards, **nine half-suits**,
the ninth being the four 8s plus both jokers. All 54 are dealt; that ninth half-suit is an
ordinary one, and because it makes the total odd it is what breaks a 4–4 score. The scripted
game ends exactly that way, so **the ninth half-suit is a visual motif, not a footnote** — see
`[data-ninth]` below.

Two rules were confirmed by the project owner on 2026-08-21 and are reflected throughout:
**the game ends the instant a team is awarded its 5th half-suit** (unresolved half-suits are
simply never played), and **there is no void outcome** — a wrong declaration, for any reason,
awards the half-suit to the opposing team. A drawn game is therefore impossible.

### Two copy rules

You are not writing the teaching copy — that is finished and test-locked. But you will add
microcopy (button labels, tooltips, empty states, `aria-label`s), and it has to match.

**1. The word is "half-suit", everywhere, always. Never "book."** There is exactly one
permitted exception — a glossary note at the bottom of `CheatSheet.tsx` — and a test enforces
the rest (`tests/tutorial/script.test.ts`, "terminology").

**2. Plain language.** The guide is read at a table, by someone who has never played, usually
on a phone, often while other people are talking. The copy was rewritten to suit that: it now
**averages 9 words per sentence, with no sentence over 18 words**, and a test holds it there.
Match that register. Short sentences, common words, second person, active voice. If a label
needs a subordinate clause, it needs to be two labels.

---

## 2. What is yours

**All of it, visually.** Concretely:

| Yours | Path |
|---|---|
| Every component's styles | `src/components/*.module.css` |
| App-level layout styles | `src/App.module.css` |
| Global tokens, reset, typography | `src/index.css` |
| Any new asset (fonts, SVG, icons) | `public/` |

Each `*.module.css` was generated from the component that imports it. Every class the
component actually uses is already listed, empty, alphabetised, with a header comment naming
the `data-*` hooks available on those elements. **Fill them in. Do not rename them, and do not
add class names to the `.tsx`.**

You may also add CSS-only structure — pseudo-elements, container queries, view transitions,
`@media`, `@supports`, custom properties. Anything that does not require editing a `.tsx`.

---

## 3. What is not yours

Do not edit these. They are covered by 82 tests and by pinned specs; changing them will either
break the build or silently make the guide teach something false.

| Off limits | Why |
|---|---|
| `lib/engine/**` | The rules. Pinned by `RULES.md`, covered by fuzz tests over 300 games. |
| `src/tutorial/script.ts` | The teaching copy and every scripted move. Test-locked. |
| `src/tutorial/table.ts` | The hand-authored deal. Every checkpoint's solvability depends on it. |
| `src/tutorial/replay.ts`, `useTutorial.ts` | The state machine. |
| `tests/**` | The specification, in executable form. |
| `RULES.md` | The rules of the game. |

If you believe one of these has to change to make the design work, **say so rather than
changing it** — it almost certainly means the design can be adjusted instead, and if it does
not, the rule needs a decision from the project owner, not a workaround.

### Two structural rules you must not break

These are load-bearing, and both are argued in `docs/MOBILE_SPEC.md`:

1. **Only the annotation zone flexes.** `AppShell` lays out five fixed zones — header, table,
   annotation, hand, nav. The annotation zone owns all the vertical slack. If the table or the
   hand resizes between steps, the table jumps under the learner's thumb.
2. **All six claim rows stay visible together.** A claim is a *simultaneous* deduction — "if
   Kofi has both jokers, his third card must be the 8 of spades". Any pattern that shows one
   card at a time destroys the exact reasoning the checkpoint exists to teach. No steppers,
   no wizards, no carousels.

---

## 4. Accessibility floor

Not suggestions. The guide is unplayable if these break.

1. **Suit is never colour alone.** Every `PlayingCard` renders a suit symbol and carries
   `data-suit="clubs|diamonds|hearts|spades|joker-red|joker-black"`. Colour goes on top of the
   symbol; it never replaces it. A four-colour deck is welcome (see `docs/MOBILE_SPEC.md`), but
   the symbol stays.
2. **The two jokers must be tellable apart without colour.** They are separate, individually
   askable cards — asking for the wrong one is a wasted turn. They ship with distinct marks
   (`★` / `☾`) and the labels `RED` / `BLK`. Restyle them; do not merge them.
3. **44px minimum touch targets**, with at least 8px between adjacent ones.
4. **Never disable pinch-zoom.** No `user-scalable=no`, no `maximum-scale`.
5. **`prefers-reduced-motion: reduce` must leave the guide fully usable.** The pattern to copy
   is in `docs/DESIGN_INSPIRATION.md`: zero the motion tokens rather than writing a second
   stylesheet.
6. **Visible focus on every interactive element.** Keyboard-only users must be able to complete
   all four checkpoints.
7. **Blocked buttons use `aria-disabled`, not `:disabled` — style them accordingly.** Desktop QA
   found that a genuinely `disabled` button leaves the tab order, so a keyboard or screen-reader
   user hits a dead end with no way to find out what is missing. `claim-submit` and `nav-next`
   therefore stay focusable and carry `aria-disabled="true"` plus `data-blocked="true"`.

   **`.submit:disabled` and `.next:disabled` will never match anything.** Target
   `[data-blocked="true"]` instead. Both must still look unavailable, must still show a focus
   ring, and the reason next to them (`claim-progress`, `nav-blocked`) must stay visible — it is
   deliberately not screen-reader-only, because a sighted learner wondering why Next looks dead
   deserves the same answer.
8. **Text contrast at least 4.5:1** for body copy, 3:1 for large text and meaningful borders.
   `docs/DESIGN_INSPIRATION.md` notes two real contrast failures on the reference site — do not
   inherit them.

---

## 5. Performance budget

From `docs/MOBILE_SPEC.md`, and the reason the router was removed:

- **≤ 98 KB compressed first load**, 120 KB hard ceiling.
- Current JS is **74.6 KB gzipped**. That is your headroom: about 23 KB for CSS and fonts.
- Zero raster images. Zero external requests — a strict self-contained page.
- If you want a webfont, one file, subset, `font-display: swap`, with a real fallback stack.
  Two faces is already a lot. `docs/DESIGN_INSPIRATION.md` §3 is worth reading first: the
  reference site fakes its "mono eyebrow" look with uppercase and letter-spacing rather than
  loading a second family.

Check yourself with `npm run build` — it prints the gzipped sizes.

---

## 6. The components

All are headless: semantic markup, real ARIA, stable `data-testid`s, and `data-*` styling
hooks. None of them has an opinion about how it looks.

| Component | Renders | Key hooks |
|---|---|---|
| `AppShell` | The five zones | `[data-zone]` |
| `ScoreRail` | Score + all nine half-suit chips | `[data-state="open\|team0\|team1"]`, `[data-ninth]` |
| `TableView` | Six seats, counts, whose turn | `[data-active]`, `[data-out]`, `[data-askable]`, `[data-team]` |
| `HandFan` | The learner's hand, grouped by half-suit | `[data-half-suit]`, `[data-highlighted]` |
| `Annotation` | Title and body for the step | `[data-mode="still\|beat\|montage"]` |
| `AskChoice` | Checkpoints 1 and 2 | `[data-state="idle\|wrong\|correct"]` |
| `ClaimSheet` | Checkpoints 3 and 4 | `[data-placed]`, `[data-checked]` |
| `LogPanel` | The public record of asks and claims | `[data-kind]`, `[data-hit]`, `[data-outcome]` |
| `StepNav` | Back / progress / Next | progress fill uses an inline `inline-size` |
| `CheatSheet` | The printable reference card | `[data-outcome]`, `[data-gate]`, `[data-ninth]` |
| `PlayingCard` | One card face | `[data-suit]`, `[data-size]`, `[data-joker]`, `[data-muted]`, `[data-highlighted]` |

### Things worth designing deliberately

- **The active seat.** `docs/DESIGN_INSPIRATION.md` §7 recommends carrying it with an opacity
  step on the *other* seats (`0.6 → 1`) rather than a badge on the active one. It is free on
  the compositor and survives at 375px. Whatever you choose, it must not be colour-only.
- **The ninth half-suit.** `[data-ninth]` exists because the guide keeps pointing at it — nine
  is odd on purpose, and the rail is where a learner should *see* that.
- **Hit versus miss in the log.** `[data-hit="true|false"]` is the single most-read piece of
  information in the whole game.
- **A claim lost to the opponents.** `[data-outcome]` on a log entry names the team awarded the
  half-suit. The counter-intuitive case is a claim by *your* side that the *other* side is
  awarded — it must read as a loss you caused, not as a neutral event.
- **Half-suits that were never played.** The game stops the instant a team reaches five, so a
  finished board can still show open chips. They must not read as "pending" once it is over.
- **The cheat sheet must print.** It is the artefact people screenshot and leave next to the
  deck.

### One thing you must build: the log needs a scroll clamp

`LogPanel` renders the **entire** history — 16 entries by checkpoint 3, 35 by checkpoint 4.
It used to be truncated to the last four in JS, and desktop QA caught what that cost: the
evidence checkpoint 4 turns on is two joker asks that happen many steps earlier, so truncating
made the checkpoint unsolvable and the guide's central promise false.

So the JS no longer truncates, and **the log zone must be height-clamped and scrollable in
CSS** — `overflow-y: auto` inside its zone, with the newest entry visible without scrolling.
Every earlier entry must stay reachable by scrolling. Do not reintroduce a cap in the markup.

On a phone this is the summary-chip-plus-sheet pattern from `docs/MOBILE_SPEC.md` §4; the
sheet must show the whole history, not a window onto it.

---

## 7. Definition of done

```bash
npm run verify   # typecheck + lint + 82 tests. Must pass.
npm run build    # must stay under the byte budget above.
```

Then, by hand:

1. All 19 steps reachable; all 4 checkpoints solvable with a mouse **and** with a keyboard alone.
2. No horizontal page scroll at 320px, 375px, 414px, 768px, 1024px, 1280px, 1920px.
3. Table, annotation, hand and nav all visible at once at 375×650 without scrolling the page.
4. All six claim rows visible together at 320px.
5. Legible in both light and dark, and with `prefers-reduced-motion` on.
6. The cheat sheet prints onto one or two pages with nothing clipped.
7. `docs/QA_DESKTOP.md` and `docs/MOBILE_SPEC.md` acceptance checklists both pass.

---

## 8. Where the reference material is

- `docs/DESIGN_INSPIRATION.md` — a deep study of the site the owner wants this to feel like,
  with the measured numbers and, crucially, a "translates cheaply" section. **Read the first
  finding before you plan anything**: the reference site uses no WebGL at all. The look is
  plain CSS and DOM, and its whole stylesheet is 42 KB gzipped. That is an achievable target,
  not an aspiration.
- `docs/MOBILE_SPEC.md` — the mobile contract: zone heights, breakpoints, the QR entry path,
  and 65 pass/fail acceptance criteria.
- `docs/QA_DESKTOP.md` — the desktop equivalent: 43 numbered pass/fail criteria, plus the
  measurements behind them (the tallest step is 1718px of content against an 800px viewport, and
  the six claim rows are 406px tall).
- `CURRICULUM.md` — why the guide is shaped the way it is, and where the ten minutes go.
- `RULES.md` — the game itself.
