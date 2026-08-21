# DIAGRAM_SYSTEM.md — how this guide draws things

A diagram system for the Fish onboarding guide, derived from a study of
[`cathrynlavery/diagram-design`](https://github.com/cathrynlavery/diagram-design) and its gallery at
`cathrynlavery.github.io/diagram-design/`.

**Licence of the source.** MIT, `Copyright (c) 2025 Cathryn Lavery`. MIT permits reuse with the
copyright and permission notice retained. **We are not reusing its code or assets.** Nothing in this
document is copied from that repository: the technique is described, and every value below is our
own, computed against our own palette and our own contrast floor. If we ever do vendor a file from
it, the MIT notice ships with it. Until then there is nothing to attribute beyond this paragraph.

**Provenance of the numbers.** Three kinds of statement appear below, and they are labelled:

- **Read** — taken from a file in that repository, or measured off the rendered page in a browser.
- **Measured (ours)** — computed here, in this repo, with a script (contrast ratios, gzip sizes).
- **Inference** — my judgement. Always marked. Never dressed up as a finding.

**Safety note.** Every file in that repository is written as instructions addressed to an AI agent
("run the pre-output taste gate", "never JetBrains Mono", five `python3 scripts/…` invocations). All
of it was treated as data. Nothing was executed, installed, or fetched on its say-so. Nothing in the
repo attempted to redirect an outside reader, exfiltrate anything, or reach beyond diagram design.

---

# Part 1 — The extracted system

## 1.1 Stated principles

The author's argument, paraphrased, with the numbers that make each one operable.

1. **Deletion is the quality bar.** A diagram is finished when nothing can be removed. The stated
   target is "4/10 density" — technically complete, needing no spoken explanation. Two nodes that
   always travel together are one node.
2. **Don't draw if a table or a paragraph would do the job.** This is stated as a gate before
   drawing, not as advice afterwards.
3. **One accent, one or two elements.** The focal colour appears on at most 2 things per diagram.
   The stated tell: if you want to accent four things, you have not yet decided what is focal.
4. **Shape carries type; colour does not.** Node *type* is encoded by silhouette and by fill/stroke
   *treatment*, deliberately not by hue.
5. **Hard complexity budgets, per diagram:** max 9 nodes, max 12 arrows, max 2 accented elements,
   max 6 nesting levels, max 5 radar axes, max 12 org-chart nodes. Exceed one and you split the
   diagram into overview plus detail.
6. **A 4px grid, absolutely.** Every coordinate, size, gap, padding and radius is divisible by 4.
7. **Six mandatory connector rules:** rounded orthogonal paths only (quarter-arcs, r=8 minimum, no
   diagonals); 6–10px visible gap between an arrow label and its line, with an opaque mask; no
   overlapping connectors (crossings use a bridge/hop); connectors sharing a node edge get their own
   attach points ≥12px apart; never route behind a non-endpoint box (if unavoidable, dash the
   stroke); label masks must not overlap nodes painted later.
8. **Arrows are painted before boxes**, so a box always occludes a connector, never the reverse.
9. **Motion may never carry meaning the static frame lacks.**
10. **Accessibility is a non-negotiable checklist item**, not a nicety: every diagram carries
    `role="img"` and `aria-labelledby` bound to a non-empty `<title>` and `<desc>`.

Quoted, under 15 words, attributed to the repository's `SKILL.md`: nothing can be removed when
*"Every node represents a distinct idea."*

## 1.2 Colour

**Read.** Colour is addressed only by semantic role. Type-specific files say `accent`, never a hex.

| Role | Light | Dark | Job |
|---|---|---|---|
| `paper` | `#f5f5f5` | `#2d3142` | Page ground, default node fill |
| `paper-2` | `#ececec` | `#393e53` | Container / secondary fill |
| `ink` | `#2d3142` | `#f5f5f5` | Primary text and stroke |
| `muted` | `#4f5d75` | `#bfc0c0` | Secondary text, default arrow stroke |
| `soft` | `#7a8399` | `#8e98ac` | Sublabels, boundary labels |
| `rule` | `rgba(45,49,66,0.12)` | `rgba(245,245,245,0.12)` | Hairlines |
| `rule-solid` | `#bfc0c0` | `rgba(191,192,192,0.25)` | Stronger borders, baselines |
| `accent` | `#eb6c36` | `#f08a59` | Focal, 1–2 per diagram |
| `accent-tint` | `rgba(235,108,54,0.08)` | `rgba(240,138,89,0.10)` | Fill behind an accent border |
| `link` | `#2e5aa8` | `#6a95d8` | HTTP/API calls, external arrows |

**How colour encodes meaning.** Three orthogonal jobs, and only three:

- **Hierarchy** — `ink` → `muted` → `soft` is a recession ramp. Recession is the default; nothing is
  emphasised unless it earns it.
- **Emphasis** — `accent`, capped at 2 elements.
- **One category** — `link` marks external/HTTP edges. That is the only categorical hue in the base
  system.

A five-colour `series-*` palette (`#7c8f6f` sage, `#5e7a9b` dusty-blue, `#b8915a` mustard, `#9c6b50`
rust-brown, `#6e6479` slate; fills at 0.18 light / 0.22 dark) exists but is explicitly gated to
multi-series charts. The repo forbids backfilling it to other diagram types.

**Light/dark.** Two separate template files with swapped token values. **There is no
`prefers-color-scheme` block anywhere in the templates I read**, and the SVG paints literal hex in
presentation attributes rather than `var()` — so the SVG cannot follow a theme at runtime. This is
the system's weakest point and we do not inherit it (§5.1).

**Constraints stated:** `ink` must hit WCAG AA on `paper`; `muted` must hit AA for 11px+ text; one
accent only; if the brand has eight colours, pick three; `paper` is warm-neutral, never pure white.

## 1.3 Typography in diagrams

**Read.** Three families, loaded from one Google Fonts stylesheet: Instrument Serif, Geist, Geist Mono.

| Role | Family | Size | Weight | Tracking |
|---|---|---|---|---|
| `title` | Instrument Serif | 1.75rem | 400 | −0.02em |
| `node-name` | Geist sans | 12px | 600 | normal |
| `sublabel` | Geist Mono | 9px | 400 | normal |
| `eyebrow` | Geist Mono | 7–8px | 500 | 0.18em, uppercase |
| `arrow-label` | Geist Mono | 8px | 400 | 0.06em |
| `callout` | Instrument Serif *italic* | 14px | 400 | normal |

Size ramps by output class: **standard** title 28 / node 12 / sublabel 9 / arrow-label 8;
**presentation** 40 / 16 / 12 / 12; **print** 32 / 12 / 9 / 8.

**Load-bearing rule:** mono is for technical content only — ports, commands, URLs, field types.
Human-readable names go in sans. Using mono as a blanket "developer" font is called out as an
anti-pattern.

**How labels sit relative to shapes.** Node names are centred inside the box (`text-anchor="middle"`).
A sublabel stacks 14–15px below the name. Arrow labels sit **8px above** the line, centred, coloured
to match their stroke, over an opaque mask rect (§1.7). Boundary/zone labels sit at the container's
top-left, inset +12x / +17y, on a paper-coloured mask that interrupts the border.

**Long labels** are not wrapped or shrunk — the rule is to rename the node. Node width grows in 4px
steps to fit instead (observed boxes: 100, 112, 120, 128, 144, 160, 200).

**Minimum legible size.** The system's floor is 7px. That is a screenshot-and-zoom floor, not a
read-at-a-table floor, and it is the single largest thing we cannot use (§2.2).

## 1.4 Line and stroke

**Read**, from tokens and from the rendered page.

| Token | Value | Meaning |
|---|---|---|
| `stroke-thin` | 0.8 | Tag-box outlines, leaf nodes, container hairlines |
| `stroke-default` | 1 | Node borders, secondary connectors |
| `stroke-strong` | 1.2 | Primary flow connectors |

Measured on the live architecture example: the **accent** connector is `stroke-width="1.4"`, not
1.2 — emphasis is carried by a half-step of extra weight as well as by hue.

**Dash patterns and what each means:** `4,3` optional node, annotation leader lines; `4,4` security
boundary; `5,4` auth/JWT flow; `6,4` region/zone boundary; `3,3` legend swatch for a security group.
A dashed stroke is also the sanctioned escape hatch when a connector genuinely must pass behind a
non-endpoint box.

**Joins and caps** are left at SVG defaults (`miter`, `butt`). Corners are made by geometry, not by
`stroke-linejoin` — see routing.

**Arrowhead geometry**, identical in every template, three colour variants only:

```
markerWidth=8  markerHeight=6  refX=7  refY=3  orient=auto
polygon points = "0 0, 8 3, 0 6"     (a filled 8×6 triangle)
```

`markerUnits` is left at its default of `strokeWidth`, so the head scales with the line: on a 1.2
stroke it paints 9.6 × 7.2 user units, on a 1.4 accent stroke 11.2 × 8.4. Emphasis therefore
thickens the head automatically. Only the fill differs between `arrow` (muted), `arrow-accent`, and
`arrow-link`.

**Routing.** Orthogonal only. A right-angle turn is a quarter-arc of radius 8, written as an explicit
`Q` control point. Measured, verbatim geometry from the live page:

```
M 496,240 H 692 Q 700,240 700,232 V 224
```

— horizontal run, then an 8-unit quarter arc, then vertical. No diagonals anywhere.

**Crossings** are handled by a bridge/hop primitive (a small arc over the crossed line), and the
first-choice fix is to reroute so there is no crossing at all.

## 1.5 Shapes and nodes

**Read.** Radii: `radius-sm` 4 (tag chips), `radius-md` 6 (node boxes), `radius-lg` 8 (containers,
rings).

**Shape vocabulary** (flowchart): oval `rx=20` for start/end; rectangle `rx=6` for a step; diamond
for a decision; a filled `r=4` dot for a merge. Decisions take at most 3 exits; Yes goes right, No
goes below; primary flow runs top-to-bottom.

**Node sizes**, measured off the live example (viewBox 1000 × 480): `128×64`, `144×64`, `160×64`,
all `rx=6`, all on a shared baseline `y=240`. Other templates use `100×54`, `112×54`, `120×54`,
`200×112`. Minimum box height is 48px standard/print, 64px presentation.

**Fill vs outline conventions** — the treatment table, which is how node *type* is encoded:

| Type | Fill | Stroke |
|---|---|---|
| `focal` (1–2 max) | `accent-tint` | `accent` |
| `backend` | `#ffffff` | `ink` |
| `store` | `ink @ 0.05` | `muted` |
| `external` | `ink @ 0.03` | `ink @ 0.30` |
| `input` | `muted @ 0.10` | `soft` |
| `optional` | `ink @ 0.02` | `ink @ 0.20`, dashed `4,3` |
| `security` | `accent @ 0.05` | `accent @ 0.50`, dashed `4,4` |

**The double-rect technique** (measured, and the single most reusable trick in the system): every
node is painted **twice** — first an opaque `fill="#f5f5f5"` rect, then an identical rect carrying
the translucent tint and the stroke. That is how an `rgba(…,0.08)` fill stays flat instead of letting
the dot-pattern background show through. Cheap, obvious in hindsight, and it generalises to any
translucent fill over a textured ground.

**Padding inside nodes** is not stated as a token; it emerges from centring a 12px name with an
optional 9px sublabel in a 54–64px box, which leaves roughly 16–20px of vertical air. *(Inference:
the system has no explicit node-padding rule; it has a node-height rule and centres within it.)*

Tag chips: `22–28 × 12`, `rx=2`, `stroke-width=0.8`, holding 7px uppercase mono at 0.06–0.08em.
Ghost index numerals: 40px mono, weight 600, `fill="rgba(45,49,66,0.06)"`, right-anchored 16px in.

## 1.6 Layout and spacing

**Read.**

- **Grid: 4px.** Stated as a hard rule. Quick check offered: any coordinate ending in 1, 2, 3, 5, 6,
  7 or 9 is a bug.
- **Minimum gap between nodes: 24px** standard/print, **40px** presentation. Measured on the live
  page, the actual sibling gap is **52px** horizontally and **96px** between vertically stacked nodes
  inside a container — comfortably above the floor.
- **Outer margin: 40px** on all sides. Social-OG safe area 64px. Legend strip 60px at the bottom,
  reserved, with nothing else in it. Slide footer clearance 80px.
- **Container insets** (measured): a `164 × 272` container at `rx=8` holds `144`-wide children — a
  12px horizontal inset, 32px above the first child, 16px below the last. Nested containers use
  24–32px horizontal and 32–36px vertical padding, to a hard maximum of **6 levels**.
- **Hierarchy is expressed by containment and by stroke weight**, not by size. The nesting stroke
  ramp runs faint → muted → ink → accent, with the accent reserved for the innermost level.
- **Density limits** by detail level: `faithful` ≤24 nodes / ≤32 edges; `balanced` ≤12 / ≤16;
  `simplified` ≤7 / ≤9. Above 9 nodes, zoning becomes mandatory — 2–4 zones, hairline borders,
  uppercase mono zone labels.
- **Alignment:** nodes share baselines. All four measured node boxes sit at `y=240`; the stacked pair
  shares `x=628`. Connectors leave and enter on those shared axes, which is what keeps the routing
  purely orthogonal.

**Size presets** (px, and the viewBox is the same numbers):

| Preset | Size |
|---|---|
| `doc-inline` | 960 × 600 |
| `doc-wide` / `slide-16x9` | 1280 × 720 |
| `slide-4x3` | 1024 × 768 |
| `social-og` | 1200 × 632 |
| `social-square` | 1080 × 1080 |
| `print-a4-landscape` | 1120 × 792 |
| `print-letter-landscape` | 1056 × 816 |

PNG export at `@2`, print presets at `@3`.

## 1.7 Labels, legends, annotations

**Read.**

- **Arrow labels**: 8px mono, centred, tracked 0.06em, painted 8px above the line, coloured to match
  the stroke, each sitting on an **opaque mask rect** so the line does not run through the text.
  Measured mask rects: height 12, `rx=2`, `fill` = paper, widths 32/48/52/60 — i.e. sized to the
  word, not to a grid. (The `rx=2` and the odd widths both break the 4px rule; see §1.10.)
- **Legend**, bottom-left of a reserved strip, below a full-width `0.8`-weight hairline:
  - heading `LEGEND`, 9px mono, weight 500, tracked 0.12em
  - box swatches `14 × 10`, `rx=2`, on an **18px vertical pitch**
  - line swatches **14px long** at `stroke-width=1.2`, on a **16px pitch**, carrying their real
    marker so an arrowhead is legible in the key
  - labels at `x + 20` from the swatch origin, 9px **sans** (not mono), in `muted`, baseline +9 from
    the swatch top
- **Annotations/callouts** are Instrument Serif italic at 14px, attached by a leader line dashed
  `4,3`. Capped at 1–2 per diagram.
- **Naming**: nodes get human names in sans; anything technical (a port, a protocol) becomes a
  sublabel or a tag chip, never part of the name.
- **Emphasis** is only ever: accent hue + one weight step on the stroke + the accent-tinted fill.
  There is no bold, no size jump, no shadow.

## 1.8 Motion

**Read.** Motion is opt-in per diagram, with four modes: `none`, `reveal`, `step`, `loop`.

```
--motion-fast:  160ms
--motion-step:  480ms
--motion-hold:  720ms
--motion-total: 3600ms          (8000ms cited as the ceiling)
--motion-ease:  cubic-bezier(.2, .8, .2, 1)
```

Budgets: transitions 160–600ms; holds 400–1200ms; total autoplay 3–8s; ≤8 semantic steps (target
3–6); ≤2 simultaneous reveals; ≤2 drawn paths; loop cycle ≥3s; translation capped at **24px**.

**What animates.** Only two things. (a) A hidden→visible state: `opacity .12 → 1` and
`translateY(8px) → none`, with `transform-box: fill-box`. (b) A drawn path: `pathLength="1"`,
`stroke-dasharray: 1`, `stroke-dashoffset: 1 → 0`, `animation-timing-function: linear`. A flow token
(`circle r=6`) may translate along a run.

**The reduced-motion contract** is the part worth stealing outright: durations to `0.001ms`,
iteration count to 1, then explicitly force `[data-motion-item] { opacity: 1; transform: none }`,
and `display: none` the decorative-only elements and the playback controls. A parallel `@media print`
block does exactly the same thing. The governing rule: the static end-frame must already carry the
whole meaning.

## 1.9 Implementation technique

**Read**, and confirmed by inspecting the live page.

- **Hand-authored inline SVG with absolute coordinates.** No canvas, no charting library, no layout
  engine, no build step. A human (or an agent) writes the numbers.
- One `<style>` block, tokens on `:root`. The only external request is the Google Fonts stylesheet.
- **Colours are written twice**: as CSS custom properties for the HTML chrome, and as literal hex or
  `rgba()` in SVG presentation attributes. The SVG does not reference the variables.
- Page skeleton is three elements: `<div class="frame"><p class="eyebrow">…</p><h1>…</h1><svg></div>`.
- `svg { width: 100%; min-width: 900px; display: block }`. The `viewBox` does the scaling; the
  `min-width` forces a horizontal scrollbar below 900px.
- **Accessibility contract**: `<svg role="img" aria-labelledby="<slug>-title <slug>-desc">` with a
  non-empty `<title>` first child and a non-empty `<desc>`, IDs prefixed per diagram.
- First painted element is a full-bleed `<rect width="100%" height="100%" fill="paper"/>`. An
  optional 22 × 22 dot pattern (`<circle r="0.9">` at ~10% ink) can be layered over it.
- The animated variant adds ~180 lines of inline IIFE driving a `data-motion-item` / `data-step`
  machine, with prev/play/pause/next/replay controls at 44 × 44px, keyboard `← → Space R Home/End`,
  an `aria-live="polite"` status region, a `<noscript>` fallback, and a `motion-ready` class added
  last so the unscripted document renders the finished frame.

**Reusable conventions worth naming:** the semantic-role token set; the double-rect node; the
`arrow` / `arrow-accent` / `arrow-link` marker triple; `data-motion-item` as the animation hook;
`role="img"` + `title` + `desc`.

## 1.10 Drift between the documentation and the shipped implementation

Worth recording, because it tells us which rules the author actually holds to.

1. **The 4px grid is not honoured** in `template-full.html` (`x=30`, `y=278`, `height=54`, `y=305`,
   `width=822`). The motion template does comply. Label mask rects use `rx=2` and word-sized widths
   throughout. The grid is an aspiration in the docs and a habit in the newer files.
2. **Emphasis stroke is 1.4 in practice, 1.2 in the token table.**
3. **Eyebrow tracking is documented at 0.18em**; measured on the page it is 0.14em at 7px and 0.08em
   at 8px. Arrow-label tracking is documented at 0.06em, measured at 0.08em.
4. **`rule-solid` is `#bfc0c0` in the style guide and `rgba(79,93,117,0.25)` in the full template.**
5. **The stated dark-inversion rule** maps `rgba(28,25,23,X)` → `rgba(250,247,242,X)`, which matches
   neither of its own `ink`/`paper` values — a stale line from an earlier palette.
6. **The gallery shell runs an older skin** than the style guide: `--paper: #f5f4ed`, `--ink:
   #0b0d0b`, `--accent: #f7591f`. The repo acknowledges the pre-baked examples predate the current
   tokens.

*(Inference: the token tables are the intent and the templates are the archaeology. Where they
disagree, I have followed the token table and noted the measurement.)*

---

# Part 2 — Where the system collides with this product

Five constraints from `docs/MOBILE_SPEC.md` and `DESIGN_BRIEF.md` break the source system. Each
forces a specific adaptation, and together they change the answer completely.

## 2.1 We may not put text in SVG

`MOBILE_SPEC.md` §7.4 is unambiguous: no raster images anywhere, and **no text baked into any image,
raster or vector**. Card faces, ranks, suit glyphs, seat labels and the cheat sheet are all live DOM
text — because text in an image does not scale with OS text size, does not reflow at 200% zoom, is
invisible to screen readers, cannot be selected, copied or translated, and prints at screen
resolution. Decorative inline SVG is permitted **for non-text ornament only**.

The source system puts *every* label in `<text>`. That approach is unavailable to us.

**Adaptation.** Our diagrams are **DOM-first**. Geometry (boxes, rules, containers, the seat ring)
comes from CSS box model, borders, `border-radius`, grid and pseudo-elements. Labels are real HTML
text. Where a genuine curve or a connector is unavoidable, it is a **decorative** `data:image/svg+xml`
background-image carrying no text — permitted by §7.4 and free of a network request. **Measured
(ours): one such ornament costs 244 bytes gzipped.**

## 2.2 Our minimum type size is 13px, not 7px

`MOBILE_SPEC.md` §7.1 sets an absolute floor of **13px for any text anywhere**, and §7.2 requires
**4.5:1** for all text under 24px, in **both** light and dark. The source's 7px eyebrows, 8px arrow
labels, 9px sublabels and 9px legend text are all illegal here — and so is its `soft` role, and its
0.4-opacity micro-labels, which do not clear 4.5:1.

**Adaptation.** The type ramp compresses to three sizes (13 / 15 / 17px) and every colour that
touches text clears 4.5:1. There is no micro-label tier at all. Anything that wanted to be a 7px
eyebrow either becomes a 13px label or gets deleted — which, by §1.1's own logic, is usually the
better outcome.

## 2.3 The diagrams cannot be figures, because there is nowhere to put a figure

The shell is five fixed zones (`MOBILE_SPEC.md` §4.2): header 48px, table 200px, annotation flex
116–206px, hand 132px, nav 64px + safe area. Only the annotation zone flexes, and at the tight case
it is 116px — which must already hold a heading, up to 180 characters of body copy, and a 44px
button. **There is no room for an illustration next to the copy.**

**Adaptation, and the central decision in this document.** We do not add figures. **The interface
already contains the diagrams; we style them into being.** The six seats *are* the table diagram. The
nine chips *are* the half-suit diagram. This costs almost nothing, cannot go stale, and is the only
route that respects the `.tsx` freeze.

## 2.4 No `.tsx` may be edited

`DESIGN_BRIEF.md` §2–3: styles, `data-*` hooks, `@media`, `@supports`, custom properties and
pseudo-elements are ours; markup is not. Every class is pre-declared and must not be renamed, and no
class may be added to a component.

This is survivable because the components already expose exactly the hooks a diagram needs:

| Diagram | Existing markup | Hooks already present |
|---|---|---|
| Nine half-suits | `CheatSheet` `.halfSuits` — 9 `<li>`, each with name, range, six `PlayingCard`s | `[data-half-suit]`, `[data-ninth]` |
| Nine half-suits (rail) | `ScoreRail` `.chips` — 9 `<li>` | `[data-state]`, `[data-ninth]`, `[data-spotlight]` |
| The table | `TableView` `.seats` — 6 `<li>` | `[data-seat]`, `[data-team]`, `[data-you]`, `[data-active]`, `[data-out]`, `[data-askable]`, `[data-spotlight]` |
| Four gates | `CheatSheet` `.gates` — 4 `<li>` | `[data-gate="opponent\|half-suit\|own-card\|target-has-cards"]` |
| Declare outcomes | `CheatSheet` `.outcomes` — 3 `<li>` | `[data-outcome="win\|lose\|void"]` |
| Hit / miss | `LogPanel` entries | `[data-kind]`, `[data-hit]`, `[data-outcome]` |

Every diagram below is a CSS treatment of one of those six. **Nothing in this document requires a
markup change**, with one flagged exception in §4.4.

## 2.5 The byte budget is the whole argument

Total first load ≤ **98 KB** compressed, 120 KB hard ceiling. **Measured (ours), from `dist/`:** the
JS bundle is **73,741 bytes gzipped** (72.0 KB). Web fonts are budgeted at **0 KB, mandatory**;
raster images at **0 KB, mandatory**. CSS gets 12 KB.

**Measured (ours):** a representative skeleton implementing tokens plus all five diagrams below —
grids, seat ring positioning, gate chain, outcome branches, hit/miss rules — gzips to **1,213
bytes**. Projected to a finished layer with dark mode, print rules, focus states and responsive
steps, *(inference)* **≈ 3.5 KB gzipped**, which is 29% of the CSS budget.

The source's approach — three webfont families over a Google Fonts request — would cost more than the
entire remaining budget on its own, before a single diagram was drawn.

---

# Part 3 — Tokens we should define

Namespaced `--dg-*` so they never collide with app tokens. Every colour below is **measured (ours)**
against the paper it sits on, with the ratio stated. Light values are defined on bare `:root`; dark
values are redefined under `prefers-color-scheme: dark` only.

## 3.1 Surface and ink

```css
:root {
  --dg-paper:      #fdfaf2;   /* warm off-white; never pure white */
  --dg-paper-2:    #f4efe2;   /* recessed / container fill */
  --dg-ink:        #1a1710;   /* 17.15:1 on paper */
  --dg-muted:      #55504a;   /*  7.65:1 on paper — secondary text */
  --dg-soft:       #6b665c;   /*  5.47:1 on paper — still AA at 13px */
  --dg-rule:       #8f8a7e;   /*  3.30:1 — meaningful borders, AA for UI boundaries */
  --dg-hair:       rgba(26, 23, 16, .14);  /* decorative separators only */
}

@media (prefers-color-scheme: dark) {
  :root {
    --dg-paper:    #14130e;
    --dg-paper-2:  #1e1c15;
    --dg-ink:      #f4f1e8;   /* 16.47:1 */
    --dg-muted:    #a9a499;   /*  7.49:1 */
    --dg-soft:     #948f84;   /*  5.78:1 */
    --dg-rule:     #6e695e;   /*  3.41:1 */
    --dg-hair:     rgba(244, 241, 232, .16);
  }
}
```

**The one real difference from the source:** its `soft` role is a micro-label colour that does not
reach AA. Ours does, at 5.47:1, because our floor is 13px and 13px is body text. We have no tier
below `soft`.

## 3.2 The accent, as a three-step ramp

The reference site studied in `docs/DESIGN_INSPIRATION.md` has **two documented contrast failures**,
both from using one amber for fills *and* for text. We fix that structurally by splitting the accent
into three tokens by job, so it is impossible to use the wrong one:

```css
:root {
  --dg-accent-tint: rgba(224, 145, 42, .14);  /* fill only — no contrast requirement */
  --dg-accent-line: #b87214;   /* 3.69:1 — borders, rules, markers (needs 3:1) */
  --dg-accent-ink:  #8a5207;   /* 6.12:1 — accent as text (needs 4.5:1) */
}
@media (prefers-color-scheme: dark) {
  :root {
    --dg-accent-tint: rgba(224, 145, 42, .18);
    --dg-accent-line: #e0912a;   /*  7.31:1 */
    --dg-accent-ink:  #efb65c;   /* 10.20:1 */
  }
}
```

**Rule: at most two accented elements per diagram**, taken directly from the source. The accent means
*"this is what the current step is about"* — never decoration, never a category.

## 3.3 Team and suit hues

The source insists on one accent and no rainbow. We cannot comply literally, and the reason is
principled rather than an excuse: **in our product colour must also encode game state (which team,
which suit), not just emphasis.** So we split into two orthogonal channels and keep the one-accent
rule strictly *within* the emphasis channel.

```css
:root {
  --dg-blue: #123e75;   /* 10.21:1 on paper — Blue team */
  --dg-red:  #b2461c;   /*  5.32:1 on paper — Red team */
}
@media (prefers-color-scheme: dark) {
  :root { --dg-blue: #6fa6e8;  /* 7.35:1 */  --dg-red: #f3b79e;  /* 10.70:1 */ }
}
```

Measured luminance separation between the two: **1.92:1 light, 1.46:1 dark.** That is *not* enough on
its own — which is exactly why `MOBILE_SPEC.md` §7.3 requires team identity to be carried by **token
shape plus a text marker**, with colour as reinforcement only. Colour is the third channel here, not
the first. Never red/green.

**Four-colour suits**, per §7.3, chosen for a staggered luminance ladder and reusing the team hues
rather than adding new ones — five content hues total across the whole product:

| Suit | Light | On card face | Dark | On card face |
|---|---|---|---|---|
| ♠ spades | `#17130c` | 17.74:1 | `#edeae1` | 14.17:1 |
| ♣ clubs | `#14532d` | 8.73:1 | `#5fbf87` | 7.54:1 |
| ♦ diamonds | `#1b4f97` | 7.71:1 | `#7fb4f0` | 7.86:1 |
| ♥ hearts | `#b2461c` | 5.32:1 | `#f3b79e` | 8.45:1 |

**Stated honestly: the clubs/diamonds pair separates by only 1.13:1 in luminance (1.04:1 dark).**
Four hues that all clear 4.5:1 on one paper cannot also be well separated from each other — the
problem is over-constrained. This is survivable *only* because §7.3 already makes the **glyph the
primary channel** and colour the reinforcement. Do not let any diagram rely on suit hue alone.

## 3.4 Geometry, type and motion

```css
:root {
  /* 4px rhythm, inherited from the source and actually honoured */
  --dg-u1: 4px;  --dg-u2: 8px;  --dg-u3: 12px;
  --dg-u4: 16px; --dg-u6: 24px; --dg-u10: 40px;

  /* radii — one step larger than the source, because our nodes are touch targets */
  --dg-r-sm: 4px;   /* chips, pips */
  --dg-r-md: 8px;   /* node boxes, cells */
  --dg-r-lg: 12px;  /* containers, Blue-team seat tokens */

  /* strokes — in px, not SVG user units, and never below 1px */
  --dg-s-hair:   1px;     /* hairline borders */
  --dg-s-line:   1.5px;   /* meaningful borders (3:1 required) */
  --dg-s-strong: 2px;     /* emphasis */
  --dg-s-focus:  3px;     /* focus ring — MOBILE_SPEC §7.2 */

  /* type — three sizes, floor 13px */
  --dg-label: 13px;   /* ranges, counts, captions */
  --dg-name:  15px;   /* node / cell names, weight 600 */
  --dg-lead:  17px;   /* anything a learner reads as a sentence */
  --dg-track: .08em;  /* uppercase labels only */

  /* touch */
  --dg-node-min: 44px;   /* MOBILE_SPEC §6.1 */
  --dg-node-gap:  8px;   /* minimum between adjacent targets */

  /* motion — 2 curves, 2 bands, per DESIGN_INSPIRATION §11.1 */
  --dg-ease: cubic-bezier(.2, .8, .2, 1);
  --dg-fast: 120ms;   /* state change */
  --dg-slow: 240ms;   /* zone-level change */
}

@media (prefers-reduced-motion: reduce) {
  :root { --dg-fast: 0ms; --dg-slow: 0ms; }
}
```

**Zeroing the tokens is the reduced-motion mechanism** — `DESIGN_BRIEF.md` §4.5 and
`DESIGN_INSPIRATION.md` §11.14 both call for this rather than a second stylesheet. The global
`!important` block already in `src/index.css` is the belt; this is the braces, and it means no
individual diagram needs its own reduced-motion rule.

## 3.5 Rules that bind every diagram

1. **Max 2 accented elements.** From the source, adopted wholesale.
2. **Max 9 primary elements.** Ours are all 9 (half-suits), 6 (seats), 4 (gates) or 2 (outcomes), so
   this never binds — but it is the cap if anyone adds one.
3. **Shape encodes category; colour reinforces.** Team = radius. Suit = glyph. State = border style.
4. **Every stroke that carries meaning is ≥1.5px and ≥3:1.** 1px hairlines are decorative only.
5. **Nothing is emphasised by size.** Emphasis is accent hue + one stroke step, exactly as the source
   does it. Size is reserved for hierarchy of *type*, not of *importance*.
6. **No shadows. No gradients on diagram furniture.** Borders replace shadows.
7. **Every diagram is complete and legible with motion off, at 200% text scale, at 320px, in both
   schemes, and on paper.** If it fails any of those five, it is not finished.

---

# Part 4 — Per-diagram specifications

Five diagrams. Each is a CSS treatment of markup that already exists.

Sizes are given at the **320px floor** (content width 296px after 12px page padding) and at
**1280px** (content width 1265px; the cheat sheet article is capped, see each spec). Byte costs are
gzipped and *(inference)* extrapolated from the 1,213-byte measured skeleton.

---

## 4.1 D1 — The nine half-suits

**The single most important thing a beginner must grasp**, and the one the whole variant turns on.

### What it must communicate

1. 54 cards divide into **nine sets of six**, exactly, with nothing left over.
2. Every suit contributes **two** sets — a low half (2–7) and a high half (9–A). That is eight.
3. The **ninth is different in kind**: four 8s plus both jokers.
4. Nine is **odd on purpose**, and **five wins** — so the game can end with sets still on the table.

Point 4 is new and is the thing most likely to be got wrong: the guide must not imply all nine get
played. `src/tutorial/viewmodels.ts` already says *"Play stops at five, so these may never be
played."*

### Surfaces

It appears three times, at three densities. Same idea, same tokens, three sizes:

| Surface | Markup | Density |
|---|---|---|
| Score rail | `ScoreRail` `.chips` — 9 chips, always on screen | Glyph only |
| Score sheet | Same 9 chips, in the sheet | 3 × 3 grid, labelled |
| Cheat sheet | `CheatSheet` `.halfSuits` — name + range + 6 cards | Full matrix |

### Shapes and layout

A **3 × 3 grid**, not a row of nine. `MOBILE_SPEC.md` §4.7 already argues this: nine is a friendlier
number than eight on a phone precisely because it squares. The grid *is* the argument — a learner
sees a 3 × 3 block and reads "nine" without counting.

Reading order is row-major: row 1 low clubs / low diamonds / low hearts; row 2 low spades / high
clubs / high diamonds; row 3 high hearts / high spades / **Eights & Jokers**. The ninth therefore
lands in the **bottom-right corner** — the terminal cell, which is where the eye stops.

Each cell:
- `border: var(--dg-s-hair) solid var(--dg-rule)`, `border-radius: var(--dg-r-md)`,
  `background: var(--dg-paper)`, `padding: var(--dg-u2)`
- name at `--dg-name` / 600 / `--dg-ink`
- range ("2–7", "9–A", "8s + 2 jokers") at `--dg-label` / `--dg-soft`, `font-variant-numeric: tabular-nums`
- a **six-cell pip strip** — `grid-template-columns: repeat(6, 1fr)`, 2px gaps — which is what makes
  "six" visible without counting

The ninth cell (`[data-ninth="true"]`) is **one of the two permitted accents**:
`border-color: var(--dg-accent-line)`, `border-width: var(--dg-s-strong)`,
`background: var(--dg-accent-tint)`, plus a `::after` reading `9TH · BREAKS 4–4` at `--dg-label`,
`--dg-accent-ink`, uppercase, tracked `--dg-track`. Colour is reinforcement; the **2px border, the
corner position and the text label** each carry it independently.

The **five-to-win threshold** is the second accent, and it belongs on the rail, not the grid: the
existing `score-to-win` element ("2 to win") gets `--dg-accent-ink` and tabular figures. That is a
live count from `ScoreVM.toWin`, so it stays true for free.

Resolved cells use `[data-state="team0|team1"]` → a 2px inline-start border in `--dg-blue` /
`--dg-red` **plus** the existing `.srOnly` text made visible as a 13px caption. Never fill-colour
alone (§7.3.5).

### Size

**At 320px** — 296px content, 3 columns, 12px gaps → cells **90 × 100px**; block **296 × 324px**.
At this width the six `PlayingCard`s are 10px wide, which cannot hold a legible rank, so the pip
strip shows **suit glyph only** at 13px with the rank visually hidden. This is legitimate: the whole
`.halfSuitCards` list is already `aria-hidden="true"` in the component, and the cell's name and range
carry the real content. Nothing is lost; the row's job is to say "six".

**At 1280px** — the cheat-sheet article caps at `max-inline-size: 720px`, centred (measure discipline;
the raw 1265px is far too wide for a reference card). 3 columns, 24px gaps → cells **224 × 132px**,
block **720 × 420px**, with real `PlayingCard`s at 28 × 40px and full ranks.

Between them, one breakpoint at **414px** (`md`), where cards regain their ranks.

### Reduced motion

Fully static. Nothing in this diagram animates in any state. `[data-spotlight]` changes border colour
and weight over `--dg-fast`, which is 0ms under `reduce`, and the changed border remains — the state
is carried by the border itself, never by the transition.

### Byte cost

*(Inference)* **≈ 900 B gzipped** across all three surfaces, sharing one set of cell rules.

---

## 4.2 D2 — The table

### What it must communicate

1. Six seats in a ring; **you are always at the bottom**.
2. Teams **alternate**, so going round the ring reads my-team / their-team / my-team.
3. Therefore your two teammates are the seats **two steps away**, and **you can never ask them**.
4. Who is to act, and who is out.

Point 3 is the payload. `MOBILE_SPEC.md` §4.4 states it as a layout requirement, not decoration:
"the layout must make 'my team, their team, my team…' visually obvious going around the ring."

### Shapes and layout

`TableView` `.seats` becomes a positioned ellipse. Learner (seat 0) pinned at 6 o'clock; seats
proceed clockwise; **positions never reflow**, including when a seat goes out, because the ring is
the learner's spatial anchor.

Seat tokens are **56 × 56px minimum** (clears the 44px target with room). Encoding, four independent
channels:

| Meaning | Channel | Value |
|---|---|---|
| Team | **Shape** | Blue `border-radius: var(--dg-r-lg)` (12px, soft); Red `var(--dg-r-sm)` (4px, square) |
| Team | Text | The existing team marker; colour `--dg-blue` / `--dg-red` as reinforcement only |
| Askable | Border | `[data-askable=true]` → `var(--dg-s-line)` solid `--dg-ink` |
| Not askable | Border | teammates → `var(--dg-s-hair)` **dashed** `--dg-rule`, `opacity: .72` |
| Active | Ring + caret | `outline: var(--dg-s-focus) solid var(--dg-accent-line)`, `outline-offset: 2px`, plus a `::after` caret; other seats step to `opacity: .6` |
| Out | Border + text | `border-style: dashed`, `opacity: .55`, and the component's own "—" count |

The alternating radius is the whole trick: 12 / 4 / 12 / 4 / 12 / 4 round the ring makes the pattern
unmistakable at a glance, in greyscale, at 320px, and it costs six declarations.

The ring itself is the **one decorative ornament** in the system — a dashed ellipse as a
`data:image/svg+xml` background-image on `.seats`, carrying no text. **Measured (ours): 244 B
gzipped.** It is `aria-hidden` by construction (a background image) and may be dropped entirely
without loss.

### Size

**At 320px** — content 296px; zone 2 is a fixed 200px, of which 180px is the ring and 20px the log
ticker. Ellipse `rx: 120px`, `ry: 62px`, tokens 56 × 56px. The tightest gap (seats 1↔2 on the flank)
is ~14px, clearing the 8px minimum separation.

**At 1280px** — zone heights must not change between steps or breakpoints (`QA_DESKTOP.md`
criterion 5), so the ring stays **180px tall**. Cap `.seats` at `max-inline-size: 480px`, centred:
`rx: 210px`, `ry: 62px`, tokens 64 × 64px. Letting the ellipse stretch to 1265px would turn the ring
into a flat line and destroy the "round the table" reading.

### Reduced motion

The active-seat opacity step (`.6 → 1`) is the only transition, at `--dg-fast` (120ms), on `opacity`
only — compositor-only, one property, one element class. Under `reduce` it is 0ms and the end state
is identical, because the marker is an outline plus a caret plus the accessible-name suffix, none of
which is animated. Nothing pulses; `MOBILE_SPEC.md` §8.2 forbids looping animation outright.

### Byte cost

*(Inference)* **≈ 800 B gzipped**, plus 244 B if the ring ornament ships. Six absolute-position rules
dominate and compress well.

---

## 4.3 D3 — The four legality gates

### What it must communicate

An ask must pass **all four** checks, and failing **any one** makes it illegal:

1. Ask an **opponent** — never a teammate.
2. You must **already hold a card of that half-suit**.
3. You may not ask for a card **you already hold**.
4. The person you ask must **still have cards**.

The word that matters is *all*. A list reads as "here are four things"; a **chain** reads as "you
must get through four things". The engine agrees — `lib/engine` evaluates them in order and returns
`TARGET_TEAMMATE`, `NO_CARD_OF_HALF_SUIT`, `ASKING_OWN_CARD`, `TARGET_OUT`.

### Shapes and layout

`CheatSheet` `.gates` is already an `<ol>` with four `data-gate` values — a numbered chain with no
markup change. Treatment:

- `counter-reset` / `counter-increment`, with `::before` painting a **24px numbered disc**:
  `border-radius: 50%`, `1px solid var(--dg-rule)`, `background: var(--dg-paper)`, number at
  `--dg-label` / `--dg-muted`
- a **2px `border-inline-start` in `--dg-rule`** running down the list, which the discs sit on top of
  — this is the chain, and it is one declaration
- each row `min-block-size: var(--dg-node-min)` (44px), `padding-inline-start: var(--dg-u10)` (40px),
  gap `var(--dg-u2)` (8px), text at `--dg-lead` (17px)
- the fourth row's border segment is `--dg-accent-line` and its disc gets `--dg-accent-ink` — the
  single accent, marking "pass this one and the ask is legal"

In `AskChoice`, the same `data-gate` vocabulary drives wrong-answer feedback: the violated gate's row
takes `border-inline-start-color: var(--dg-red)` and a `✕` glyph in `::before`. Glyph plus text,
never colour alone (§7.3.6).

### Size

**At 320px** — vertical chain, 296px wide, 4 rows × 48px + 3 × 8px gaps = **296 × 216px**.

**At 1280px** — the chain turns horizontal inside the 720px article:
`grid-template-columns: repeat(4, 1fr)`, 24px gaps → four **168 × 120px** cells, block
**720 × 120px**, with the connecting rule becoming a `border-block-start` and a `›` separator in each
cell's `::after` except the last. Left-to-right reads as sequence just as top-to-bottom did.

One breakpoint, at **768px**.

### Reduced motion

Entirely static. No transitions at all.

### Byte cost

*(Inference)* **≈ 450 B gzipped**, including the horizontal variant.

---

## 4.4 D4 — What happens when you declare

### What it must communicate

**Two outcomes, and only two:**

1. All six named correctly → **your team scores the half-suit**.
2. Anything else → **the opposing team is awarded it**.

Plus the rule that surprises everyone: **your turn continues either way.**

### ⚠ This diagram sits on top of a rule change that has not finished landing

The rules changed: **the game ends the moment a team wins its fifth half-suit**, and **there is no
void outcome** — any incorrect declaration awards the half-suit to the opposing team.

**The engine and the view models are already correct:**

- `src/tutorial/viewmodels.ts:72` — *"A half-suit is either still in play or awarded to a team. There
  is no void state."* `HalfSuitState` is `'open' | 'team0' | 'team1'`.
- `src/tutorial/viewmodels.ts` — `winner` is *"never a tie"*; `toWin` counts down from
  `HALF_SUITS_TO_WIN`.
- `lib/engine/reduce.ts:234` — *"with no void outcome…"*; `lib/engine/invariants.ts:49` — *"there is
  no void to account for."*

**The copy, the markup and the rules document are not:**

| Location | Stale content |
|---|---|
| `src/components/CheatSheet.tsx:63–65` | A third `<li data-outcome="void">` — "void, nobody scores" |
| `src/components/CheatSheet.tsx:98` | "Only a void can still cause a draw." |
| `src/tutorial/script.ts` — step `three-outcomes` | Titled "A claim ends in one of three ways" |
| `src/tutorial/script.ts:309, 415` | "now void", "the game ends in a draw" |
| `src/tutorial/script.ts` — step `why-nine` | "Only a void can still cause a draw." |
| `RULES.md` rows 15, 22–23 and §4, §6 | Void documented as a live outcome |
| `DESIGN_BRIEF.md` §6 | "The void outcome … is the counter-intuitive rule the guide exists to teach" |
| `ScoreRail` / `CheatSheet` hooks | `data-state="…\|void"`, `data-outcome="…\|void"` still declared |

All of those files are off limits under `DESIGN_BRIEF.md` §3. **This is a content decision for the
project owner, not something design should paper over.** Two things follow, and I recommend both:

- **This spec describes two outcomes.** No diagram here depends on, or depicts, a void state.
- **Do not use CSS to hide the stale third `<li>`.** Hiding it would make the cheat sheet — the
  artefact people print and leave beside the deck — silently disagree with text that is still in the
  DOM, still in the accessibility tree, and still in the printed page's source. Style it neutrally
  (`--dg-soft`, hairline border, no outcome colour) and **escalate the copy fix**. The `void`
  branches of `data-state` and `data-outcome` can never fire from the engine, so styling them is
  dead code either way.

### Shapes and layout

A **1 → 2 fork**, which is the true shape of the rule: one action, two destinations. `CheatSheet`
`.outcomes` supplies the list.

- `[data-outcome="win"]` — `border-inline-start: var(--dg-s-strong) solid var(--dg-blue)`,
  `::before` content `✓` at `--dg-name` in `--dg-blue`
- `[data-outcome="lose"]` — `border-inline-start: var(--dg-s-strong) solid var(--dg-red)`,
  `::before` content `→` in `--dg-red`

The `→` is deliberate and does the teaching: the half-suit does not vanish, it **moves across the
table**. That is the counter-intuitive part now that void is gone, and an arrow says it faster than
the sentence does.

Both rows: `border-radius: var(--dg-r-md)`, `1px solid var(--dg-rule)`, `padding: var(--dg-u3)`,
`grid-template-columns: auto 1fr`, `gap: var(--dg-u3)`, text at `--dg-lead`.

No accent is spent here — this diagram uses the team hues, which are its actual subject. The turn-
continues note stays as a `.note` caption at `--dg-label` / `--dg-soft`.

### Size

**At 320px** — two stacked rows, each `min-block-size: 64px`, 8px gap → **296 × 136px**.

**At 1280px** — a true fork inside the 720px article: `grid-template-columns: 1fr 1fr`, 24px gap →
two **348 × 96px** cells side by side, block **720 × 96px**, with a shared `border-block-start` above
them and a 24px stem from the "you declare" lead line, drawn as a `::before` on `.outcomes`. Two
destinations side by side reads as a fork; stacked, it reads as a list.

### Reduced motion

Static. No transitions.

### Byte cost

*(Inference)* **≈ 350 B gzipped**.

---

## 4.5 D5 — Hit and miss: who holds the turn

### What it must communicate

- **Hit** — they hand the card over, and **you go again**.
- **Miss** — the turn passes to **whoever you asked**.

`DESIGN_BRIEF.md` §6 calls `[data-hit]` "the single most-read piece of information in the whole
game". This diagram is really two things: a static explanation on the cheat sheet, and a per-entry
treatment in the log that a learner reads thirty-five times.

### Shapes and layout

**A two-branch turn-flow with one loop.** The loop is the point: a hit returns to the same actor.

On the cheat sheet, the two `<li>` under "Your turn" get:

- **Hit** — `border-inline-start: var(--dg-s-strong) solid var(--dg-blue)`, `::before` `↺` in
  `--dg-blue`. The rotation glyph *is* the loop — it says "again" without needing a drawn connector.
- **Miss** — `border-inline-start: var(--dg-s-strong) solid var(--dg-red)`, `::before` `↳` in
  `--dg-red`. The turn steps down and across.

In `LogPanel`, every entry carries the same two-channel encoding on `[data-hit]`:

| State | Border | Glyph | Text |
|---|---|---|---|
| `true` | 2px inline-start `--dg-blue` | `↺` | the existing "— hit" |
| `false` | 2px inline-start `--dg-red` | `↳` | the existing "— miss" |

Entries are `min-block-size: 44px` where tappable, `--dg-label` (13px) minimum, ≤48 characters
(`MOBILE_SPEC.md` §4.8). The log zone is `overflow-y: auto` with the newest entry visible without
scrolling and **no cap in the markup** — `DESIGN_BRIEF.md` §6 is explicit that truncating makes
checkpoint 4 unsolvable, because its evidence is two joker asks many steps earlier.

If the loop is drawn rather than glyphed, it is the second permitted decorative ornament: a
`data:image/svg+xml` arc, no text, ~244 B. *(Inference: the `↺` glyph does the job and the ornament
is not worth its bytes here. Ship the glyph.)*

### Size

**At 320px** — cheat-sheet pair: two rows × 48px + 8px = **296 × 104px**. Log ticker: one line, 20px
text box inside a 44px tap target, full 296px width.

**At 1280px** — cheat-sheet pair as two **348 × 72px** cells side by side inside the 720px article.
The log panel becomes a persistent column rather than a sheet, entries at 48px each, clamped by
`max-block-size` with `overflow-y: auto`.

### Reduced motion

New log entries must **not** animate in when `reduce` is set (`MOBILE_SPEC.md` §8.1.4). The entrance
is a single `opacity 0 → 1` at `--dg-fast`, which the token zeroing turns off. The border and glyph
are present from the first painted frame in both cases, so nothing is communicated by the transition.
`MOBILE_SPEC.md` §8.1.5 names hit/miss as one of the three state changes that must remain perceivable
without motion — the border-plus-glyph pair satisfies that by construction.

### Byte cost

*(Inference)* **≈ 450 B gzipped** across cheat sheet and log.

---

## 4.6 What I considered and cut

| Candidate | Verdict |
|---|---|
| **A 54-card deck anatomy fan** | **Cut.** 54 elements against a 9-element budget, and it teaches nothing D1 does not. The 3 × 3 grid already says "nine sixes". |
| **An endgame / running-out flowchart** | **Cut.** Three branches (drop out, pass, designate) that a beginner meets once, if ever, and that `RULES.md` §5 handles in prose. §1.1's own rule: if a paragraph does the job, don't draw. |
| **A deduction diagram for checkpoint 4** | **Cut.** The reasoning is *"Kofi's two joker hits leave only the 8♠"* — that is a sentence, and drawing it would give away the checkpoint the learner is supposed to solve. |
| **A turn-order ring with directional arrows** | **Cut, folded into D2.** A miss passes the turn to the person you asked, which is *not* the seating order — an arrow ring would teach something false. |
| **A "five to win" progress bar** | **Cut as a diagram, kept as a token treatment.** The existing `score-to-win` element already carries a live count; it needs a colour, not a figure. |

---

# Part 5 — What NOT to take from the source, and why

Ordered by how much damage each would do.

### 5.1 Do not put text in the SVG

The most fundamental rejection. Every label in that system is `<text>`. Under `MOBILE_SPEC.md` §7.4
that is prohibited: text in a vector does not scale with OS text size, does not reflow at 200% zoom,
is invisible to screen readers, cannot be selected, copied or translated, and prints at screen
resolution. **Our diagrams are DOM-first; SVG is permitted only as textless decorative ornament.**

### 5.2 Do not load Instrument Serif, Geist and Geist Mono

Three families over a Google Fonts request. Our webfont budget is **0 KB, mandatory**, and external
requests are prohibited outright — the page must be strictly self-contained. Three families would
also blow the entire remaining budget before a diagram existed.

**Instead:** `system-ui` throughout, and get the mono/eyebrow effect the way the reference site in
`DESIGN_INSPIRATION.md` §3 does — **uppercase plus `letter-spacing: .08em`**, which costs nothing.
Use `font-variant-numeric: tabular-nums` for every count and score, which is where mono was actually
earning its keep.

### 5.3 Do not take the type ramp

7px eyebrows, 8px arrow labels, 9px sublabels, 9px legend text. Our floor is **13px, absolutely**,
and 4.5:1 in both schemes. The source's ramp is built for a screenshot you can zoom; ours is built
for a phone held at arm's length in a lit room while other people talk.

### 5.4 Do not take `soft` at its stated value, and do not take opacity-based text

`soft` (`#7a8399`) and the measured 0.4-opacity micro-labels do not reach 4.5:1. `DESIGN_INSPIRATION.md`
§7.2 records **two real contrast failures** on the reference site from exactly this habit, and
`DESIGN_BRIEF.md` §4.8 says do not inherit them. **Our `soft` is `#6b665c` at 5.47:1**, and text
opacity is never used to create a colour — every text colour is a token with a measured ratio.

### 5.5 Do not take `svg { min-width: 900px }`

This forces a horizontal scrollbar on every phone. `MOBILE_SPEC.md` §11.3 permits **no horizontal
page scroll at any width**, and 320px is a hard floor. Our diagrams reflow; they do not scroll.

### 5.6 Do not take the light/dark mechanism

Two separate HTML files with swapped token values, and literal hex baked into SVG presentation
attributes so the graphic cannot follow a theme at runtime. `index.html` declares
`color-scheme: light dark`; **both schemes render and both must independently meet §7.2.** One
stylesheet, tokens redefined under `prefers-color-scheme: dark`, colours referenced only as `var()`.

### 5.7 Do not take sub-pixel strokes for anything meaningful

`0.8` and `1.0` SVG user units scale with the viewBox and land below one device pixel at phone sizes.
`MOBILE_SPEC.md` §7.2 requires **3:1 for UI component boundaries, card edges and seat token borders**
— a border you cannot see has no contrast ratio. Meaningful borders are **≥1.5px**; 1px is decorative
only.

### 5.8 Do not take the one-accent rule literally

Correct for its context, wrong for ours. That system's colour encodes *emphasis* only, so one accent
is right. Ours must also encode *team* and *suit*, which are game state. **We keep the rule inside
the emphasis channel — at most two accented elements — and add exactly two orthogonal channels
(team, suit) that reuse the same five hues.** Stated plainly so nobody "fixes" it later.

### 5.9 Do not take the animation machine

~180 lines of inline JS, playback controls, a step state machine, `loop` mode, flow tokens
translating along paths. Against a 72.0 KB JS bundle and a 98 KB ceiling that is unaffordable — and
`MOBILE_SPEC.md` §8.2 forbids **infinite or looping animations anywhere**, which removes `loop`
outright, and caps concurrent animation at **2 elements**. Our diagrams are static.

**Do take**, though, the *contract* underneath it: durations to ~0, `[data-motion-item]` forced to
its end state, decorative-only elements and controls hidden, and a `@media print` block that does the
same. That idea is free, and §3.4 implements it by zeroing tokens.

### 5.10 Do not take the dot pattern, the framed container, or the ghost numerals

`22 × 22` dots at 10% ink, `paper-2` container fills, and 40px `rgba(…,0.06)` index numerals are
editorial texture for a hero image on a desktop blog. On a 375 × 650 phone they are noise competing
with a live conversation, they cost contrast, and they print badly. The source itself says the
container should be clean by default and the pattern opt-in. **We take neither.**

### 5.11 Do not take the 4px grid as an absolute

We keep the 4px rhythm for spacing and sizing — it is genuinely useful and §3.4 encodes it. But the
source violates it throughout its own flagship template (§1.10), and two of our hard requirements are
**not** multiples of 4: the **44px** touch target and the **13px** type floor. Where the grid and an
accessibility floor disagree, **the floor wins**, every time.

### 5.12 Do not take a void state into any diagram

Not a flaw in the source — it is our rule change. There is no void outcome. Any incorrect declaration
awards the half-suit to the opposing team, and the game ends at the fifth. See §4.4 for the files
that still say otherwise and need an owner's decision.

---

## Appendix — Verification checklist

Before any diagram in this system is called finished:

- [ ] Legible at **320px** with no horizontal page scroll
- [ ] Legible at **200% text scale** and 200% page zoom
- [ ] Every text colour **≥ 4.5:1**, every meaningful border **≥ 3:1**, in **both** schemes
- [ ] No information carried by colour alone — shape or glyph or text always duplicates it
- [ ] All touch targets **≥ 44 × 44px**, **≥ 8px** apart
- [ ] Complete and correct with `prefers-reduced-motion: reduce`
- [ ] Complete and correct with the stylesheet's colours forced (Windows High Contrast)
- [ ] Prints legibly in black and white
- [ ] At most **2 accented elements**
- [ ] No void state depicted anywhere
- [ ] `npm run build` still under **98 KB** compressed
