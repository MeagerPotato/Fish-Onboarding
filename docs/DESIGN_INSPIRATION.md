# Design Inspiration Reference — pleurat.com

**Prepared for:** the designer/engineer owning the front end of the Fish / Literature onboarding guide.
**Status:** advisory research only. Nothing here has been implemented. No source code was written or changed.
**Subject:** `https://www.pleurat.com/` — the personal portfolio of Pleurat Shala, product designer.
**Date of inspection:** 2026-08-20.

---

## 0. How this was researched, and how much to trust each number

Everything below came from live runtime inspection of the shipped site: the CSSOM (all 2,848 style rules across
5 stylesheets), computed styles on real elements, the Resource Timing and Navigation Timing APIs, the DOM tree,
and instrumented `IntersectionObserver` / `addEventListener` / `requestAnimationFrame` constructors observed
across a client-side route change.

Three caveats, stated up front so you can weight the claims:

1. **No screenshots.** The browser pane in this session was not compositing frames, so image capture failed.
   Every visual claim here is derived from measured CSS and DOM geometry, not from looking at pixels. Where I
   describe how something *looks*, I say so and flag it as reconstruction.
2. **The tab was backgrounded, which froze `requestAnimationFrame`.** The site listens for `visibilitychange`
   (10–14 listeners registered) and pauses work when hidden. As a result the intro sequence never advanced past
   its first frame, and the one JS-driven scroll scene never updated its transform. I could read the full CSS
   definition of every animation, but I could not *watch* them run. Anything about perceived timing is inference
   from the declared values.
3. **Two stylesheets were cross-origin and unreadable** (the Fontshare and Google Fonts CSS). Those only carry
   `@font-face` declarations, so nothing structural is missing.

Values reported as measurements (durations, pixel sizes, hex codes, byte counts, contrast ratios) are directly
observed. Anything else is labelled **[inference]**.

**Prompt-injection check.** I scanned all HTML comments (9 total), all `<meta>` content, all inline scripts, and
every visually-hidden text node for content addressed at an automated agent. **Nothing malicious or
agent-directed was found.** The only comment that mentions crawlers is an ordinary developer note about the
JSON-LD knowledge-graph block being static in the `<head>`. All other hits were normal SEO metadata. No content
on that site attempted to instruct me.

---

## 1. The headline finding: this site does not use Three.js

**There is no WebGL on pleurat.com. There is no `<canvas>` element anywhere on the page. `window.THREE` is
undefined. Three.js is not in the bundle.**

I verified this four ways: `document.querySelectorAll('canvas')` returns zero elements on every route;
`HTMLCanvasElement.prototype.getContext` was monkey-patched and never called by site code; the network waterfall
contains no 3D library and no `.glb`/`.gltf`/`.hdr`/`.ktx2`/`.basis` asset of any kind; and the total JavaScript
payload — 74 KB compressed across *all* scripts including React and the router — is smaller than a minimal
Three.js build on its own.

The stack is: **React 19 + React Router, bundled by Vite, content from Sanity CMS, hosted on Vercel.** The entire
"expensive, crafted, three-dimensional" impression is produced by:

- **Inline SVG scenes animated with CSS `@keyframes`** — 86 named keyframe animations in the stylesheet, mostly
  driving an articulated robot/figure rig (hips, knees, shoulders as separately-transformed SVG groups).
- **`position: sticky` inside an over-tall track** for every pinned scroll scene.
- **`IntersectionObserver` at a 0.16 threshold** for every reveal.
- **CSS custom properties** as the entire design system (67 tokens on `:root`, ~50 more scoped to the app root).
- **Exactly one JS-driven scroll effect** (a photo mosaic that scales and translates), wired through four
  *passive* scroll listeners.

This is the single most important thing in this document. **The look the project owner admires is reproducible
with plain CSS and DOM, at ~330 KB of total page weight, with zero WebGL.** That is extraordinarily good news for
a QR-scanned tutorial on a phone.

The rest of this document therefore reads less like "here is what WebGL bought them" and more like a
specification of a very disciplined CSS design system that you can borrow directly.

---

## 2. First-impression choreography — the first three seconds

### 2.1 The curtain

A fixed, full-viewport overlay sits at `z-index: 500` with `pointer-events: none`. It is built from **8 vertical
columns**, each `12.5vw` wide plus a `1.5px` overlap so no hairline seam shows between them at fractional device
pixel ratios. Each column is painted with the site's paper colour and a 1px-line texture (see §7), and each
carries a **2px amber rule along its bottom edge** — so as the columns slide away, the viewer sees eight bright
horizontal ticks sweep upward off the screen. **[inference: I read the geometry, I did not watch it.]**

Timing, all read from custom properties on the curtain element:

| Phase | Value |
| --- | --- |
| Cover (columns come down) | `0.48s` |
| Reveal (columns exit upward) | `0.52s` |
| Per-column stagger | `38ms` |
| Exit transform | `translateY(-101%)` — the extra 1% guarantees no sliver remains |
| Stagger direction on exit | **Reversed**: delay is `(n − 1 − i) × 38ms`, so the last column leaves first |

Total curtain reveal: `0.52s + 7 × 38ms = 786ms`. The reversal is the craft detail — cover sweeps one way, reveal
sweeps back the other, so the two halves of the transition read as a single gesture rather than a repeat.

### 2.2 The boot label

Centred inside the curtain is the wordmark, at `max(42px, 5.6vw)`, weight 500, `letter-spacing: -0.045em`,
`line-height: 0.92`. One letter is amber; the rest is ink.

The loading progress is **rendered inside the letterforms themselves**. A horizontal gradient is used as the text
fill via `background-clip: text`, with the gradient's colour stop positioned from a `--p` custom property
(0 → 100). The unfilled portion of the word sits at roughly 17% alpha. The result: the name fills up left-to-right
like a progress bar made of type. There is no separate spinner, bar, or percentage readout anywhere.

The label itself fades in over `0.3s` via an `is-on`/`show-label` class, so a fast connection never flashes it.

### 2.3 The reveal order after the curtain lifts

Once the curtain clears, content arrives in a fixed hierarchy:

1. **Headline** — set as separate `<span>` lines, each in an `overflow: hidden` clip box. The inner span starts at
   `translateY(140%)` and travels to zero over **`0.9s`** on `cubic-bezier(.2, .85, .2, 1)`, with an **80ms
   stagger per line** (line 2 delayed 80ms, line 3 delayed 160ms).
   The clip box uses a neat trick: `padding-bottom: 0.22em` paired with `margin-bottom: -0.22em`, so descenders
   (g, y, p) are not sheared off by the mask but the line box still occupies its natural height. The inner span
   also carries `text-wrap: balance`.
2. **Supporting paragraph and everything else** — the generic reveal class: `opacity 0 → 1` over `0.8s ease`,
   plus `translateY(26px) → 0` over `0.8s` on `cubic-bezier(.2, .8, .2, 1)`.
3. **The illustrated scene** — `translateY(16px)` **and** `scale(0.965) → 1`, `0.66s`, same ease, `fill: both`.
   Scenes are the only things that scale on entry; text and cards only translate.

So the choreography is: **mask-wipe the headline, float the prose, float-and-swell the picture.** Three distinct
entrance treatments, assigned by content type, never mixed.

### 2.4 The curtain is also the page transition

Navigating between routes replays the same curtain. I confirmed this by triggering a client-side navigation and
observing the curtain element pick up `is-on is-reveal` classes. One mechanism does both first-load and
route-change, which is why the site feels continuous rather than "loaded once, then a normal website."

---

## 3. Rendering architecture (what would have been the Three.js section)

Since there is no WebGL, here is what actually produces the depth and motion, with costs.

### 3.1 SVG character rigs driven by CSS keyframes

The animated figures are inline SVG. Limbs are separate groups with `transform-box: view-box` and explicit
`transform-origin` values in SVG user units, so a `rotate()` on a thigh pivots at the hip rather than the
bounding-box centre. The gait is two keyframes (hip swing, knee bend) applied to both legs, with the second leg
given a **negative animation delay of exactly half the cycle** (`0.5s` cycle, `-0.25s` delay). Arms use the same
pair of offsets, crossed. That is the entire walk cycle: two keyframe rules and four delays.

Other details worth stealing:

- `vector-effect: non-scaling-stroke` on every stroked shape, so line weights stay constant as the scene scales
  responsively. Essential if you plan to scale a card table to fit.
- `mask-image: linear-gradient(90deg, transparent, black 7%, black 93%, transparent)` on the scene viewport, so
  figures fade out at the left and right edges instead of being hard-clipped.
- Idle "aliveness": a chest LED animates `opacity: 0.55 ↔ 1` over `1.6s ease-in-out`, and a second indicator uses
  the **same keyframes with a `0.3s` delay** so the two never blink in lockstep.
- Dimming as focus: inactive scene elements sit at `opacity: 0.6` and transition to full over `0.5s`. This is the
  site's universal "not the subject right now" signal.

### 3.2 Pinned scroll scenes via `position: sticky`

Two scenes on the home page are pinned. The pattern is always the same: an outer track with an explicit tall
height, an inner pin with `position: sticky; top: 0; height: 100svh`.

- Photo-mosaic track: **`320svh`** tall on desktop, reduced to **`190svh`** at ≤760px.
- Note `svh`, not `vh` — small-viewport units, so mobile browser chrome collapsing does not cause a jump.

Only the mosaic's inner grid is JS-driven. It receives an inline `transform: translate(x, y) scale(s)` plus two
custom properties: `--cols` (5 on desktop, 3 on narrow) and `--rest` (the opacity of non-focused tiles). It is the
only element on the page carrying `will-change: transform` for scroll purposes.

**[inference]** I scrolled the page through the mosaic's full track in five steps and the inline transform never
changed — because `requestAnimationFrame` was paused. That means the transform is written **inside a rAF loop**,
not synchronously in the scroll handler. Combined with the four `{passive: true}` scroll listeners, the
near-certain implementation is: scroll handler records a target, rAF loop lerps the current value toward it each
frame. That is what produces the damped, slightly-trailing feel — there is no scroll-hijacking library (no Lenis,
no Locomotive, no GSAP ScrollTrigger; none appear in the bundle or on `window`).

### 3.3 Reveal system

- **`IntersectionObserver`, `threshold: 0.16`** for the standard reveal — 10 observers created on one route,
  14 on the home page. Two other thresholds appear (`0.25`, `0.3`) for heavier scenes.
- An element is observed, gets an `is-in` class, and the CSS transition does the rest. No JS animation values.
- Because it is a class toggle plus a CSS transition, reveals are compositor-friendly and survive
  `prefers-reduced-motion` by simply being forced to their end state.

### 3.4 Asset weight and library versions

Home page cold load, measured via Resource Timing:

| Metric | Value |
| --- | --- |
| Requests | 47 |
| **Total transferred** | **331 KB** |
| Total decoded | 1,018 KB |
| HTML document | 10.1 KB |
| DOM Content Loaded | 1,871 ms |
| Load | 2,220 ms |
| Long tasks recorded | **0** |
| DOM nodes | 2,656 (max depth 20) |
| JS heap in use | 10 MB |
| Concurrently running CSS animations | 43 |

Largest individual assets:

| Asset | Transferred | Decoded |
| --- | --- | --- |
| Theme stylesheet | 42.2 KB | 213.9 KB |
| `react-dom` chunk | 46.4 KB | 138.6 KB |
| CMS/content chunk | 37.1 KB | 110.2 KB |
| App entry chunk | 30.7 KB | 86.0 KB |
| Largest image (AVIF hero) | 59.4 KB | — |
| Largest logo (WebP) | 21.4 KB | — |

Notice the shape of that table: **the stylesheet is the biggest single thing on the site.** 214 KB of decoded CSS
against 86 KB of application JavaScript. The design system is the product; the JavaScript is glue. Images are
AVIF and WebP, with SVG for flat marks.

Navigating to a second route pushed the session total to 512 KB, of which 175 KB was a single video on that page.
The home route never loads video.

**Fonts: only two files actually download.** 17 faces are declared across the loaded stylesheets (General Sans
400/500/600/700, Satoshi 400/500/700, IBM Plex Mono in several weights). `document.fonts` reports **General Sans
400 and General Sans 500 as `loaded`, and every other face as `unloaded`** — they are declared but never
referenced by any matched rule, so the browser never fetches them. Two weights of one family carry the whole site.

---

## 4. Motion system

### 4.1 The easing curves, verbatim as tokens

| Token | Value | Used for |
| --- | --- | --- |
| Primary ease | `cubic-bezier(.2, .8, .2, 1)` | Nearly everything: reveals, entrances, disclosure, scene scaling |
| Mask ease | `cubic-bezier(.2, .85, .2, 1)` | Only the headline line-mask reveal |
| Legacy/alt ease | `cubic-bezier(.22, 1, .36, 1)` | Older component layer |
| Spring | `cubic-bezier(.34, 1.56, .64, 1)` | Declared as a token; barely used in practice |
| Menu ease | `cubic-bezier(.7, 0, .2, 1)` | Hamburger→X morph only (an *ease-in-out*, deliberately different) |
| Hop ease | `cubic-bezier(.32, 1.2, .4, 1)` | A single 0.62s character jump |

The primary curve is a strong ease-out: fast departure, long settle, essentially no overshoot. The one
ease-*in*-out in the system is on the menu icon, where the motion is a morph between two stable states rather than
an arrival — a genuinely correct distinction.

**Overshoot is declared but almost never used.** A spring token exists; the site does not lean on it. Nothing
bounces.

### 4.2 Duration census

Counting every `transition-duration` and `animation-duration` in the stylesheet:

| Duration | Occurrences | Typical use |
| --- | --- | --- |
| `0.3s` | 25 | Colour changes, state changes |
| `0.2s` | 20 | Background swaps, opacity on hover |
| `0.25s` | 12 | Card background |
| `0.5s` | 8 | Focus/dim transitions in scenes |
| `0.18s` | 6 | Micro feedback |
| `0.34s` | 4 | Menu morph |
| `0.15s` | 2 | Button press |
| `1.6s`–`9s` | ~30 | Ambient loops only |

The distribution is bimodal and there is nothing in between: **interaction feedback lives in 150–500 ms; ambient
life lives in 1.6–9 s.** Nothing takes 700 ms to respond to a tap, and nothing "breathes" faster than 1.6 s.

### 4.3 The entrance vocabulary — distance scales with object size

This is the single most transferable rule in the whole system. Every entrance is a translate-up plus a fade, and
the distance and duration are chosen by how big the thing is:

| Object | Travel | Duration | Extra |
| --- | --- | --- | --- |
| Small chip / inline demo | 8 px | 0.40 s | — |
| Card | 12 px | 0.50 s | — |
| Modal sheet | 14 px | 0.38 s | Backdrop fades separately over 0.28 s |
| Caption / speech line | 9 px | 0.50 s | — |
| Illustrated scene | 16 px | 0.66 s | **plus `scale(0.965) → 1`** |
| Scroll-revealed block | 26 px | 0.80 s | Fade uses plain `ease`, transform uses the primary curve |
| Headline line | 140% of its own height (masked) | 0.90 s | Mask ease; 80 ms stagger per line |

All use `animation-fill-mode: both` so nothing flashes at its start state.

Note the deliberate split on the scroll reveal: **opacity animates on `ease`, transform animates on the custom
curve, both over the same 0.8 s.** The fade arrives perceptually a touch earlier than the settle. Small thing,
but it is why the reveal reads as "materialising" rather than "sliding in."

### 4.4 Stagger values

Only three stagger values exist across the whole site:

- **38 ms** — curtain columns (8 of them; a fast structural wipe).
- **80 ms** — headline lines (2–3 of them; you are meant to read the beat).
- **250 ms** — half-cycle offset between paired limbs in the walk rig (phase, not stagger).

There is no generic "stagger children by N" utility. Stagger is applied only where it means something.

### 4.5 Ambient loops

| Loop | Values | Period |
| --- | --- | --- |
| Status LED breathe | `opacity 0.55 ↔ 1` | 1.6 s `ease-in-out`, infinite, second instance offset `0.3s` |
| Live dot pulse | `opacity → 0.35` at 50% | 2 s |
| Screen glow | `opacity 0.09 ↔ 0.19` | 6 s |
| Terminal caret | hard on/off at 50% | ~1 s, stepped |
| Scroll cue | see below | 1.8 s `ease-in-out` |
| Explainer pantomime | 2-beat, second beat offset `0.9s` | 3.6 s |
| Orbiting indicator | 4 waypoints | 4 s `linear` |

The **scroll cue** deserves its own note because it is the cheapest good idea on the site. It is a **1px × 26px
vertical line**. It animates `scaleY(0) → scaleY(1)` with `transform-origin: center top` for the first 45% of the
cycle, then holds, then **flips the origin to `center bottom`** and collapses `scaleY(1) → scaleY(0)`. The visual
result is a short line that grows downward and then drains away downward — the illusion of something falling
past — with no `translate` and no extra elements. It carries an uppercase micro-label above it at `0.16em`
tracking, and the whole cue takes an `is-off` class (`opacity: 0`) once the user has scrolled.

### 4.6 Section-to-section pacing

There is no cross-section transition. Sections are separated by geometry, not animation: a 1px rule, a corner
mark, a badge, and a big block of vertical padding. Content inside each section reveals on scroll independently.
The pinned scenes are the only places where scroll position drives continuous motion.

---

## 5. Cursor and pointer affordances

**There is no custom cursor.** No cursor-follower element, no magnetic hover, no cursor-swap on media, no blend-mode
dot. The native system cursor is used throughout; `cursor: pointer` is set on interactive elements, and there is a
single `@media (pointer: coarse)` rule that resets a cursor to `default`.

This is worth dwelling on, because "portfolio site with a great feel" usually implies a custom cursor and this one
proves it is unnecessary. Instead, clickability is signalled by a small, strictly consistent set of moves:

| Signal | Value |
| --- | --- |
| Hover lift | `translateY(-2px)` — via a `--lift` token |
| Arrow nudge (horizontal) | `translateX(4px)` — via an `--ar-shift` token |
| Arrow nudge (diagonal, the primary one) | `translate(3px, -3px)` over **`0.32s`** |
| Press | `transform: scale(0.965)` — a 3.5% squash |
| Hover transition | `background 0.2s, transform 0.15s` |
| Border on hover | applied as `box-shadow: inset 0 0 0 1px` so nothing reflows |
| Link hover | `opacity: 0.62` over `0.2s` (nav), or ink colour deepening (footer) |
| Focus | `outline: 2px solid <amber>; outline-offset: 3px` — global, on `:focus-visible` |

The arrow glyph is sized in **`em` (`1.05em`)**, so it scales with whatever label it sits next to, and there are
rotated variants (45° for "external", 180° for "back") that *compose* with the hover nudge rather than replacing
it — an external-link arrow still nudges up-and-right along its own rotated axis.

**The 2px lift is the entire hover-elevation system.** No shadows appear on hover except one card variant with a
very soft `0 24px 60px -40px` at low alpha. Restraint is the point: the movement is small enough to read as
responsiveness rather than as animation.

Two more state patterns:

- **Active navigation item**: a 6px amber circle below the label, animating from
  `opacity: 0; translate(-50%, 3px) scale(0.4)` to `opacity: 1; translate(-50%) scale(1)`. It grows and rises into
  place.
- **Active row in a list**: the row's title moves from muted grey to full ink, its index number turns amber, and
  its bottom hairline turns from 8%-alpha ink to solid amber — all over `0.3s`. Three simultaneous, cheap changes
  make a row unmistakably "the current one."

---

## 6. Typography

### 6.1 Families

**One family: General Sans (Fontshare), at weights 400 and 500 only.** That is the whole typographic palette.

Critically, the "mono" token in the design system **also points at General Sans**. The technical/console/eyebrow
look is achieved entirely with **uppercase + wide letter-spacing + small size + muted colour**, not with an actual
monospace face. A real mono stack (`ui-monospace, SFMono-Regular, Menlo, monospace`) exists as a separate token
and is used only inside the fake-terminal component and for SVG silkscreen labels — i.e. where the content really
is code.

### 6.2 Scale — desktop (measured at 1280 × 800)

| Role | Size | Line-height | Tracking | Weight |
| --- | --- | --- | --- | --- |
| H1 / hero | 51.84 px (`clamp(37px, 4.05vw, 64px)`) | 53.91 px (**1.04**) | −1.56 px (**−0.03em**) | 500 |
| H2 / section | 39.04 px (`clamp(31px, 3.05vw, 47px)`) | 40.60 px (**1.04**) | −1.17 px (−0.03em) | 500 |
| H3 (alt scale) | `clamp(38px, 3.6vw, 56px)` | — | −0.02em | 500 |
| H4 | 21 px | — | −0.02em | 500 |
| Lead paragraph | 19 px | 29.45 px (**1.55**) | normal | 400 |
| Section sub | 18 px | 27.90 px (1.55) | normal | 400 |
| Body | 17 px | ~1.55–1.7 | normal | 400 |
| Small | 15 px | — | normal | 400 |
| Card body | 14.5 px | 22.48 px (1.55) | normal | 400 |
| Meta (uppercase) | 12.5 px / 11 px | 1.55 | **+0.10em** | 400 |
| Micro (uppercase) | 10.5 px | 1.55 | **+0.14em to +0.18em** | 400 |

### 6.3 Scale — mobile (measured at 375 × 812, DPR 2)

| Role | Size | Line-height | Tracking |
| --- | --- | --- | --- |
| H1 | 35.63 px (`clamp(32px, 9.5vw, …)`) | 40.61 px (**1.14**) | −1.14 px (−0.032em) |
| H2 | 32.63 px (`clamp(32px, 8.7vw, 41px)`) | 36.87 px (**1.13**) | −0.98 px |
| Lead | 17.5 px | 27.13 px (1.55) | normal |
| Body | 16 px | 24.80 px (1.55) | normal |
| Small | 15 px | — | — |
| Meta | 12.5 px | — | +0.10em |
| Micro | 10.5 px | — | +0.14em |

### 6.4 The rules underneath the numbers

1. **Line-height is a step function, not a curve.** Display type sits at **1.04** on desktop and **1.13–1.14** on
   mobile (the loosening is necessary because 9.5vw type wraps more). Body type is **always 1.55**, and long-form
   prose blocks go to **1.7**. There is no 1.3.
2. **Tracking is signed by size.** Big type is **negative** (−0.02 to −0.045em, tightening as it grows). Small
   uppercase type is **strongly positive** (+0.10 to +0.18em). Body type is untouched.
3. **The display-to-body ratio is ~2.7–3.0×** on desktop (51.84 / 17–19) and **~2.2×** on mobile (35.63 / 16).
   The gap deliberately narrows on phones.
4. **Weight 500 does all the emphasis work.** Nothing is bold. Hierarchy is size, colour, and case — never weight.
5. **Measure is constrained in `ch`, not px**: headings cap at `20ch`–`22ch`, supporting paragraphs at `52ch`,
   inline leads at `46ch`.
6. `text-wrap: balance` on headline lines, so a two-line headline never leaves an orphan.

### 6.5 The eyebrow / micro treatment

This is the site's signature texture and it is worth specifying exactly, because it is what makes everything read
as "instrument panel" rather than "marketing page":

- 10.5 px, weight 400, uppercase, `letter-spacing: 0.14em` (0.16em on status text, 0.18em on footer column heads).
- Colour is the tertiary ink (a warm grey), or amber-2 when the item is active.
- Used for: section badges (`FIG. 004`), card index labels (`A1`, `U1`), status chips (`IDLE`, `BENCH · LIVE`),
  ruler tick labels, footer column headings, and the scroll cue label.
- These labels are the **first thing dropped on mobile** — card index labels are explicitly `display: none` below
  760px. They are texture, not information.

---

## 7. Colour and material

### 7.1 Palette (measured hex values)

**Light theme**

| Token | Hex | Role |
| --- | --- | --- |
| page | `#FFFCF0` | Page ground — warm off-white, never pure white |
| sheet | `#FFFDF3` | Panel/nav surface |
| paper | `#FBF7E6` | Raised surface |
| paper-2 | `#F3EDD6` | Recessed surface |
| tile | `#EFE9D2` | Media placeholder / hover fill |
| ink | `#16140E` | Primary text — warm near-black, never pure black |
| ink-2 | `#57534A` | Body/secondary text |
| ink-3 | `#8B8577` | Micro-labels, muted state |
| **amber** | **`#F3B44A`** | The single accent |
| amber-2 | `#C77E0A` | Accent *text* on light backgrounds |
| amber-lt | `#F9CB80` | Accent hover fill |
| line | `rgba(22,20,14,.16)` | Structural rules |
| line-2 | `rgba(22,20,14,.08)` | Hairlines between list rows |

**Dark theme** (class-toggled, with `color-scheme: dark` set)

| Token | Hex |
| --- | --- |
| page | `#13120D` |
| paper | `#17160E` |
| paper-2 | `#1F1C11` |
| tile | `#221F13` |
| ink | `#F1EEE6` |
| ink-2 | `#A4A097` |
| ink-3 | `#928C7E` |
| amber | `#F3B44A` (**identical**) |
| amber-2 | `#DD922F` (lightened, since it is used as text) |
| line | `rgba(241,238,230,.24)` |

Behind the app root, the `<body>` is painted `#050711` — a near-black so that overscroll reveals dark ground under
a cream sheet rather than a white flash.

Three principles:

1. **Nothing is neutral.** Every grey is warm. The "white" is 4% yellow; the "black" is a warm charcoal. This is
   what makes the site read as paper rather than as screen.
2. **One accent, one hue, both themes.** `#F3B44A` is unchanged between light and dark. Only its *text* variant
   shifts (darker on light, lighter on dark) to hold contrast.
3. **Amber is used for state, not decoration**: active tick, active row rule, current-page dot, section badge,
   primary button, focus ring. If something is amber, it means "here" or "do this."

### 7.2 Measured contrast ratios

| Pair | Ratio | Verdict |
| --- | --- | --- |
| ink on page (light) | **17.92:1** | AAA |
| ink-2 on page (light) | **7.45:1** | AAA body |
| ink-3 on page (light) | **3.57:1** | **Fails AA for body text** — used for micro-labels only |
| ink on amber (button) | **10.03:1** | AAA |
| amber-2 as text on paper | **3.05:1** | **Fails AA** — used for small active-state labels |
| amber as text on page | 1.79:1 | Decorative only |
| ink on page (dark) | 16.17:1 | AAA |
| ink-2 on page (dark) | 7.19:1 | AAA |
| ink-3 on page (dark) | 5.60:1 | AA (better than the light theme) |
| amber on page (dark) | 10.21:1 | AAA |

**Two real failures**, both in the light theme, both on the smallest type. Do not copy them (see §11.7).

### 7.3 Material and depth cues — all gradients, no images

There is no noise PNG, no grain overlay image, no blur-heavy glassmorphism. Depth comes from four gradient
recipes:

1. **Ruled paper.** `repeating-linear-gradient(0deg, ink@5% 0 1px, transparent 1px 5px)` — a 1px line every 5px at
   5% alpha, applied as a section background inset from the page edges, with **`background-attachment: fixed`**.
   Because it is fixed, the ruling stays anchored to the viewport while content scrolls over it: a parallax cue
   that costs nothing and needs no JS.
2. **Dot grid.** `radial-gradient(circle at center, ink@16% 1.15px, transparent 1.25px)` — note the 0.1px
   difference between the stops, which is what gives the dot a soft edge rather than an aliased one.
3. **Scanline overlay** on photographic bands: 1px paper-coloured lines at 16% alpha over the image. A film/print
   texture built from the same primitive as the ruling.
4. **Duotone.** `filter: grayscale(1) contrast(1.12) brightness(1.04)` on the image, plus an amber layer at
   `mix-blend-mode: multiply; opacity: 0.28`. Two declarations, and every photo on the site belongs to the same
   world.

`backdrop-filter` appears exactly twice on the entire site (a 4px and a 6px blur, both on floating panels). There
is no `perspective`, no `transform-style: preserve-3d`, no CSS 3D anywhere.

### 7.4 Registration marks

Sections carry **20 × 20 px corner brackets drawn from 2px amber gradient slices** in `::before`/`::after`, at the
top-left and top-right of the content column; the footer repeats them at the bottom corners. The section number
is rendered with **`content: attr(data-badge)`** in an amber chip pinned to the top-left corner — so section
numbering is declarative markup (`data-badge="FIG. 004"`), not a component.

This single device — crop marks plus a numbered chip — is what converts a normal web section into something that
reads as a plate in a technical manual.

---

## 8. Layout and spacing

### 8.1 The container maths

The container is built from three tokens rather than one max-width:

| Token | Desktop | Mobile (≤960px) |
| --- | --- | --- |
| max | `96vw` (= 1228.8 px at 1280) | `100vw` |
| gutter | `28px` | `13px` |
| inset | `24px` | `12px` |
| **Total side padding** | **52 px** | **25 px** |
| Resulting measure | 1124.8 px | 325 px |
| Nav height | 62 px (67 px rendered) | 56 px |

The gutter/inset split matters: **structural rules and section badges align to the `gutter`, while text aligns to
`gutter + inset`.** So the 1px hairlines and corner marks sit 24px *outside* the text column. That small offset is
why the rules read as page furniture rather than as underlines.

There is a derived token for exactly this: a rule-inset expression of the form
`max(gutter, (100% − max)/2 + gutter)`, used to position every full-width rule, the nav's own background panel,
and the corner marks. One expression, used everywhere, and the whole page snaps to the same two vertical lines.

### 8.2 Vertical rhythm

| Token | Desktop | Mobile |
| --- | --- | --- |
| Section padding | `clamp(96px, 12vh, 152px)` → 96 px at 800h | `clamp(64px, 8vh, 96px)` → 65 px at 812h |
| Header→content gap | `clamp(46px, 6vh, 78px)` → 48 px | `clamp(32px, 4.6vh, 48px)` → 37 px |
| Panel padding | `clamp(26px, 3.4vw, 54px)` | same |

**Section padding is viewport-*height*-relative (`vh`), not width-relative.** Sections breathe more on tall
screens and compress on short ones. That is the correct choice for a scroll narrative and an unusual one; most
systems key everything to width.

### 8.3 Grid and separators

- The projects grid is **5 equal columns at desktop (234.5 px each)**, collapsing to **1 column at ≤520px**.
- Cards have **no background, no border-radius, and no shadow**. They are separated by 1px rules only. The
  "card" is a cell in a ruled table.
- At ≤520px, the vertical dividers are removed and replaced with a horizontal hairline at 8% alpha, with the last
  child's rule suppressed.
- On mobile the whole grid is **full-bled by negative margins** equal to the inset (`margin-inline: -12px`), so
  the hairlines run edge to edge while the text inside stays on the 25px margin.
- Border-radius across the site: **0 px on almost everything.** Tokens exist for 8px media and 100px pills; the
  primary buttons and cards use neither.

### 8.4 Page length

Both viewports produce essentially the same document: **7,546 px on desktop (9.4 viewports)** and **7,711 px on
mobile (9.5 viewports)**. Mobile is not a shortened edition. What changes is that the *scroll choreography* is
removed while the *content* stays.

---

## 9. Information architecture and pacing

Home-page sequence, by scroll offset:

| Offset | Section | Height | Device |
| --- | --- | --- | --- |
| 0 | Fixed nav | 67 px | Transparent; its own panel background with visible left/right page edges |
| 0 | Hero | 747 px | Masked headline + lead + illustrated scene. Just under one viewport. |
| 747 | Interactive console | 815 px | Fake terminal with typed input and three big buttons |
| 1,563 | Pinned "instrument" section | 598 px | Sticky-pinned on desktop; unpinned entirely on mobile |
| 2,161 | Pinned chart section | 715 px | Sticky, over a ruled-paper background |
| 2,876 | Tools grid | 531 px | Logo grid |
| 3,407 | Employment ledger | 881 px | Numbered rows, `A1`…`A10` |
| … | Marquee, footer | | |

Pacing devices, all cheap:

- **The hero is deliberately 747 px against an 800 px viewport.** It never quite fills the screen, so the fold is
  always broken by something. That, plus the scroll cue, is the entire "there is more below" strategy.
- **A vertical progress ruler** exists as a component: a 1px left border `min(62vh, 560px)` tall, a 2px amber fill
  bar, and tick marks that swap from grey to amber (`transition: 0.3s`) as their section becomes current, with a
  micro-label beside each tick. This is a *chapter index*, not a scrollbar.
- **Numbered everything.** Sections carry `FIG. 00n` badges; cards carry `A1`, `U1`, `C4` index labels; rows carry
  ordinal numbers. The numbering is what makes a 9-viewport page feel navigable rather than endless.
- **Status chips.** A component bar renders an uppercase path label on the left and a state chip on the right
  (`IDLE`, `BENCH · LIVE`, `0 / 4 OPENED`), with a 7px square dot that pulses on a 1s cycle when busy and sits
  static when idle. Progress is stated as a fraction, in text, in the corner.
- **Expandable rows** use `grid-template-rows: 0fr → 1fr` with `transition: grid-template-rows 0.45s` and an inner
  `overflow: hidden; min-height: 0`. This animates auto-height with no JS measurement at all.

The interactive console is the closest analogue in the site to a "checkpoint." Its affordance line reads, in the
site's own words, "type `help`, or press a key below" (pleurat.com) — i.e. **an optional expert path and an
obvious button path presented together.** Below it sit three large labelled buttons. That is exactly the pattern a
tutorial checkpoint should use.

---

## 10. Accessibility and performance reality check

### 10.1 What it gets right

- **`prefers-reduced-motion: reduce` is genuinely handled** — 22 rules. The approach is the good one:
  - **The motion *tokens themselves* are zeroed**: `--lift: 0px` and `--ar-shift: 0px`. Every hover lift and arrow
    nudge across the site dies from two declarations.
  - Reveal classes are forced to `opacity: 1; transform: none; transition: none`.
  - The intro curtain is `display: none` entirely — no wipe, no boot label.
  - SVG character rigs have their animations reset; some are reduced to `0.01ms` rather than removed, which keeps
    any JS `animationend` handlers firing.
- **Global `:focus-visible` ring**: `2px` solid amber at `3px` offset, with a matched radius. Present on links,
  buttons, `[role=button]`, `[tabindex]`, and inputs. 39 focusable elements on the home page; tab order follows
  DOM order.
- **All 21 images have `alt` attributes**; 21 decorative elements are correctly `aria-hidden`.
- Heading order is clean (`h1` → `h2` → `h3` → `h4`), 20 headings, no skips.
- `lang="en"` set; `color-scheme` declared in dark mode.
- Menu toggle uses `aria-expanded`; nav uses `aria-current="page"`.

### 10.2 What it gets wrong

- **No `<main>` landmark** and **no skip link**. A keyboard user tabs through the entire nav on every route.
- **Touch targets under 44 px**: menu toggle 40 × 40, theme toggle 30 × 30, footer links 31 px tall, nav CTA
  ~37 px tall. All below WCAG 2.5.5's 44 px, several below the 24 px AA minimum once spacing is considered.
- **Two contrast failures** in the light theme (§7.2): the tertiary ink at 3.57:1 and the accent-text amber at
  3.05:1, both on 10.5 px type — the worst possible combination of small and low-contrast.
- **No `loading="lazy"` on any image** (0 of 21).
- Reduced-motion does **not** disable the scroll-linked mosaic transform (it is JS-driven and outside the CSS
  media query). **[inference — I could not confirm whether the JS checks the media query itself.]**

### 10.3 Performance

Genuinely good, and cheaply so:

- **0 long tasks** recorded on load.
- **43 concurrently running CSS animations** on the home page, all `opacity`/`transform` only — compositor work,
  not layout or paint.
- **`will-change: transform` appears on exactly 11 selectors**, all of them things that actually move under
  scroll. It is not sprayed across the stylesheet.
- **4 passive scroll listeners** and **1 ResizeObserver** for the whole site. `requestAnimationFrame` was called
  ~6 times during mount.
- `visibilitychange` handling means the tab does no animation work in the background.
- 10 MB JS heap, 2,656 DOM nodes.

The one soft spot is the 214 KB decoded stylesheet (42 KB over the wire), which is render-blocking. On a
mid-range phone on 4G that is maybe 250–350 ms of parse and style-recalc before first paint. **[inference — not
directly measured.]** For a portfolio this is fine; for a QR-scanned tutorial it would be the single thing I would
cut.

### 10.4 Mobile behaviour

At 375 × 812 the site systematically **removes choreography and keeps structure**:

| At breakpoint | What happens |
| --- | --- |
| ≤960px | Nav links + CTA hidden, hamburger + full-width sheet menu shown. Hero grid → 1 column. Container tokens shrink (52px → 25px padding, 62px → 56px nav). Hero photo band 88vh → 52vh. **One pinned scene is `display: none` and its track height forced to `auto`.** |
| ≤760px | **The interactive console is `display: none` entirely.** Mosaic track 320svh → 190svh. A second pinned hero is un-sticked and its scroll transform killed with `transform: none !important; opacity: 1 !important`. Card index labels hidden. Grids full-bleed via negative margins. |
| ≤520px | Projects grid 5 → 1 column, vertical dividers become horizontal hairlines. Buttons go full-width. |
| `pointer: coarse` | A single cursor reset. Nothing else. |

The philosophy is explicit and worth adopting wholesale: **on a phone, delete the scroll scenes, keep the type
scale, the rules, the badges, the accent, and the on-scroll reveals.** Nothing is re-laid-out into a different
design; expensive things are simply dropped.

---

## 11. Translates cheaply

Everything in this section is plain CSS/DOM, works on a low-end Android phone, and would genuinely improve a
card-table tutorial. I have given concrete values — these are prescriptions for *this* project, written by me,
derived from the measurements above, not copied markup.

### 11.1 Adopt exactly two easing curves and two duration bands

```
--ease-out:   cubic-bezier(.2, .8, .2, 1);   /* everything that arrives  */
--ease-inout: cubic-bezier(.7, 0, .2, 1);    /* only for A↔B morphs      */
```

Bands: **feedback 150–500 ms** (taps, state changes, colour); **ambient 1.6–6 s** (breathing, pulsing). Nothing in
between. Do not add a spring; nothing in a card tutorial should overshoot, because overshoot on a card reads as a
mis-deal.

### 11.2 Size-scaled entrances — the single highest-value rule

Adopt this table verbatim for the tutorial:

| Element | Travel | Duration | Notes |
| --- | --- | --- | --- |
| Badge / chip / hint pill | 8 px | 0.40 s | |
| **A card entering the hand** | 12 px | 0.50 s | see §13.1 for the deal sequence |
| Step panel / instruction card | 14 px | 0.38 s | |
| The table itself, on first paint | 16 px + `scale(0.965 → 1)` | 0.66 s | the *only* thing that scales |
| Block revealed on scroll | 20 px | 0.60 s | shorten from their 26px/0.8s — a phone tutorial should feel brisker than a portfolio |
| Headline line (masked) | 140% | 0.70 s | 80 ms stagger, max 2 lines |

Always `fill: both`. Always fade `opacity` on plain `ease` while the transform runs on `--ease-out` over the same
duration — that split is what makes the arrival read as "materialising."

### 11.3 The masked-line headline, with the descender fix

For each step title, wrap each line in a clip box and animate the inner span from `translateY(140%)` to zero over
`0.7s` on `cubic-bezier(.2,.85,.2,1)`, 80 ms apart. The clip box needs `overflow: hidden`, plus
`padding-bottom: 0.22em` and `margin-bottom: -0.22em` so descenders survive the mask without changing the line
box. Add `text-wrap: balance`. This is the single most "expensive-looking" effect on the reference site and it
costs two elements and one transition.

Cap it at two lines. On a phone at 9.5vw, three masked lines is too much theatre before someone can read the
instruction.

### 11.4 Reveal via IntersectionObserver at 0.16, not scroll position

One observer, `threshold: 0.16`, adds an `is-in` class; CSS does the animation. No scroll handler, no rAF, no
library. If you register a scroll listener at all, make it `{ passive: true }`.

### 11.5 The dim-to-focus rule — this is your active-seat mechanism

Non-focused elements sit at **`opacity: 0.6`** and transition to `1` over **`0.5s`** on `--ease-out`. That is the
site's universal "not the subject right now" and it is exactly what a 6-seat table needs. It requires no glow, no
outline, no scale — just opacity, which is free on the compositor.

Pair it with the three-signal active-row pattern for the *current* seat/step, all over `0.3s`:

1. Text goes from muted to full ink.
2. The index/number turns accent.
3. The hairline under it turns from 8%-alpha to solid accent.

Three cheap simultaneous changes read as far more emphatic than any one expensive one.

### 11.6 Auto-height disclosure with zero JS

For "show me more about this rule" expanders:

```
.detail        { display: grid; grid-template-rows: 0fr;
                 transition: grid-template-rows .45s cubic-bezier(.2,.8,.2,1); }
.detail > div  { overflow: hidden; min-height: 0; }
.detail.is-open{ grid-template-rows: 1fr; }
```

No height measurement, no `max-height` guessing, correct at any content length. Ship this.

### 11.7 Colour: take the warmth, fix the contrast

Adopt the principle — **no pure white, no pure black, one accent hue that is identical in both themes** — and a
felt-table analogue of their paper/ink relationship. But **do not copy their two contrast failures.** For a
tutorial read at arm's length on a phone at a lit table:

- Every piece of text that carries instruction must clear **4.5:1**, including 10.5 px micro-labels. Their
  tertiary ink at 3.57:1 and accent-text at 3.05:1 would both fail. Darken your equivalents until they pass, then
  re-measure.
- Reserve the accent for **state only**: current seat, current step, the thing to tap. If it is accent-coloured,
  it means "here."
- Set `color-scheme` and paint the `<body>` behind your app root a deep neutral so overscroll never flashes white.

### 11.8 Typography: one family, two weights, a step-function line-height

- **One family. Weights 400 and 500 only.** Their whole site loads two font files. Hierarchy comes from size,
  colour, and case — never from bold.
- Line-height: **1.14 for display, 1.55 for body, 1.7 for the one long explanatory paragraph.** No intermediate
  values.
- Tracking: **−0.03em on display, 0 on body, +0.14em on uppercase micro-labels.**
- **Fake the mono.** Use uppercase + `+0.14em` tracking + 10.5–12.5 px + muted colour for all your eyebrows,
  seat labels, and status chips. Do not load a monospace font for this. Reserve a real mono stack only if you
  print actual card notation.
- Mobile scale to start from: H1 35 px / 40 px, H2 32 px / 37 px, lead 17.5 px / 27 px, body 16 px / 24.8 px,
  meta 12.5 px, micro 10.5 px. Constrain measure in `ch` (headings 20–22ch, body 46–52ch), not px.

### 11.9 Spacing: split gutter from inset

Use two tokens, not one max-width. On mobile: `gutter: 13px`, `inset: 12px` → **25 px text margin**, with all
rules, dividers, and corner marks aligned to the 13 px line — 12 px outside the text. That offset is most of why
the reference site looks typeset rather than templated.

Make section padding **`vh`-relative**: `clamp(48px, 7vh, 96px)` for a tutorial (tighter than their
`clamp(64px, 8vh, 96px)`, because your steps are shorter than their sections).

Full-bleed edge-to-edge lists on mobile with `margin-inline: calc(var(--inset) * -1)` while text stays on the
margin.

### 11.10 Texture from gradients only

- Felt/paper ruling: `repeating-linear-gradient(0deg, <ink>/5% 0 1px, transparent 1px 5px)` with
  **`background-attachment: fixed`** for a free parallax cue.
- Dot grid: `radial-gradient(circle at center, <ink>/16% 1.15px, transparent 1.25px)` — keep the 0.1px stop gap
  for the soft edge.
- Card-back pattern and table felt: both of these are gradient recipes, not images. Zero bytes, zero decode.
- Skip `backdrop-filter` except on at most one floating panel — it is the most expensive cheap-looking effect
  there is on a mid-range GPU.

### 11.11 Borders as `box-shadow: inset`

Apply hover/active borders as `box-shadow: inset 0 0 0 1px <colour>` rather than `border`. No layout shift when
state changes, and it composites. Their entire button system does this.

### 11.12 Touch affordances — adapt, do not copy

Adopt: **`--lift: -2px` on hover, `scale(0.965)` on `:active`, `background .2s, transform .15s`.** The press
squash is the most important one on touch, because there is no hover — the 3.5% squash is the only confirmation
a finger gets.

**Reject their sizing.** Every tap target in the tutorial must be **≥ 44 × 44 px**. Their menu toggle is 40 px,
their theme toggle is 30 px, their footer links are 31 px. On a QR-scanned guide with beginners at a table, that
would be actively bad.

Also adopt the arrow-in-`em` idea (`width: 1.05em`) with a `translate(3px,-3px)` nudge over `0.32s` for "next
step" affordances — but give the arrow a 44 px hit area around it.

### 11.13 The scroll cue

Copy the technique exactly: a **1px × 26px** line, `scaleY(0→1)` with `transform-origin: center top` for the first
45% of a **1.8 s ease-in-out** loop, then origin flipped to `center bottom` and `scaleY(1→0)`. Micro-label above
it in uppercase at `+0.16em`. Add an `is-off { opacity: 0 }` class the moment the user scrolls or advances a
step. One element, one keyframe, no library.

### 11.14 The reduced-motion pattern

**Zero the motion tokens, do not hunt down every rule.**

```
@media (prefers-reduced-motion: reduce) {
  :root { --lift: 0px; --nudge: 0px; --deal-travel: 0px; }
  .reveal, .line > span { opacity: 1 !important; transform: none !important; transition: none !important; }
  .intro-curtain { display: none !important; }
}
```

If any JS drives motion, have it read `matchMedia('(prefers-reduced-motion: reduce)')` too — that is the gap in
the reference implementation.

### 11.15 Progress as a text fraction plus a ruler

- A status chip in the corner reading `STEP 4 / 12` in uppercase micro type is worth more than any progress bar.
- Add the vertical ruler: a 1px rail, a 2px accent fill, and one tick per step that turns from muted to accent
  (`transition: 0.3s`) as you reach it. It doubles as a step index and a "how much is left."
- A **7px square** (not circle) status dot that pulses on a 1 s cycle while something is resolving, and sits
  static when idle.

### 11.16 Corner marks and section badges

Two `::before`/`::after` pseudo-elements drawing **20 × 20 px, 2 px accent corner brackets** at the top corners of
each step panel, plus `content: attr(data-step)` in an accent chip pinned to the top-left. This is the cheapest
"designed" signal in the whole reference and it is one attribute plus two pseudo-elements.

---

## 12. Needs real WebGL, or costs too much

Since the reference site has no WebGL, this section is mostly about effects a designer might *assume* it uses, and
what they would actually cost.

### 12.1 Things that genuinely need Three.js — and my verdict for this product

| Effect | Real cost | Verdict for a QR-scanned tutorial |
| --- | --- | --- |
| **True 3D cards with perspective, thickness, and per-card lighting** | Three.js core, tree-shaken and gzipped, is ~150–170 KB — **roughly 2× the reference site's entire JS payload** for one feature. Plus a WebGL context (~30–60 MB GPU memory on mobile), shader compile on first frame (100–400 ms jank on a mid-range Android), and continuous GPU draw. | **Drop it.** A card table needs cards to be *legible*, not volumetric. CSS `transform: rotate()` + a 1px edge highlight reads as a card. |
| **Physics-based dealing (cards that tumble and settle)** | Three.js + a physics engine (cannon-es ~60 KB, rapier WASM ~500 KB+). Continuous simulation on the main thread or a worker. | **Drop it.** Non-deterministic settle positions actively hurt a teaching tool — the learner needs to see the same layout every time. Use a fixed arc with a stagger (§13.1). |
| **Realistic felt with cloth normal maps / raytraced-looking light** | 2–4 textures at 512–1024px (300 KB–1.5 MB even in KTX2), plus a lighting rig. First-load cost on 4G: seconds. | **Drop it.** The repeating-gradient ruling in §11.10 delivers 90% of the "material" read for 0 bytes. |
| **Post-processing (bloom, DOF, film grain, chromatic aberration)** | Adds full-screen render passes. On a mid-range phone, a single bloom pass at DPR 2 can cost 4–8 ms/frame on its own — enough to miss 60fps by itself. | **Drop it.** Grain is a 1px repeating gradient at 5% alpha. Bloom on a tutorial is noise. |
| **Particle systems (chips, confetti on a successful claim)** | ~20–40 KB for a light lib, or a canvas implementation. Battery: a full-screen particle burst is one of the most expensive things a phone can do. | **Cheap approximation instead:** 6–10 absolutely-positioned DOM elements, `transform` + `opacity` keyframes over 900 ms, then removed from the DOM. Under 1 KB of CSS, compositor-only, and it reads identically at that scale. |
| **Scroll-linked camera moves through a 3D scene** | The classic "portfolio" effect. Requires a persistent render loop even when nothing changes. | **Drop it — and note the reference site doesn't do it either.** Their equivalent is `position: sticky` over a tall track. |

### 12.2 Things that are cheap but still wrong for this product

Even at zero WebGL cost, some of the reference site's own choices should not survive the translation:

- **A 9.4-viewport scroll narrative.** Their page is 7,546 px on desktop and 7,711 px on mobile. A learner at a
  table with a phone wants **discrete steps with a Next button**, not a scroll story. Keep the reveals; throw away
  the scroll as the primary navigation.
- **A 786 ms intro curtain.** On a QR scan, the user has already waited for a camera, a redirect, and a cold TLS
  handshake. Budget **≤ 300 ms** for any intro, and make it skippable by any tap. Their boot-progress-inside-the-
  wordmark trick is lovely but it exists to cover a 1.9 s DOM-ready; if your app is ready in 400 ms, showing a
  loader is a lie that costs 786 ms.
- **A 214 KB (decoded) render-blocking stylesheet.** Their CSS is bigger than their app JS. For a tutorial,
  inline the critical ~8 KB and defer the rest, or keep the whole thing under 25 KB decoded. This is the one
  performance decision I would not copy.
- **A fake terminal as the interactive centrepiece.** It is charming for a designer's portfolio and it is
  `display: none` below 760px on their own site — which tells you what they think of it on a phone. Your
  checkpoints should be tap-a-card, not type-a-command.
- **Their sub-44px tap targets and sub-4.5:1 micro-type.** Covered in §11.7 and §11.12. These are the two places
  where copying faithfully would make the product worse.
- **`background-attachment: fixed`** — free-feeling on desktop, but it forces repaints on scroll on some mobile
  browsers. Use it on a **static, non-scrolling** step panel (which is your case anyway, if steps don't scroll),
  or accept it only on short sections.

### 12.3 The honest summary

Nothing about the admired qualities of pleurat.com requires WebGL, because pleurat.com does not use WebGL. If
someone proposes Three.js for the Fish onboarding guide, the burden of proof is on the proposal, and the reference
site is the counter-argument. **The budget I would hold the tutorial to: total transfer under 200 KB, JS under
60 KB, two font files, zero canvas.** The reference site does its whole nine-screen portfolio in 331 KB; a
twelve-step tutorial should comfortably beat that.

---

## 13. Applied to this product

How the admired qualities show up concretely in a 6-seat table, a 9-card hand, and a stepped walkthrough.

### 13.1 How cards enter

Apply the size-scaled entrance rule (§11.2). A card is a "card": **12 px travel, 0.50 s, `--ease-out`.**

The deal is a **stagger, not a physics sim**. Nine cards, **60 ms apart** — between their 38 ms curtain wipe (too
fast to read individually) and their 80 ms headline stagger (paced for reading). Total deal: `0.5 + 8 × 0.06 =
980 ms`. Under a second, and every card is individually perceptible.

Each card animates from a single shared origin point (the deck position) with `translate` + a small
`rotate(-4deg → 0)`, fanning into its final slot. Because the slots are fixed, the sequence is identical every
time — which is the whole point in a teaching tool. No overshoot: a card that bounces reads as a dropped card.

On `prefers-reduced-motion`, `--deal-travel: 0px` and the stagger collapses to 0 — the hand is simply there.

### 13.2 How the active seat is signalled

Use the dim-to-focus rule (§11.5), not a glow:

- All six seats sit at **`opacity: 0.6`**.
- The active seat transitions to **`opacity: 1` over 0.5 s**, and simultaneously (over 0.3 s):
  - its name goes from muted ink to full ink,
  - its seat label (`S3`, uppercase, 10.5 px, `+0.14em`) turns accent,
  - the 1px hairline under it turns from 8%-alpha to solid accent.
- A **7 px square** accent dot next to the label pulses on a **1 s** cycle while that seat is "thinking," and sits
  static otherwise.

Three simultaneous cheap changes. No shadow, no scale, no ring. On a 375px screen with six seats, opacity is the
only signal that survives at that size anyway.

### 13.3 How step transitions feel

- The step panel is a "sheet": **14 px travel, 0.38 s**, with its backdrop or dimming layer fading over **0.28 s**
  — the backdrop *leads*, the panel *follows*.
- The step title uses the masked-line reveal (§11.3): **0.7 s, 80 ms stagger, max 2 lines.**
- The outgoing step does **not** get a mirrored exit. Fade it in 0.2 s and let the incoming panel do the work.
  Symmetrical transitions double the perceived duration for no gain.
- Between steps, **nothing on the table re-deals.** Cards that persist across a step boundary should not animate
  at all — only the ones whose state actually changed. The reference site's discipline here is what makes it feel
  calm: it never animates something just because a section changed.
- Step furniture: a `data-step="STEP 04"` accent chip pinned to the panel's top-left, 20 × 20 px accent corner
  brackets, and a `STEP 4 / 12` fraction in the corner (§11.15, §11.16).

### 13.4 How a claim resolves visually

This is the moment that deserves the most motion in the whole product, so give it a sequence rather than a single
event. Roughly 1.5 s total, built from the existing vocabulary:

1. **0 ms** — The claimed set's cards, wherever they are around the table, all go to `opacity: 1` and their seat
   dims to 0.6. (The dim-to-focus rule, inverted: the *cards* become the subject, not the seat.)
2. **0–300 ms** — Each claimed card's hairline/edge turns accent, staggered **40 ms** around the table so the eye
   follows the claim from seat to seat.
3. **300–800 ms** — The cards travel to the claiming team's pile: **`translate` + `scale(1 → 0.92)`, 0.5 s,
   `--ease-out`,** staggered 40 ms. They shrink because they are going away, not toward you.
4. **800 ms** — The score chip increments. Use the **8 px / 0.40 s** chip entrance for the new value, and let the
   old value leave upward on the same timing. A number that swaps in place is the one place a tiny amount of
   theatre is earned.
5. **800–1,500 ms** — The status chip flips from a pulsing accent dot to static, and a one-line verdict appears
   with the **9 px / 0.50 s** caption entrance.
6. **On a failed claim**, use the *same* choreography with a neutral colour instead of accent, and no scale-down —
   the cards return to their owners rather than shrinking away. Do not shake, flash red, or buzz. The reference
   site has no error state that is louder than its success state, and that restraint is part of why it feels
   confident.

Under `prefers-reduced-motion`, collapse the whole sequence to: cards change colour, pile updates, verdict appears.
No travel, no stagger.

### 13.5 The table itself

- It is the one element that gets the **scene entrance**: 16 px travel plus **`scale(0.965 → 1)` over 0.66 s**.
  Once. On first paint.
- Draw it as **inline SVG** with `vector-effect: non-scaling-stroke`, so seat outlines and card edges hold their
  weight as the table scales to fit any viewport from 320 px to a desktop.
- Felt = the repeating-gradient ruling (§11.10), not an image.
- Use `mask-image: linear-gradient(90deg, transparent, black 6%, black 94%, transparent)` on the table container
  if seats can overflow horizontally on narrow phones — soft edges instead of a hard clip.
- Ambient life: a single **1.6 s** breathing indicator on whichever seat is active, and a second indicator (if
  any) offset by **0.3 s** so they never sync. Nothing else on the table should move while the learner is reading.

### 13.6 What the first three seconds should be

Reconstructing their choreography for this product's constraints:

| Time | What happens |
| --- | --- |
| 0–150 ms | Warm ground paints. Nothing else. No spinner. |
| 150–250 ms | Table enters: 16 px + `scale(0.965 → 1)`, 0.66 s (still settling when the next thing starts). |
| 250 ms | Step-1 title begins its masked-line reveal, 0.7 s, 80 ms per line. |
| 400 ms | Deal begins: 9 cards, 12 px each, 0.5 s, 60 ms apart. Finishes at ~1.38 s. |
| 1,400 ms | Scroll/next cue fades in and starts its 1.8 s loop. |

Total to "the learner can act": **under 1.5 s**, versus the reference site's 1.9 s to DOM-ready plus a 786 ms
curtain. Same choreographic logic — ground, then stage, then headline, then content, then affordance — compressed
to phone-tutorial scale.

---

## 14. One-page cheat sheet

```
EASING     --ease-out:   cubic-bezier(.2, .8, .2, 1)     everything that arrives
           --ease-inout: cubic-bezier(.7, 0, .2, 1)      A↔B morphs only
DURATIONS  feedback 150–500ms · ambient 1.6–6s · nothing in between
ENTRANCE   chip 8px/.40s · card 12px/.50s · panel 14px/.38s ·
           scene 16px+scale(.965)/.66s · block 20px/.60s · line 140% masked/.70s
           fade on `ease`, transform on --ease-out, same duration, fill: both
STAGGER    deal 60ms · headline lines 80ms · claim around table 40ms
FOCUS      inactive opacity .6 → active 1 over .5s
ACTIVE     text muted→ink + label→accent + hairline 8%→accent, all .3s
PRESS      :active { transform: scale(.965) }  ·  hover lift -2px
TYPE       one family, weights 400+500 · lh 1.14 display / 1.55 body / 1.7 prose
           tracking -.03em display / 0 body / +.14em uppercase micro
           mobile: 35/32/17.5/16/12.5/10.5 px · measure 20-22ch head, 46-52ch body
COLOUR     no pure white, no pure black, one accent identical in both themes
           accent = state only · all instructional text ≥ 4.5:1
SPACING    gutter 13px + inset 12px = 25px text margin; rules align to gutter
           section padding clamp(48px, 7vh, 96px)
TEXTURE    ruling: repeating-linear-gradient(0deg, ink/5% 0 1px, transparent 1px 5px)
           dots:   radial-gradient(circle, ink/16% 1.15px, transparent 1.25px)
BORDERS    box-shadow: inset 0 0 0 1px  (never `border` on state change)
DISCLOSURE grid-template-rows: 0fr → 1fr, .45s
REVEAL     IntersectionObserver threshold 0.16 → class toggle → CSS transition
CUE        1px × 26px line, scaleY 0→1 origin top, then 1→0 origin bottom, 1.8s
A11Y       zero the motion tokens under prefers-reduced-motion
           :focus-visible 2px accent, 3px offset · ALL targets ≥ 44×44px
BUDGET     < 200 KB total · < 60 KB JS · 2 font files · zero canvas
```
