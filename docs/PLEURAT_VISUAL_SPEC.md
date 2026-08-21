# pleurat.com — Visual Specification (colour & typography, measured)

**Purpose:** enough numbers to rebuild the reference site's look and feel without seeing it.
**Subject:** `https://www.pleurat.com/` — personal portfolio of Pleurat Shala.
**Inspected:** 2026-08-21, live runtime. **Companion doc:** `docs/DESIGN_INSPIRATION.md` (motion & architecture).
**Scope note:** this is measurement and adaptation. Every value below is a fact read off the running page.
No stylesheet, script, asset or page copy has been reproduced here; techniques are described in my own words.

---

## 0. Method, and how much to trust each number

Screenshots are impossible in this environment — the browser pane does not composite, so `computer{screenshot}`
fails. **Nothing below is derived from looking at pixels.** Everything comes from:

- the CSSOM (`document.styleSheets` → recursive rule walk, including nested and `@media` groups),
- `getComputedStyle` on every element in the live DOM at three viewports,
- `document.fonts`, Resource Timing, and direct HTTP `HEAD`/`GET` of the font and CSS assets,
- WCAG 2.x relative-luminance contrast computed in-page against each element's **nearest opaque painted ancestor**,
  not against an assumed page colour.

Viewports measured: **375 × 812**, **768 × 1024**, **1440 × 900** (DPR 1).

**Readable rule count:** 2,565 across three same-origin sheets (2 inline + `index-*.css` 88 rules +
`theme-*.css` 2,475 rules). Two sheets are cross-origin and unreadable from the page — the Fontshare and
Google Fonts CSS. I fetched the Fontshare one over HTTP separately, so the `@font-face` set is not a gap.

**Prompt-injection check.** All 9 HTML comments, all `<meta>` content, all `aria-hidden` and visually-hidden
text nodes were scanned for agent-directed instructions. **Nothing was found.** The comments are ordinary
developer notes about `noindex` on a private route, social-card tags, JSON-LD, font preconnects and analytics
placement. The only regex hits were the literal string "AI" inside the site's own page title. **No content on
that site attempted to instruct me.**

---

## 1. Corrections to `docs/DESIGN_INSPIRATION.md`

That document is largely right about motion and architecture. It is wrong or incomplete in six places that
matter for colour and typography. Evidence is given for each.

| # | `DESIGN_INSPIRATION.md` says | Actually | Evidence |
| --- | --- | --- | --- |
| 1 | §7.1: the palette is the warm paper/amber set (implying one system) | There are **two stacked, disagreeing token layers**. A superseded global layer on `:root` (67 tokens, **lime** accent `#C0EB3A`, cool ink `#0F1524`) and the live layer on `.site-root` (44 tokens, warm paper/amber). The lime layer still paints two things — see #2 and #3. | CSSOM: `:root` declares `--lime: #C0EB3A`, `--ink: #0F1524`, `--bg: #c2ffa8`; `.site-root` declares `--sv-ink: #16140E`, `--sv-amber: #F3B44A`. Both are live rules in `theme-*.css`. |
| 2 | §5 / §10.1: "Focus: `outline: 2px solid <amber>`; global on `:focus-visible`" | The global focus rule uses `var(--focus-ring)`, which resolves to **lime `#C0EB3A`**, not amber. `--focus-ring: var(--lime)` is set on `:root` and **`.site-root` never overrides it.** Contrast of that ring against the cream page is **1.35:1** — effectively invisible. The only amber focus ring on the whole site is one rule scoped to the theme toggle. | `getComputedStyle(document.querySelector('.site-root a')).getPropertyValue('--focus-ring')` → `#C0EB3A`. Only `.sv-lights:focus-visible` sets `2px solid var(--sv-amber-2)`. |
| 3 | (not mentioned) | **`::selection` is lime**: `#C0EB3A` background, `#10160A` text (13.31:1). On a warm cream page. Another survivor of the previous design. | Single global `::selection` rule; no `sv-`scoped override. |
| 4 | §5 / §11.12: "Hover lift `translateY(-2px)` via a `--lift` token… Press `scale(0.965)`… **the 2px lift is the entire hover-elevation system**" | **`--lift` and `scale(0.965)` are dead code.** They are only referenced by `.hv-pill`, `.btn-lime`, `.hx-stack-btn`, `.ui-btn-ghost`, `.ui-card` — **zero instances of any of those classes exist in the DOM.** The shipped hover system has no lift and no press state at all. | `document.querySelectorAll('.hv-pill, .btn-lime, .hx-stack-btn, .ui-btn-ghost, .ui-card').length === 0`. The one live transform-on-hover is `.sv-trial:hover { translateY(-3px) }` plus image `scale(1.03–1.04)`. |
| 5 | §6.2/§6.3: hero H1 is `clamp(37px, 4.05vw, 64px)`, mobile H1 `clamp(32px, 9.5vw, …)` | The **generic** `h1` uses `clamp(37px, 4.05vw, 64px)`. The **hero** `h1` is overridden below 760px to `clamp(35px, 9.5vw, 45px)` with its own `line-height: 1.14` and `letter-spacing: -0.032em`. Mobile H2 is `clamp(32px, 8.7vw, 41px)`; measured 32.63px at 375. Mobile body is **16.5px, not 16px**. | `@media (max-width:760px) .sv-hero h1`; `--sv-fs-body: 16.5px` inside `@media (max-width:960px) .site-root`. |
| 6 | §8.1: container tokens are `max / gutter / inset` with desktop `96vw / 28px / 24px` | Correct at 1440, but there are **four** container tiers, not two. Base (>1536px) is `min(1524px, 88vw)` with a **44px** gutter. §8.1's "desktop" is the ≤1536 tier. | `.site-root` base + `@media` at 1536 / 1180 / 960. |

Two things in that document I re-measured and **confirm**: the theme stylesheet is **219,013 bytes decoded**
and **42,909 bytes over the wire (brotli)** — its "213.9 KB / 42.2 KB" figures are right. And only two font
files load.

---

## 2. The colour system

### 2.1 Structure: two layers, one of them vestigial

```
html[data-theme="dark"]        ← legacy layer. Paints ONLY the <body> ground (#050711),
  :root { 67 tokens, lime }       the focus ring, and ::selection.
  └── body  bg #050711
       └── div.site-root       ← live layer. Paints everything you can see.
            { 44 --sv-* tokens, warm paper + amber }
            bg #FFFCF0, color #16140E
```

The two layers are in *opposite* modes right now: `html` carries `data-theme="dark"` while `.site-root` has no
`is-dark`, so the site renders light content on a near-black ground. That deep ground is deliberate — overscroll
reveals near-black under the cream sheet rather than a white flash — but the fact that the legacy layer's dark
mode is what supplies it is an accident of history, not a design decision.

**Every colour in §2.2 onward is the `.site-root` layer unless marked "legacy".**

### 2.2 Complete custom-property inventory — light

All 44 `--sv-*` tokens on `.site-root`, verbatim values, grouped by job. `— ` means the token holds a
non-colour value.

**Surfaces (5)**

| Token | Value | Resolved | Role |
| --- | --- | --- | --- |
| `--sv-page` | `#FFFCF0` | rgb(255, 252, 240) | Page ground. 4% yellow at full luminance; never pure white. |
| `--sv-sheet` | `#FFFDF3` | rgb(255, 253, 243) | Nav panel and footer. **Lighter than the page** — the raised surface is *brighter*, not darker. |
| `--sv-paper` | `#FBF7E6` | rgb(251, 247, 230) | Curtain columns; inverted-block text colour. |
| `--sv-paper-2` | `#F3EDD6` | rgb(243, 237, 214) | Recessed fill: console panel, card hover, row hover. |
| `--sv-tile` | `#EFE9D2` | rgb(239, 233, 210) | Deepest fill: list-item rows, media placeholders, button hover. |

**Ink (3)**

| Token | Value | Role |
| --- | --- | --- |
| `--sv-ink` | `#16140E` | Primary text. Warm near-black (a 22/20/14 charcoal), never `#000`. |
| `--sv-ink-2` | `#57534A` | Body / secondary prose. |
| `--sv-ink-3` | `#8B8577` | Tertiary: micro-labels, muted state, **and the dimmed half of the headline**. |

**Accent (3 + 1 pairing)**

| Token | Value | Role |
| --- | --- | --- |
| `--sv-amber` | `#F3B44A` | The single accent. Used as **fill**: buttons, badges, corner marks, active dot, ruler fill, tab underline. |
| `--sv-amber-2` | `#C77E0A` | Accent as **text** and as a hairline-on-active. |
| `--sv-amber-lt` | `#F9CB80` | Accent hover fill (primary button hover). |
| `--sv-on-amber` | `#16140E` | The text colour used on top of amber fills. |

**Lines (3)**

| Token | Value | Resolved over page | Role |
| --- | --- | --- | --- |
| `--sv-line` | `rgba(22, 20, 14, .16)` | `#DAD7CC` | Structural rules, panel borders, nav underline. |
| `--sv-line-2` | `rgba(22, 20, 14, .08)` | `#ECE9DE` | Hairlines between list rows and grid cells. |
| `--sv-frame` | `rgba(22, 20, 14, .16)` | `#DAD7CC` | Alias of `--sv-line`, used for frames/insets so the two can diverge later. |

**Inverted surface (2)**

| Token | Value | Role |
| --- | --- | --- |
| `--sv-term` | `#16140E` | The dark console/terminal block. |
| `--sv-term-ink` | `#FBF7E6` | Text on it. 17.14:1. |

**Marks and texture (3)**

| Token | Value | Role |
| --- | --- | --- |
| `--sv-mark` | `var(--sv-amber)` | Corner registration brackets. Indirection so marks could de-couple from the accent. |
| `--sv-ruling` | ruled-paper gradient — see §2.7 | Section background texture. |
| `--sv-dots` | dot-grid gradient — see §2.7 | Grid texture. |

**Non-colour tokens on the same block (25):** three font stacks (`--sv-sans`, `--sv-mono`, `--sv-code`), ten
type sizes, four spacing values, four container values, two easing curves, one derived rule-inset expression,
one nav height. Covered in §3 and §4.

**Legacy `:root` colour tokens (still parsed, mostly unused):** `--bg #c2ffa8`, `--lime #C0EB3A`,
`--lime-2 #E2F79A`, `--lime-deep #1A2200`, `--ink #0F1524`, `--ink-2 #383c48`, `--ink-3 #888a94`,
`--ink-4 #c0c1c8`, `--line rgba(15,21,36,.1)`, `--line-2 rgba(15,21,36,.05)`,
`--panel-row rgba(255,255,255,.62)`, `--band-paper #f3f5fa`, `--band-paper-2 #e8ecf5`,
`--band-ground #050711`, plus `--color-*` aliases of the same. **Of these, only `--lime`, `--lime-deep` and
`--band-ground` still affect a pixel** (focus ring, selection, body ground).

### 2.3 Dark theme

Class-toggled: `.site-root.is-dark`, persisted to `localStorage['sv-theme']`, toggled by a **30 × 30 px**
round button (`aria-label="Switch to dark"`). `color-scheme: dark` is set on the wrapper, not on `html`.
An extra `::before` behind the wrapper paints `#0D0C09`.

| Token | Light | Dark | Change |
| --- | --- | --- | --- |
| `--sv-page` | `#FFFCF0` | `#13120D` | inverted |
| `--sv-sheet` | `#FFFDF3` | `var(--sv-page)` | **collapses** — no raised surface in dark |
| `--sv-paper` | `#FBF7E6` | `#17160E` | inverted |
| `--sv-paper-2` | `#F3EDD6` | `#1F1C11` | inverted |
| `--sv-tile` | `#EFE9D2` | `#221F13` | inverted |
| `--sv-ink` | `#16140E` | `#F1EEE6` | inverted |
| `--sv-ink-2` | `#57534A` | `#A4A097` | inverted |
| `--sv-ink-3` | `#8B8577` | `#928C7E` | inverted |
| `--sv-amber` | `#F3B44A` | `#F3B44A` | **identical** |
| `--sv-amber-2` | `#C77E0A` | `#DD922F` | lightened — it is a *text* colour, so it must move |
| `--sv-amber-lt` | `#F9CB80` | `#F9CB80` | **identical** |
| `--sv-line` | `rgba(22,20,14,.16)` | `rgba(241,238,230,.24)` | alpha **raised** 0.16 → 0.24 |
| `--sv-line-2` | `rgba(22,20,14,.08)` | `rgba(241,238,230,.12)` | alpha raised 0.08 → 0.12 |
| `--sv-ruling` | ink @ 5% | paper @ **7.5%** | alpha raised |
| `--sv-dots` | ink @ 16% | paper @ **24%** | alpha raised |
| `--sv-term` | `#16140E` | `#0B0A07` | deepens further |

**Three rules govern the switch, and they are worth stealing exactly:**

1. **The accent fill never moves.** `#F3B44A` is identical in both themes. Only the accent *text* variant moves,
   because only it has a contrast obligation.
2. **Every alpha-based line gets more alpha in dark.** 0.16 → 0.24, 0.08 → 0.12, 5% → 7.5%, 16% → 24%. A
   translucent dark line on light ground and a translucent light line on dark ground do **not** read at the
   same weight; the dark theme needs roughly 1.5× the alpha to match.
3. **The raised surface disappears in dark.** `--sv-sheet` aliases to `--sv-page`. Lifting a surface by making
   it *brighter* works on paper; on a dark ground the same move reads as a glowing panel, so they drop it and
   rely on lines alone.

### 2.4 Roles, and what sits on what

| Role | Light | Dark | Where |
| --- | --- | --- | --- |
| Page ground | `#FFFCF0` | `#13120D` | `.site-root` |
| Ground behind the app (overscroll) | `#050711` (legacy) | `#050711` | `html`, `body` |
| Raised surface | `#FFFDF3` | = page | nav panel, footer, pinned chart panel |
| Recessed surface | `#F3EDD6` | `#1F1C11` | console panel, card hover, row hover |
| Deepest fill | `#EFE9D2` | `#221F13` | list rows, media placeholders |
| Inverted block | `#16140E` w/ `#FBF7E6` text | `#0B0A07` | sign-off block, terminal |
| Primary text | `#16140E` | `#F1EEE6` | headings, names, nav |
| Secondary text | `#57534A` | `#A4A097` | all prose |
| Tertiary text | `#8B8577` | `#928C7E` | micro-labels, roles, dimmed headline half |
| Hairline (rows/cells) | `rgba(22,20,14,.08)` | `rgba(241,238,230,.12)` | card and row separators |
| Border (structural) | `rgba(22,20,14,.16)` | `rgba(241,238,230,.24)` | panels, nav, frames |
| Accent — fill | `#F3B44A` | `#F3B44A` | button, badge chip, corner marks, active dot, ruler fill, tab underline, active row rule |
| Accent — text | `#C77E0A` | `#DD922F` | index numbers, active row label, link hover |
| Accent — hover fill | `#F9CB80` | `#F9CB80` | primary button hover |
| Text on accent | `#16140E` | `#16140E` | button and badge labels |
| Focus ring | **`#C0EB3A`** (legacy lime) | same | global `:focus-visible` — see §6.3 |
| Selection | bg `#C0EB3A`, text `#10160A` | same | global `::selection` |

### 2.5 Measured contrast, by actual rendered usage

Computed in-page at 375 px: for every text-bearing element, foreground resolved against its nearest opaque
painted ancestor. **Eight distinct failing pairings**, every one of them either `--sv-ink-3` or `--sv-amber-2`.

| Ratio | Required | Verdict | Pairing | Size / weight | Example |
| --- | --- | --- | --- | --- | --- |
| **3.18:1** | 4.5 | **FAIL** | `#C77E0A` on `#FFFCF0` | 10.5 px / 400 | list index numbers `01`…`05` |
| **3.21:1** | 4.5 | **FAIL** | `#C77E0A` on `#FFFDF3` | 10.5 px / 400 | footer index numbers |
| **3.57:1** | 4.5 | **FAIL** | `#8B8577` on `#FFFCF0` | 10.5 px / 400 | status/location micro-labels |
| **3.57:1** | 4.5 | **FAIL** | `#8B8577` on `#FFFCF0` | 15 px / 400 | role labels under names |
| **3.60:1** | 4.5 | **FAIL** | `#8B8577` on `#FFFDF3` | 10.5 px / 400 | footer column headings (×6) |
| **3.60:1** | 4.5 | **FAIL** | `#8B8577` on `#FFFDF3` | 15 px / 400 | footer role labels |
| 3.18:1 | 3 (large) | pass | `#C77E0A` on `#FFFCF0` | 33.75 px / 500 | active menu-sheet link |
| 3.57:1 | 3 (large) | pass | `#8B8577` on `#FFFCF0` | 32.6–35.6 px / 500 | dimmed headline half |
| 7.45:1 | 4.5 | pass | `#57534A` on `#FFFCF0` | 12.5–18 px | all body prose |
| 7.51:1 | 4.5 | pass | `#57534A` on `#FFFDF3` | 15–16.5 px | footer prose |
| 10.03:1 | 4.5 | pass | `#16140E` on `#F3B44A` | 15 px / 500 | primary button |
| 12.17:1 | 4.5 | pass | `#16140E` on `#F9CB80` | 15 px / 500 | primary button, hover |
| 17.14:1 | 4.5 | pass | `#FBF7E6` on `#16140E` | — | inverted sign-off block |
| 17.92:1 | 4.5 | pass | `#16140E` on `#FFFCF0` | all | headings, names, nav |
| 18.06:1 | 4.5 | pass | `#16140E` on `#FFFDF3` | all | footer/nav headings |

**Full matrix, every ink on every surface (light):**

| | page `#FFFCF0` | sheet `#FFFDF3` | paper `#FBF7E6` | paper-2 `#F3EDD6` | tile `#EFE9D2` |
| --- | --- | --- | --- | --- | --- |
| ink `#16140E` | 17.92 | 18.06 | 17.14 | 15.69 | 15.13 |
| ink-2 `#57534A` | 7.45 | 7.51 | 7.13 | 6.53 | 6.29 |
| ink-3 `#8B8577` | **3.57** | **3.60** | **3.42** | **3.13** | **3.02** |
| amber-2 `#C77E0A` | **3.18** | **3.21** | **3.05** | **2.79** | **2.69** |
| amber `#F3B44A` | 1.79 | 1.80 | 1.71 | 1.56 | 1.51 |
| amber-lt `#F9CB80` | 1.47 | 1.48 | 1.41 | 1.29 | 1.24 |

**Dark theme (all pass):**

| | page `#13120D` | paper `#17160E` | paper-2 `#1F1C11` | tile `#221F13` |
| --- | --- | --- | --- | --- |
| ink `#F1EEE6` | 16.17 | 15.65 | 14.70 | 14.22 |
| ink-2 `#A4A097` | 7.19 | 6.96 | 6.53 | 6.32 |
| ink-3 `#928C7E` | 5.60 | 5.42 | 5.09 | 4.93 |
| amber `#F3B44A` | 10.21 | 9.88 | 9.28 | 8.98 |
| amber-2 `#DD922F` | 7.35 | 7.11 | 6.68 | 6.46 |

**The dark theme is the accessible one.** Tertiary ink goes from 3.57 to 5.60; accent text from 3.18 to 7.35.
Every failure is in the light theme, and every failure is on 10.5–15 px type — the worst possible pairing of
small and low-contrast.

**Non-text contrast (WCAG 1.4.11, needs 3:1):**

| Element | Ratio | Verdict |
| --- | --- | --- |
| `--sv-line` `#DAD7CC` border on page | 1.40 | decorative only |
| `--sv-line-2` `#ECE9DE` hairline on page | 1.18 | decorative only |
| `--sv-ink-3` `#8B8577` as ruler tick / border | 3.57 | passes |
| `--sv-amber` `#F3B44A` as active-row rule / underline on page | **1.79** | **fails** — amber alone cannot carry state |
| `--sv-amber-2` `#C77E0A` as border on page | 3.18 | passes on page, **fails on paper-2 (2.79) and tile (2.69)** |
| Lime focus ring `#C0EB3A` on page | **1.35** | **fails badly** |

That last row is the site's most serious accessibility defect and the earlier study missed it entirely.

### 2.6 Translucency, blend modes, filters

There are exactly **five** translucency mechanisms on the whole site, and no glassmorphism to speak of.

| Mechanism | Where | Values |
| --- | --- | --- |
| Alpha-composited lines | everywhere | ink at 16% (structural), 8% (hairline); dark: paper at 24% / 12% |
| Alpha text | one status chip | ink at 74% → `#535049`, 7.82:1 |
| `backdrop-filter` | **exactly two elements** | `blur(4px)` on a report sheet, `blur(6px)` on a lightbox nav button |
| `mix-blend-mode` | **exactly one element** | `multiply` at `opacity: 0.28`, an amber layer over a photo band |
| `filter` on imagery | photo bands and plates | duotone: `grayscale(1) contrast(1.12) brightness(1.04)` under the amber multiply layer; elsewhere a flat `saturate(0.94–0.96)` on every framed photo |

**There is no `perspective`, no `transform-style: preserve-3d`, no CSS 3D anywhere.** There is no `<canvas>`
and no WebGL. `saturate(0.94)` applied to every framed image is the quiet one — it is why photographs from
different sources look like they belong to the same publication.

### 2.7 Texture — four gradient recipes, zero image bytes

I confirmed there is **no raster background image of any kind** inside `.site-root` (`background-image` never
contains a `url()` on any element). All texture is gradients.

| Recipe | Construction | Parameters (light / dark) |
| --- | --- | --- |
| **Ruled paper** | A vertical repeating linear gradient: one 1px opaque line, then 4px of nothing. Painted into a `::before` that is inset from both page edges by the same expression the rules use, and pinned with `background-attachment: fixed` so it stays anchored while content scrolls over it. | line colour ink @ **5%** / paper @ **7.5%**; period **5px**; line **1px** |
| **Dot grid** | A radial gradient with the opaque stop at **1.15px** and the transparent stop at **1.25px**. The 0.1px gap is the whole trick — it gives the dot an antialiased edge instead of a stair-stepped one. | dot colour ink @ **16%** / paper @ **24%** |
| **Scanline over photography** | Same primitive as the ruling but paper-coloured and *over* the image. | paper @ **14–22%**, period **3–4px** |
| **Hatching** | A 45° repeating linear gradient, 1px line every 7px, or a two-tone 8px/8px stripe using `--sv-tile` and `--sv-paper-2`. | ink @ **13%** |

`background-attachment: fixed` appears on exactly one selector — the ruled-paper `::before`. That single
declaration is the site's only parallax, and it costs nothing.

**Registration marks.** Section corner brackets are drawn as **two 20 × 20 px, 2 px** amber gradient slices in
a `::after` (one horizontal, one vertical, `no-repeat`, sized `20px 2px` and `2px 20px`), positioned to the
same left/right inset as the rules. The section number is `content: attr(data-badge)` in an amber chip pinned
to the top-left at `--sv-fs-micro` (10.5px) weight 500. The footer repeats the brackets at the bottom corners
using plain 2px borders instead. **Section numbering is therefore markup (`data-badge="FIG. 004"`), not a
component** — which is why it appears on seven different section classes with one rule.

### 2.8 Colours outside the token system

Illustrations carry their own palettes, hard-coded per scene, and they are numerous: I counted **128 distinct
resolved colour values** painted across the page, of which only ~20 are token-derived. The rest are SVG `fill`
and `stroke` values for the articulated figures, circuit-board scene, street scene and sky
(e.g. `rgb(203,213,220)`, `rgb(51,61,82)`, `rgb(142,98,116)`). Two named SVG gradients (`sv-lamp-cone`,
`sv-lamp-glow`, `sv-sky`) and one paint server (`sv-fc`) are referenced by `fill: url(#…)`.

**The principle to take:** the *design system* holds 14 colours. The *illustrations* are allowed their own
palettes and are exempt. Do not try to force artwork through the token set.

---

## 3. Typography

### 3.1 Families and the actual files

**One family carries the entire site: General Sans (Fontshare), at weights 400 and 500 only.**

| Declared | Status | File | Bytes (woff2) |
| --- | --- | --- | --- |
| General Sans 400 | **loaded** | `cdn.fontshare.com/wf/MFQT…/7YY3ZAAE….woff2` | **23,084** |
| General Sans 500 | **loaded** | `cdn.fontshare.com/wf/3RZH…/SB2OEB6I….woff2` | **22,904** |
| General Sans 600, 700 | unloaded | — | — |
| Satoshi 400 / 500 / 700 | unloaded | — | — |
| IBM Plex Mono 400 / 500 (×5 subsets each) | unloaded | — | — |

17 faces are declared; **2 download**. `font-display: swap` on both. Woff, woff2 and ttf are offered; the
browser takes woff2. **Total webfont cost: 45,988 bytes = 44.9 KiB.**

The three font stacks in the token set:

| Token | Value | Note |
| --- | --- | --- |
| `--sv-sans` | `"General Sans", "Helvetica Neue", Helvetica, Arial, sans-serif` | everything |
| `--sv-mono` | `"General Sans", "Helvetica Neue", Helvetica, Arial, sans-serif` | **identical to `--sv-sans`** |
| `--sv-code` | `ui-monospace, SFMono-Regular, Menlo, monospace` | genuinely monospace |

**`--sv-mono` is not mono.** The "technical instrument panel" look — badges, index labels, status chips,
footer column heads, ruler tick labels, caption rails — is produced by **uppercase + wide tracking + small
size + muted colour**, in the same sans as everything else. A real monospace stack exists as a *third* token
and is used in only one place: SVG silkscreen labels drawn on the circuit-board illustration (measured at
11px/+0.08em and 13px/+0.06em). This is the single cheapest idea in the whole reference and it costs zero
bytes.

The legacy layer declares its own `--sans` (`"General Sans", system-ui, -apple-system, sans-serif`) which is
what `<body>` inherits; `.site-root` immediately overrides it.

### 3.2 The size token scale, verbatim

Ten size tokens on `.site-root`. **`vw`-scaled tokens are marked ▲.**

| Token | Base (>960px) | ≤960px | Notes |
| --- | --- | --- | --- |
| `--sv-fs-display` ▲ | `clamp(37px, 4.05vw, 64px)` | unchanged | generic `h1` |
| `--sv-fs-h2` ▲ | `clamp(31px, 3.05vw, 47px)` | `clamp(32px, 8.7vw, 41px)` | **floor rises, slope quadruples** |
| `--sv-fs-h3` ▲ | `clamp(38px, 3.6vw, 56px)` | `clamp(34px, 9vw, 46px)` | same pattern |
| `--sv-fs-h4` | `21px` | `21px` | fixed at every width |
| `--sv-fs-lead` | `19px` | `17.5px` | |
| `--sv-fs-body` | `17px` | `16.5px` | |
| `--sv-fs-sm` | `15px` | `15px` | fixed |
| `--sv-fs-meta` | `12.5px` | `12.5px` | fixed |
| `--sv-fs-micro` | `10.5px` | `10.5px` | fixed |

Plus two one-off expressions found in components:

- Hero `h1`, below 760px: `clamp(35px, 9.5vw, 45px)`
- Mobile menu-sheet links: `clamp(30px, 9vw, 44px)`
- A statement title: `clamp(32px, 3.25vw, 50px)`; case-study metric: `clamp(34px, 3.4vw, 56px)`;
  next-project name: `clamp(30px, 3.4vw, 54px)`; e-book title: `clamp(30px, 3vw, 44px)`.

**The scaling philosophy is explicit in those numbers.** On desktop the viewport term is a *gentle* 3–4vw,
so type barely moves across a wide range and the clamp ceiling does the work. Below 960px the viewport term
jumps to **8.7–9.5vw** and the floor rises. Display type is therefore *nearly fixed on desktop and strongly
fluid on phones* — the opposite of the usual arrangement, and it is what keeps a 375px headline from
collapsing to something that reads as a subhead.

The legacy `:root` layer carries a **second, complete and unused** 17-token size scale (`--fs-micro` … `--fs-ghost`)
with three breakpoint tiers (≤900, 901–1600, ≥1601). It is scaled arithmetically — the ≥1601 tier is exactly
0.85× the 901–1600 tier, which is exactly 1.2× the base. It paints nothing.

### 3.3 The full role table, measured

Every distinct type treatment rendered on the home page, at each viewport. Line-height is given as the
computed px and the ratio. Tracking as computed px and em.

**375 × 812**

| Role | Size | Line-height | Tracking | Weight | Case | Colour |
| --- | --- | --- | --- | --- | --- | --- |
| Hero H1 | **35.63 px** | 40.61 (**1.14**) | −1.14 (−0.032em) | 500 | — | ink / ink-3 for the dimmed half |
| H2 | **32.63 px** | 36.87 (**1.13**) | −0.98 (−0.03em) | 500 | — | ink |
| Menu-sheet link | 33.75 px | 35.78 (1.06) | −1.01 (−0.03em) | 500 | — | ink; **amber-2** when current |
| Project title (h3) | 26 px | 40.30 (1.55) | −0.52 (−0.02em) | 500 | — | ink |
| Section h3 | 23 px | 35.65 (1.55) | −0.58 (−0.025em) | 500 | — | ink |
| Big statistic | 27 px | 27 (**1.00**) | −0.81 (−0.03em) | 500 | — | ink |
| Card name | 18 px | 27.90 (1.55) | −0.36 (−0.02em) | 500 | — | ink |
| Section sub | 18 px | 27.90 (1.55) | normal | 400 | — | ink-2 |
| Lead | **17.5 px** | 27.13 (1.55) | normal | 400 | — | ink-2 |
| Body | **16.5 px** | 25.58 (1.55) | normal | 400 | — | ink-2 |
| Prose body | 16.5 px | 28.05 (**1.70**) | normal | 400 | — | ink-2 |
| Card body | 16 px | 24.80 (1.55) | normal | 400 | — | ink-2 |
| Small / button | 15 px | 23.25 (1.55) | normal | 400/500 | — | ink-2 / ink |
| Eyebrow (13) | 13 px | 20.15 (1.55) | **+1.30 (+0.10em)** | 400 | — | ink-2 |
| Meta | **12.5 px** | 19.38 (1.55) | **+1.25 (+0.10em)** | 400 | **UPPER** | ink-2 |
| Micro (badge/label) | **10.5 px** | 16.28 (1.55) | **+1.26 → +1.89 (+0.12 → +0.18em)** | 400 (500 for the path chip) | **UPPER** | ink-3 / amber-2 |
| Silkscreen (real mono) | 11 px | 17.05 (1.55) | +0.88 (+0.08em) | 400 | — | ink |

**768 × 1024** — the ≤960 token tier is active but the ≤760 hero override is not, so the hero drops to the
generic display token's floor.

| Role | Size | Line-height | Tracking |
| --- | --- | --- | --- |
| Hero H1 | **37 px** | 38.48 (**1.04**) | −1.11 (−0.03em) |
| H2 | **41 px** (clamp ceiling) | 46.33 (**1.13**) | −1.23 (−0.03em) |
| Lead | 17.5 px | 27.13 (1.55) | normal |
| Section sub | 18 px | 27.90 (1.55) | normal |
| Body | 16.5 px | 25.58 (1.55) | normal |

**1440 × 900**

| Role | Size | Line-height | Tracking | Weight |
| --- | --- | --- | --- | --- |
| Hero H1 / display | **58.32 px** | 60.65 (**1.04**) | −1.75 (−0.03em) | 500 |
| H2 | **43.92 px** | 45.68 (**1.04**) | −1.32 (−0.03em) | 500 |
| Section h3 | 29.52 px | 45.76 (1.55) | −0.74 (−0.025em) | 500 |
| Big statistic | 33.12 px | 33.12 (**1.00**) | −0.99 (−0.03em) | 500 |
| H4 / ledger row name | **21 px** | 32.55 (1.55) | −0.42 (−0.02em) | 500 |
| Lead | **19 px** | 29.45 (1.55) | normal | 400 |
| Section sub | 18 px | 27.90 (1.55) | normal | 400 |
| Body | **17 px** | 26.35 (1.55) | normal | 400 |
| Prose body | 17 px | 28.90 (**1.70**) | normal | 400 |
| Nav link | 16 px | 24.80 (1.55) | normal | 500 |
| Small / button label | 15 px | 23.25 (1.55) | normal | 400/500 |
| Card body | 14.5 px | 22.48 (1.55) | normal | 400 |
| Role label | 11 px | 17.05 (1.55) | +1.10 (+0.10em) | 400 UPPER |
| Micro | 10.5 px | 16.28 (1.55) | +1.26 → +1.89 (+0.12 → +0.18em) | 400/500 UPPER |
| Smallest label | 9.5 px | 14.73 (1.55) | +1.33 (+0.14em) | 400 UPPER |

**`font-feature-settings` and `font-variant-numeric` are `normal` on every element on the page.** No tabular
figures, no small caps, no alternates. The "engineered" feel comes entirely from case, tracking and colour.

### 3.4 Measured display-to-body ratio

| Viewport | Display | Body | **Ratio (display : body)** | vs lead |
| --- | --- | --- | --- | --- |
| 375 px | 35.63 | 16.5 | **2.16×** | 2.04× |
| 768 px | 37.00 | 16.5 | **2.24×** | 2.11× |
| 1440 px | 58.32 | 17.0 | **3.43×** | 3.07× |
| *(1280 px, for comparison with the earlier study)* | 51.84 | 17.0 | 3.05× | 2.73× |

The gap deliberately narrows on phones: **the ratio nearly halves from desktop to mobile.** At 1440 the
headline is 3.4× the body; at 375 it is 2.2×. This is the correct direction and most systems get it wrong by
scaling display and body by the same factor.

### 3.5 The rules underneath the numbers

1. **Line-height is a small closed set, not a curve.** The complete set in use is
   `{1.00, 1.04, 1.06, 1.10, 1.13, 1.14, 1.55, 1.62, 1.70, 1.75, 1.90}`. Display sits at **1.04 on desktop**
   and **1.13–1.14 on mobile** (necessary because 9.5vw type wraps far more). Everything from 14.5px to 21px
   sits at exactly **1.55**. Long-form prose goes to **1.70–1.75**. **Nothing sits between 1.14 and 1.55.**
2. **Tracking is signed by size, with no exceptions.** Display and headings are negative (−0.02em at 21px,
   −0.025em at 23–29px, −0.03em at 31px and up, −0.032em on the mobile hero, −0.035em on the biggest metric,
   −0.045em on the boot wordmark — *it tightens monotonically as size grows*). Body is untouched. Uppercase
   micro type is strongly positive (+0.10em at 11–13px, +0.12 → +0.18em at 10.5px — *it opens up as size
   shrinks*). The two curves are mirror images through 15px.
3. **Weight 500 does all the emphasis work; nothing is bold.** Only two weights exist. Hierarchy is size,
   colour and case. The only weight-600 anywhere is the badge chip, and 600 is not even loaded — it synthesises.
4. **Measure is capped in `ch`, never px.** Headings 24ch. Instructional sub-paragraphs 52ch. Generic subs
   54ch. Hero supporting column 44ch. Ledger row leads 46ch. Modal body copy 68ch. Six distinct caps, each
   chosen for its context.
5. **`text-wrap: balance`** on masked headline lines, so a two-line headline never orphans a word.
6. **The eyebrow treatment is one gesture, applied ~15 different ways.** 10.5px, weight 400, uppercase,
   tracking between +0.12em and +0.18em, colour `--sv-ink-3` or `--sv-amber-2` when active, in the same sans
   as everything else. Used for: section badges, card index labels, status chips, ruler tick labels, footer
   column heads, plate captions, stage hints, legal line, run buttons.

---

## 4. Spacing, layout and shape

### 4.1 Container maths — four tiers

Three tokens instead of one max-width, plus a derived expression.

| Token | >1536px | ≤1536px | ≤1180px | ≤960px |
| --- | --- | --- | --- | --- |
| `--sv-max` | `min(1524px, 88vw)` | `96vw` | `98vw` | `100vw` |
| `--sv-gutter` | `44px` | `28px` | `22px` | `13px` |
| `--sv-inset` | `24px` | `24px` | `18px` | `12px` |
| **Text side padding** (`gutter + inset`) | **68 px** | **52 px** | **40 px** | **25 px** |
| `--sv-nav-h` | 62 px | 62 px | 62 px | 56 px |

Measured: at 1440 the container is **1382.4 px** wide with 52 px padding → **1278.4 px measure**. At 375 it is
375 px with 25 px padding → **325 px measure**.

**The gutter/inset split is the single most important layout idea here.** Text aligns to `gutter + inset`;
structural rules, section badges, corner marks, the nav's background panel and the ruled-paper texture all
align to `gutter` alone. So every 1px rule sits **24 px outside the text column on desktop and 12 px outside
on mobile.** That offset is most of why the page reads as typeset rather than templated.

One derived expression positions all of them:
`--sv-rule-x: max(gutter, calc(50% − max/2 + gutter))` — measured at **49.30 px** at 1440 and **13 px** at 375.
It is used for the nav panel, the nav's bottom rule, every full-width hairline, the corner brackets, the badge
chip and the ruled-paper inset. One expression, and the whole page snaps to the same two vertical lines.

**Rendered nav height** (which differs from the token): **67 px** at 1440 (15 px padding × 2 + 37 px content),
**62 px** at 375 (11 × 2 + 40).

### 4.2 Vertical rhythm

| Token | Base | ≤960px | Measured |
| --- | --- | --- | --- |
| `--sv-sp` (section padding) | `clamp(96px, 12vh, 152px)` | `clamp(64px, 8vh, 96px)` | **108 px** @1440×900 · **81.9 px** @768×1024 · **64.96 px** @375×812 |
| `--sv-sp-head` (header→content) | `clamp(46px, 6vh, 78px)` | `clamp(32px, 4.6vh, 48px)` | 54 px @900h · 37.3 px @812h |
| `--sv-sheet-pad` (panel padding) | `clamp(26px, 3.4vw, 54px)` | same | 48.95 px @1440 · 26 px @375 |
| Footer padding | `70px` top / `44px` bottom | same | fixed |

**Section padding is viewport-*height*-relative, not width-relative.** `12vh` on desktop, `8vh` on phones.
Sections breathe on tall screens and compress on short ones. That is unusual and, for a scroll narrative, right.
(The legacy layer carries a `--sec-pad` with a third `≤720px` tier of `clamp(44px, 6.5vh, 56px)`. It is dead.)

Hero: **739 px tall against an 812 px viewport at 375** — deliberately just short of a full screen, so the fold
is always broken.

Document height: **7,711 px** @375, **9,051 px** @768, **8,141 px** @1440. Mobile is not a shortened edition.

### 4.3 Spacing scale actually used

Flex and grid gaps measured across the live DOM, by frequency:
**16 px (×8), 12 px (×7), 8 px (×3), 14 px (×3), 10 px (×2), 6 px (×2), 18 px (×2), 5 / 9 / 24 / 30 px.**
Component paddings: 6×13, 9×15, 11×16, 13×22, 16×26, 26/22/28/18, 30×24×34.

**This is not a modular scale.** There is no 4px or 8px grid; values are chosen per component. That is worth
naming, because it is the one place where the reference is *less* disciplined than a token system should be
and there is nothing to copy.

### 4.4 Shape

**Border-radius is 0 on essentially everything.** Buttons, cards, panels, the console, badges, the terminal,
list rows: all square. The only radii in the stylesheet are:

| Value | Count | Where |
| --- | --- | --- |
| `50%` | 11 | dots, round icon buttons, the theme toggle, LEDs |
| `100px` (`--r-pill`) | 5 | legacy pills only |
| `999px 999px 999px 4px` | 3 | speech bubbles (one square corner as the tail) |
| `8px` (`--r-media`) | 1 | media, and via `max(4px, …)` the focus ring |
| `7px`, `3px`, `2px` | 1 each | one-offs (the nav toggle bars are 2px) |

**Border widths:** 1px everywhere (41 rules of `1px solid var(--sv-line)`, 18 of `1px solid var(--sv-line-2)`),
**2px only for amber** (corner brackets, active tab underline, ruler fill), and a handful of `1px dashed` for
"provisional" content (an empty archive state, a report badge, a trial code block). Dashed = "not final" is a
real signal in this system.

**Shadows are near-absent.** 21 distinct shadow declarations exist; most are inset 1px borders. The only real
drop shadows:

| Value | Where |
| --- | --- |
| `0 8px 18px -12px rgba(22,20,14,.55)` | small floating chip |
| `0 20px 44px -22px rgba(22,20,14,.28)` | the one card that lifts on hover |
| `0 26px 54px -30px rgba(22,20,14,.34)` | floating panel |
| `0 40px 90px -50px rgba(22,20,14,.8)` | lightbox |
| `2px 3px` / `3px 5px` / `14px 16px` at rgba(22,20,14,.05–.07) | **hard-offset, zero-blur** shadows — a print/paste-up effect, not elevation |

Note the negative spread on every blurred shadow: they are all *tighter than the element*, so the shadow reads
as contact, not glow.

**Elevation is expressed as: a 1px line, a slightly different fill, or nothing.** The raised surface is
*brighter* than the page (`#FFFDF3` vs `#FFFCF0`), recessed surfaces are *darker* (`#F3EDD6`, `#EFE9D2`).
That is the whole depth model in light mode, and in dark mode the raised tier is deleted outright.

### 4.5 Breakpoints, from the real media queries

19 distinct conditions. By rule count:

| Condition | Rules | Purpose |
| --- | --- | --- |
| `(prefers-reduced-motion: reduce)` | 18 | motion |
| `(max-width: 960px)` | 7 | **the main breakpoint** — container tokens, nav→hamburger, type tier |
| `(max-width: 900px)` | 5 | legacy type tier |
| `(max-width: 760px)` | 4 | hero H1 override, console removal, mosaic track |
| `(max-width: 1180px)` | 3 | container tier 3 |
| `(min-width: 901px)` | 3 | desktop-only hover |
| `(max-width: 720px)` | 2 | legacy |
| `(max-width: 640px)` | 2 | |
| `(max-width: 1536px)` | 1 | container tier 2 |
| `(min-width: 1601px)`, `(min-width: 901px) and (max-width: 1600px)` | 1 each | legacy type tiers |
| `(min-width: 961px)`, `(max-width: 1040px)`, `(max-width: 860px)`, `(max-width: 700px)`, `(max-width: 680px)`, `(max-width: 520px)` | 1 each | component one-offs |
| `(max-width: 960px) and (min-height: 780px)` | 1 | a tall-phone special case |
| `(pointer: coarse)` | 1 | **one declaration: reset a cursor to `default`** |

**960 is the real breakpoint.** Everything else is a component adjustment.

---

## 5. Interaction

### 5.1 Hover — property deltas, verbatim

There is **no lift and no press** in the shipped layer (see §1 #4). Every hover is a colour or fill change.

| Element | Delta | Duration |
| --- | --- | --- |
| Primary button | background `#F3B44A` → `#F9CB80` | `background .2s, transform .15s` (transform never fires) |
| Ghost button | `box-shadow: inset 0 0 0 1px` from `--sv-line` → `--sv-ink-3` | `.2s` |
| Outline button | background → `--sv-tile`, inset border → `--sv-ink-3` | `.2s` |
| Nav link | `opacity: 1 → 0.62` | `.2s` |
| Brand logo | `opacity: 1 → 0.72` | — |
| Text link | colour → `--sv-amber-2`, border-bottom → `--sv-amber` | `color .25s, border-color .25s` |
| Footer link | colour `--sv-ink-2` → `--sv-ink` | `.3s` |
| Card | background transparent → `--sv-paper-2`; its index label → `--sv-amber-2` | `background .25s` |
| Ledger row | background → `color-mix(in srgb, var(--sv-paper-2) 60%, transparent)`; **and the row expands** | `.2s` / `.45s` |
| Framed photo | `transform: scale(1) → scale(1.03–1.04)` | `.5s cubic-bezier(.22,1,.3,1)` |
| Icon button (pager/run/close) | background → `--sv-amber`, border → `--sv-amber-2` | `background .2s, border-color .2s` |
| Arrow glyph | `translate(3px, -3px)`; rotated variants compose (45° external, 180° back) | `.32s` on `--sv-ease` |

The arrow is sized in **`em` (1.05em)** so it scales with whatever label it sits beside.

**Borders on state change are always `box-shadow: inset 0 0 0 1px`, never `border`.** Nothing reflows, and the
change composites.

### 5.2 Active / current state — the three-signal pattern

The active ledger row changes **three things simultaneously over 0.3 s**, each with its own `transition: color .3s`:

1. The row's title goes `--sv-ink-3` → `--sv-ink`.
2. Its ordinal number and tag go `--sv-ink-3` → `--sv-amber-2`.
3. Its bottom hairline goes `rgba(22,20,14,.08)` → solid `--sv-amber`.

Plus a fourth, structural: its detail panel opens via `grid-template-rows: 0fr → 1fr` over `.45s`.

Other current-state signals: the active nav link grows a **6 px amber circle** 6 px below its baseline
(`opacity 0 → 1`, `translate(-50%, 3px) scale(0.4) → translate(-50%) scale(1)`); the active tab gets a **2 px
amber underline** as an `::after`; the progress ruler's tick swaps from `--sv-ink-3` to `--sv-amber-2` over
`.3s` while a 2 px amber fill bar grows down a 1 px rail `min(62vh, 560px)` tall.

**Universal dim-to-focus:** non-subject elements sit at `opacity: 0.6` and transition to `1` over `0.5s` on
the primary ease. That is the site's one "not the subject right now" signal, used on scenes, chips and blocks.

### 5.3 Focus

| Scope | Rule |
| --- | --- |
| Global `:focus-visible` on `a`, `button`, `[role=button]`, `[tabindex]`, `input`, `textarea`, `select`, `summary` | `outline: 2px solid var(--focus-ring)` = **lime `#C0EB3A`**, `outline-offset: 3px`, `border-radius: max(4px, 8px)` = 8px |
| Theme toggle only | `outline: 2px solid var(--sv-amber-2)`, `outline-offset: 2px` |
| Text input `:focus` | `outline: 0` + `border-color: var(--sv-amber)` |

**1.35:1 against the page.** Do not copy this.

### 5.4 Cursor

**No custom cursor of any kind.** No follower element, no magnetic hover, no blend-mode dot, no cursor swap on
media. `cursor: pointer` on 18 interactive selectors, `grab`/`grabbing` on one draggable pin, `default` on a
disabled pager button, and **a single `@media (pointer: coarse)` rule that resets one cursor to `default`.**
The site proves a "crafted feel" does not need a custom cursor.

### 5.5 Touch targets

At 375 px, **15 of 26 interactive elements are under 44 × 44 px.** Theme toggle 30 × 30. Nav toggle 40 × 40.
Footer links 325 × 31. Brand 95 × 28. Text link 159 × 28. Only the buttons (325 × 49, 46 × 46) and the
mobile menu links (296 × 75) clear it. This is a real defect and §7 rejects it.

---

## 6. Motion (deltas from `DESIGN_INSPIRATION.md` only)

That document's motion section is accurate; I re-measured and confirm the curtain values (8 columns × 12.5vw
+ 1.5px overlap, cover 0.48s, reveal 0.52s, 38 ms stagger reversed on exit), the reveal system
(`translateY(26px)`, `opacity .8s ease, transform .8s cubic-bezier(.2,.8,.2,1)`), the masked headline
(`translateY(140%)`, `.9s cubic-bezier(.2,.85,.2,1)`, 80 ms stagger, `padding-bottom: .22em` /
`margin-bottom: -.22em` descender fix, `text-wrap: balance`), and the disclosure
(`grid-template-rows: 0fr → 1fr`, `.45s`). **86 named keyframes; 41 animations running concurrently.**

Two additions:

- The two live easing tokens are `--sv-ease: cubic-bezier(.2, .8, .2, 1)` and
  `--sv-ease-mask: cubic-bezier(.2, .85, .2, 1)`. The `cubic-bezier(.22, 1, .36, 1)` and the spring
  `cubic-bezier(.34, 1.56, .64, 1)` belong to the **legacy** layer. The menu-morph
  `cubic-bezier(.7, 0, .2, 1)` at `0.34s` is live and is the only ease-in-out.
- Reduced-motion handling is **22 rules**, and the token-zeroing trick (`--lift: 0px; --ar-shift: 0px`) applies
  to the *dead* layer. The live layer handles it by forcing reveal classes to their end state, `display: none`
  on the curtain, and blanket `animation: none` on every illustration.

---

## 7. Mapping to our `--dg-*` tokens

Two constraints are non-negotiable and are enforced below: **we cannot load their fonts**, and **every text
pairing must clear WCAG AA** (4.5:1 body, 3:1 for ≥24 px or ≥18.66 px bold).

Our surfaces are `--dg-paper` and `--dg-paper-2`; a token that will be used as text on *either* must clear
4.5:1 on **both**, so the recessed surface sets the bar.

### 7.1 Colour — light

| Our token | Current | **Recommended** | Reference source | Ratio (current → new) | Note |
| --- | --- | --- | --- | --- | --- |
| `--dg-paper` | `#fdfaf2` | **`#FFFCF0`** | `--sv-page` exact | ink 17.15 → **17.92** | Adopt verbatim. Slightly warmer and brighter; improves every ratio. |
| `--dg-paper-2` | `#f4efe2` | **`#F3EDD6`** | `--sv-paper-2` exact | ink 15.7 (unchanged in kind) | Adopt verbatim. Deeper and yellower than ours. |
| *(new)* `--dg-sheet` | — | **`#FFFDF3`** | `--sv-sheet` exact | ink 18.06 | Add it. The raised surface is *brighter* than the page — this is the reference's signature move and we have no equivalent. |
| *(new)* `--dg-tile` | — | **`#EFE9D2`** | `--sv-tile` exact | ink 15.13 | Add it. Third fill tier for list rows / card backs. |
| `--dg-ink` | `#1a1710` | **`#16140E`** | `--sv-ink` exact | 17.15 → **17.92** | Adopt verbatim. |
| `--dg-muted` | `#55504a` | **`#57534A`** | `--sv-ink-2` exact | 7.65 → **7.45 / 6.53 (p-2)** | Adopt verbatim; clears AA on both surfaces. |
| `--dg-soft` | `#6b665c` | **`#706B60`** | `--sv-ink-3` `#8B8577` **fails** | reference **3.57 / 3.13 FAIL** → ours **5.16 / 4.52 PASS** | **Deviation forced.** Their tertiary ink fails on every surface. `#706B60` is the same hue and saturation, darkened until it clears 4.5:1 on the *worse* ground (paper-2). Keeping our `#6b665c` (5.55 / 4.86) is also fine and safer; `#706B60` is simply the closest we can legally get to their warmth. |
| `--dg-rule` | `#8f8a7e` | **`#8B8577`** | `--sv-ink-3` exact | 3.30 → **3.57 / 3.13 / 3.02** | Adopt verbatim **as a non-text token only**. It clears 1.4.11's 3:1 on all three surfaces and is an improvement on our current value. |
| `--dg-hair` | `rgba(26,23,16,.14)` | **`rgba(22,20,14,.16)`** | `--sv-line` exact | resolves to `#DAD7CC` | Adopt verbatim. |
| *(new)* `--dg-hair-2` | — | **`rgba(22,20,14,.08)`** | `--sv-line-2` exact | resolves to `#ECE9DE` | Add it. The reference uses two hairline weights: 0.16 for structure, 0.08 between rows. We currently have one. |
| `--dg-accent-tint` | `rgba(224,145,42,.14)` | **`rgba(243,180,74,.16)`** | `--sv-amber` at alpha | resolves to `#FDF0D5` on paper | Hue-shift to their amber. No contrast floor — fill only. |
| `--dg-accent-line` | `#b87214` | **keep `#b87214`** | `--sv-amber-2` `#C77E0A` is close but **fails on recessed fills** | ours **3.75 / 3.28 / 3.16 PASS**; theirs 3.18 / **2.79 / 2.69 FAIL** | **Deviation forced.** Their border-amber only clears 3:1 on the lightest ground. Ours clears on all three. Keep ours. |
| `--dg-accent-ink` | `#8a5207` | **keep `#8a5207`** | `--sv-amber-2` `#C77E0A` **fails** | theirs **3.18 / 2.79 FAIL** → ours **6.21 / 5.44 PASS** | **Deviation forced.** The nearest same-hue compliant values are `#A46808` (4.48 on paper — *still short*) and `#976008` (5.12 / 4.48 — also short on paper-2). Only `#8a5207` clears both. |
| *(new)* `--dg-accent-fill` | — | **`#F3B44A`** | `--sv-amber` exact | with `#16140E` text = **10.03:1** | Add it. This is the highest-value colour move available: a **solid amber chip with near-black text** at 10:1 is both the reference's signature and one of the most accessible things on their page. Our current system has no solid-accent surface at all. |
| *(new)* `--dg-accent-fill-hover` | — | **`#F9CB80`** | `--sv-amber-lt` exact | with ink = 12.17:1 | Add it. |
| *(new)* `--dg-on-accent` | — | **`#16140E`** | `--sv-on-amber` exact | — | Add it. Text on any accent fill. |
| `--dg-blue` | `#123e75` | keep | — | 10.21 → **10.36** on `#FFFCF0` | Improves on the new ground. |
| `--dg-red` | `#b2461c` | keep | — | 5.32 → **5.40 / 4.73 / 4.56** | Clears on all three surfaces. |
| `--dg-suit-spades` | `#17130c` | keep (or `#16140E`) | `--sv-ink` | 18.01 / 17.92 | Interchangeable. |
| `--dg-suit-clubs` | `#14532d` | keep | — | **8.87 / 7.76 / 7.49** | Fine. |
| `--dg-suit-diamonds` | `#1b4f97` | keep | — | **7.82 / 6.85 / 6.61** | Fine. |
| `--dg-suit-hearts` | `#b2461c` | keep | — | 5.40 / 4.73 / 4.56 | Fine. |
| *(new)* `--dg-selection-bg` / `--dg-selection-ink` | — | **do not copy** | lime `#C0EB3A` / `#10160A` | 13.31:1 but wrong hue | Their selection is a leftover from a dead design. Use `--dg-accent-tint` background with `--dg-ink` text instead. |

### 7.2 Colour — dark

Their dark palette passes everything. Adopt it wholesale; our current dark values are already close.

| Our token | Current | **Recommended** | Ratio on `#13120D` |
| --- | --- | --- | --- |
| `--dg-paper` | `#14130e` | **`#13120D`** | — |
| `--dg-paper-2` | `#1e1c15` | **`#1F1C11`** | — |
| `--dg-sheet` (new) | — | **`= --dg-paper`** | the raised tier collapses in dark — copy this |
| `--dg-tile` (new) | — | **`#221F13`** | — |
| `--dg-ink` | `#f4f1e8` | **`#F1EEE6`** | 16.47 → **16.17** |
| `--dg-muted` | `#a9a499` | **`#A4A097`** | 7.49 → **7.19** |
| `--dg-soft` | `#948f84` | **`#928C7E`** | 5.78 → **5.60** |
| `--dg-rule` | `#6e695e` | keep `#6e695e` | **3.43** (their line at 24% alpha resolves to `#484741`, 1.9:1 — decorative only) |
| `--dg-hair` | `rgba(244,241,232,.16)` | **`rgba(241,238,230,.24)`** | matches their alpha *raise* rule |
| `--dg-hair-2` (new) | — | **`rgba(241,238,230,.12)`** | |
| `--dg-accent-fill` (new) | — | **`#F3B44A`** — *identical to light* | 10.21 |
| `--dg-accent-line` | `#e0912a` | **`#DD922F`** | 7.31 → **7.35** |
| `--dg-accent-ink` | `#efb65c` | **`#EFB65C`** (keep) | 10.20 → **10.28** |
| `--dg-blue` | `#6fa6e8` | keep | 7.41 |
| `--dg-red` | `#f3b79e` | keep | 10.78 |

**Copy the alpha-raise rule explicitly:** every translucent line gets ~1.5× the alpha in dark
(0.16→0.24, 0.08→0.12, 5%→7.5%, 16%→24%). Our `--dg-hair` currently goes 0.14 → 0.16, which is not enough.

### 7.3 Typography

| Our token | Current | **Recommended** | Note |
| --- | --- | --- | --- |
| `--dg-font` | `ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif` | **keep, unchanged** | This is already the right answer. See §7.4 for what is lost. |
| *(new)* `--dg-font-code` | — | **`ui-monospace, SFMono-Regular, Menlo, monospace`** | Only for real card notation. Costs nothing; matches their third stack exactly. Do **not** add a mono webfont — their own "mono" token is not mono. |
| `--dg-label` | `0.8125rem` (13px) | keep | Their equivalent is 10.5px; ours must be larger because 10.5px at 4.5:1 is unreadable at arm's length. |
| `--dg-name` | `0.9375rem` (15px) | keep | Exactly their `--sv-fs-sm`. |
| `--dg-lead` | `1.0625rem` (17px) | keep | Exactly their desktop `--sv-fs-body`; their mobile is 16.5px. |
| `--dg-display` | `clamp(1.375rem, 2.6vw, 2.25rem)` → **22px at 375**, ratio **1.29×** | **`clamp(1.625rem, 2.6vw, 2.25rem)`** — raise the floor only → **26px at 375** (the `2.6vw` term reaches 26px at a 1000px viewport and the 36px ceiling at 1385px), ratio **1.53×** | **Deviation forced by layout, not by contrast.** The reference hits **2.16×** at 375 because its hero is a near-full-viewport block with nothing else in it; our phone annotation zone is 206 px and a 36 px headline would push the body copy out of view. 26 px is the largest floor that still leaves the instruction readable. Raise further only if the zone budget changes. |
| *(new)* `--dg-display-lh` | — | **`1.14`** | **This matters more than the size.** At 22–26 px with the inherited `line-height: 1.5`, our display type reads as large body copy, not as display. The reference uses 1.14 on mobile and 1.04 on desktop, and that single change does more for the "display" read than 8 px of size would. |
| *(new)* `--dg-display-track` | — | **`-0.03em`** | Their monotonic rule: negative and tightening as size grows. At 26 px that is −0.78 px. |
| `--dg-track` | `0.08em` | **`0.12em`** | Their micro tracking is +0.12 → +0.18em at 10.5 px. Tracking should shrink as size grows, and our label is 13 px, so 0.12em is the correct translation of their 0.14em. |
| *(new)* `--dg-lh-body` / `--dg-lh-prose` | body is `1.5` on `body` | **`1.55` / `1.70`** | Their body line-height is 1.55 *everywhere* and prose is 1.70. Two values, no curve, nothing between 1.14 and 1.55. |
| *(new)* `--dg-measure-head` / `--dg-measure-body` | — | **`24ch` / `52ch`** | Their heading cap is 24ch and instructional copy 52ch. Cap in `ch`, never px. |
| `.dg-eyebrow` weight | `600` | **keep 600** | **Deviation.** The reference uses 400 and relies on General Sans's tall x-height plus 500 for all emphasis. In a system stack at 13 px, 400 uppercase reads anaemic — and weight 500 is not reliably available on Windows (Segoe UI has no Medium; it snaps to 400 or synthesises toward Semibold). 600 is the honest substitute. |

### 7.4 What we lose by not loading General Sans

The stack `ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, …` resolves to **SF Pro** on Apple,
**Segoe UI Variable** on Windows and **Roboto** on Android. Against General Sans:

1. **Weight 500 is not portable.** General Sans ships a true Medium and the reference leans on it for *every*
   heading — nothing on that site is bold. SF Pro and Roboto have real 500s; **Segoe UI does not**, so `500`
   on Windows either snaps to Regular or synthesises. Consequence: our headings will look lighter on Windows
   than on a phone. Mitigation: use 600 for anything under 16 px (labels, eyebrows) and accept 500 for display,
   where the size carries the emphasis anyway.
2. **Metrics differ per platform, so the tracking must be re-checked per face.** −0.03em is tuned to General
   Sans's fairly tight default fit. SF Pro already applies optical tracking of its own at large sizes; Roboto
   is looser. −0.03em is a good starting point on all three but should be verified at 26 px on each.
3. **x-height and apertures.** General Sans has a tall x-height and moderately closed apertures, which is why
   10.5 px uppercase labels remain legible on the reference. Our 13 px floor already compensates; do not try to
   recover their 10.5 px.
4. **Nothing is lost that the design depends on.** Their type system's actual load-bearing parts — one family,
   two weights, a step-function line-height, size-signed tracking, and case-plus-colour instead of weight for
   hierarchy — are all face-independent. **45.0 KiB of webfont buys proportions, not the system.** Against a
   98 KiB total budget with 82 KiB used, those two files alone would be a 2.8× overrun.

### 7.5 Spacing, shape, motion

| Our token | Current | Recommended | Note |
| --- | --- | --- | --- |
| `--dg-u1…u10` | 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 | **keep** | The reference has *no* modular scale (gaps of 5, 6, 9, 14, 18, 22, 26, 30, 44…). Ours is stricter and better. Nothing to copy. |
| `--dg-page-pad` | `12px` | **split into `--dg-gutter: 13px` + `--dg-inset: 12px`** | **The single highest-value layout change.** Align text to `gutter + inset` (25 px) and align every rule, divider, corner mark and badge to `gutter` alone (13 px). That 12 px offset is most of why the reference looks typeset. Their mobile values are exactly 13 and 12. |
| *(new)* `--dg-rule-x` | — | **`max(var(--dg-gutter), calc(50% - var(--dg-content-max)/2 + var(--dg-gutter)))`** | One expression positions every full-width rule and every corner mark. |
| `--dg-content-max` | `1120px` | keep | Their `min(1524px, 88vw)` is a portfolio's proportion, not a tutorial's. |
| *(new)* `--dg-section-pad` | — | **`clamp(48px, 7vh, 96px)`** | Copy the **`vh`**-relative technique (theirs is `8vh` on phones = 64.96 px at 812). Tighter than theirs because our steps are shorter than their sections. |
| `--dg-r-sm/md/lg` | 4 / 8 / 12 | **keep, but set panel radius to 0** | The reference is 0 on every panel, card, button and chip. Radius should carry *only* the team channel (Blue 12, Red 4) and nothing else — otherwise the radius stops encoding anything. |
| `--dg-s-hair` `1px` | | keep | matches |
| `--dg-s-line` `1.5px` | | keep | reference uses 1px; ours is a deliberate accessibility improvement |
| `--dg-s-strong` `2px` | | keep | exactly their amber weight: corner brackets, active tab underline, ruler fill |
| `--dg-s-focus` `3px` | | keep | reference uses 2px + 3px offset in an **invisible** colour. Keep 3px in `--dg-accent-line` (`#b87214`, 3.75:1). |
| `--dg-node-min` `44px` | | **keep, non-negotiable** | The reference fails this on 15 of 26 targets at 375 px. |
| `--dg-ease` | `cubic-bezier(.2,.8,.2,1)` | keep — **exact match** to `--sv-ease` | |
| `--dg-ease-out` | `cubic-bezier(.33,1,.68,1)` | **`cubic-bezier(.2,.85,.2,1)`** *if used for masked headline reveals* | That is their `--sv-ease-mask`, used for exactly one thing. |
| `--dg-fast` `120ms` | | keep, **but add `--dg-state: 300ms`** | Their bands: 150–200 ms micro, **250–300 ms colour/state**, 450–550 ms disclosure/dim, 800–900 ms reveal. Our 240 ms `--dg-slow` sits below their state band; a colour change at 300 ms reads noticeably calmer. |
| `--dg-slow` `240ms` | | keep, add `--dg-disclose: 450ms` | Their auto-height disclosure is 0.45 s and it is worth matching exactly. |
| `--dg-rise-chip/card/zone` | 8 / 12 / 16 | **keep — exact match** | Their chip 8, card 12, scene 16 (scene additionally scales 0.965 → 1). |
| `--dg-press` `0.965` | | **keep, but stop citing the reference** | The 0.965 press exists only in their dead layer. It is still the right call for touch — it is just ours, not theirs. |

### 7.6 Techniques to adopt that are not token changes

1. **Solid amber chip with near-black text (10.03:1)** for the step badge, driven by `content: attr(data-step)`.
   Declarative markup, not a component.
2. **20 × 20 px, 2 px accent corner brackets** as two pseudo-elements at the panel's top corners.
3. **Ruled texture as `repeating-linear-gradient`** — 1 px line every 5 px at 5% ink (7.5% in dark), inset to
   `--dg-rule-x`, zero bytes. Use `background-attachment: fixed` only on a non-scrolling panel.
4. **Dot grid with the 0.1 px stop gap** (opaque at 1.15 px, transparent at 1.25 px) for the antialiased edge.
5. **`saturate(0.94)` on every card face / photograph** so mixed artwork reads as one publication.
6. **Two hairline weights**, 0.16 for structure and 0.08 between rows.
7. **Dashed 1px borders mean "provisional"** — a real, cheap semantic channel we do not currently use.
8. **Borders on state change as `box-shadow: inset 0 0 0 1px`**, never `border`.
9. **The three-signal active row** (text muted→ink, ordinal→accent, hairline 8%→accent, all at 0.3 s).
10. **Dim-to-focus at `opacity: 0.6` → `1` over 0.5 s** as the only "not the subject" signal.

---

## 8. What a screenshot would still tell us

Everything above is geometry and colour. The following are things I measured the *inputs* to but could not
observe the *result* of, and a screenshot would settle each in seconds. If you can get images, get these:

**Composition and visual weight**

1. **Hero at 375 px, above the fold.** I know it is 739 px tall in an 812 px viewport, that the headline is
   35.6 px over three masked lines, and that one line is `--sv-ink-3`. I cannot tell how much of the frame the
   type occupies versus the illustration, whether the block sits optically centred or top-weighted, or whether
   the 25 px margin reads generous or tight at that size. This is the single most useful screenshot.
2. **Whether the dimmed headline half reads as an intentional two-tone or as a rendering fault.** `#8B8577`
   against `#16140E` on the same line at 3.57:1 is a strong move. On paper it could look elegant or broken.
3. **Full-page thumbnails at 375 and 1440.** Section rhythm as a *felt* thing — whether 8vh vs 12vh reads as
   the same page at two sizes — cannot be derived from the padding values.

**Colour in situ**

4. **`#FFFCF0` page against `#FFFDF3` sheet.** A 0.14 ratio difference. I cannot tell whether the nav panel
   and footer are perceptible as separate surfaces at all, or whether the effect only exists in the code.
5. **Amber density.** I know there are 124 amber SVG fills, 8 amber backgrounds and 8 amber text runs. I do
   not know whether the page reads as "one restrained accent" or as noticeably yellow.
6. **The lime focus ring and the lime selection**, actually rendered on cream. My 1.35:1 calculation says
   near-invisible; a screenshot of a tabbed-to button would confirm whether it is invisible or merely bad.
7. **The duotone photo bands** — `grayscale(1) contrast(1.12) brightness(1.04)` under an amber `multiply` at
   0.28. That is a recipe; whether it reads as warm monochrome, as sepia, or as muddy is a visual judgement.

**Texture**

8. **The ruled paper at 5% ink, 1 px every 5 px, on a real display.** At DPR 2 a 1 px CSS line is 2 device
   pixels; at 5% alpha it may be essentially invisible on a phone and clearly visible on a desktop LCD. This
   determines whether we should copy 5% or go heavier.
9. **The dot grid's soft edge** — whether the 0.1 px stop gap actually produces a visibly softer dot.
10. **The hard-offset zero-blur shadows** (`2px 3px`, `14px 16px` at 5–7% alpha). These are a print/paste-up
    device and I cannot tell whether they read as deliberate or as a bug.

**Type rendering**

11. **General Sans at 10.5 px uppercase with +0.18em tracking.** Whether it is genuinely legible at that size
    is the whole justification for our 13 px floor.
12. **Whether weight 500 at 58 px looks like a display weight or like Regular.** This determines whether our
    system-font substitution needs 600 at display sizes.

**Motion**

13. **The 786 ms curtain and the boot-progress-inside-the-wordmark.** I have every timing value and the
    gradient construction; I have never seen it run. Whether it reads as premium or as a delay is exactly the
    judgement we need before deciding whether to build anything like it.
14. **The dim-to-focus at 0.6 opacity on a real six-element group** — whether 0.6 is enough separation, or too
    much.
