# MOTION_STACK.md — the animation and visual layer

**Status:** Recommendation. Decision delegated by the project owner, made here on measured evidence.
**Date:** 2026-08-21. **Scope:** research and recommendation only — no application code was written.
**Units:** KB = 1,000 bytes throughout, matching `docs/MOBILE_SPEC.md` §1.6's own budget language.

---

## 1. The verdict

> **Do not use Three.js. Do not use any WebGL library. Do not use any JavaScript animation library.**
>
> Ship **CSS transitions and `@keyframes`, driven by the `data-*` attributes the components already
> expose**, plus the **native View Transitions API** for the two things CSS genuinely cannot do
> (animating an element React has already removed, and morphing a value that changed as text).
>
> **Measured byte cost of this recommendation: 1,639 bytes gzipped / 1,399 bytes brotli** —
> 1,560 B of motion CSS and a 79 B JavaScript shim. That is **1.6 KB of the 23.4 KB of remaining
> headroom**, leaving 21.8 KB for the visual design system.
>
> **Measured cost of the Three.js alternative: 126,388 bytes gzipped** for a scene that does
> nothing yet. That is **5.4× the entire remaining budget**, and **6.4 KB more than the project's
> 120 KB hard ceiling all by itself**, before React, before app code, before one byte of CSS.

Three facts drove it, all measured in this session:

1. **The reference site the owner admires contains no WebGL at all.** Re-verified independently
   (§2). Zero `<canvas>`, zero `getContext` calls across 458,925 characters of shipped JavaScript.
2. **Tree-shaking Three.js buys almost nothing.** Going from the absolute minimum scene to a full
   nine-card table costs **1,059 more gzipped bytes**. The first 126 KB is the door charge (§3.1).
3. **A WebGL card table cannot satisfy this product's own accessibility contract** — and this is
   the argument that would still hold if Three.js were free (§7.3).

---

## 2. Re-verification of the prior finding

`docs/DESIGN_INSPIRATION.md` §1 claims pleurat.com uses no Three.js, no WebGL, and no `<canvas>`.
I re-verified this from scratch rather than trusting it.

### 2.1 Method

Loaded `https://www.pleurat.com/` in a real browser (Chrome 148.0.7778.280), then:

- counted `<canvas>` elements in the live DOM;
- probed `window` for `THREE`, `OGL`, `regl`, `twgl`, `PIXI`, `BABYLON`, `gsap`, `TweenMax`, `anime`,
  `Motion`, `Lenis`, `LocomotiveScroll`, `ScrollTrigger`;
- **fetched and string-searched every shipped JavaScript chunk** (10 files, 458,925 characters) for
  `getContext`, `webgl`, `WebGL`, `createShader`, `shaderSource`, `drawArrays`, `drawElements`,
  `THREE`, `requestAdapter`, `OffscreenCanvas`;
- re-fetched every same-origin asset with `cache: 'reload'` to force revalidation, then read real
  `transferSize` values from the Resource Timing API;
- fetched and analysed both stylesheets (231,720 decoded characters).

### 2.2 Result — the headline finding is CONFIRMED

| Check | Result |
|---|---|
| `<canvas>` elements in the DOM | **0** |
| `getContext` occurrences in all shipped JS | **0** |
| `webgl` / `WebGL` / `createShader` / `shaderSource` / `drawArrays` | **0** |
| `THREE` / `requestAdapter` / `OffscreenCanvas` | **0** |
| 3D globals on `window` | **none** |
| `.glb` / `.gltf` / `.hdr` / `.ktx2` / `.basis` assets | **0** |

The only hits for the substring `canvas` were 18 occurrences inside Sanity CMS route strings
(`/canvases/${id}`) and UI copy ("put one on the canvas"). `getContext` appearing zero times is
conclusive on its own: no canvas context of any kind — 2D or WebGL — is ever created.

The CSS analysis further confirms there is no 3D of any kind, not even in CSS:

| In 231,720 chars of CSS | Count |
|---|---|
| `@keyframes` blocks | **86** |
| `cubic-bezier(...)` | 25 |
| custom property declarations | 230 |
| `position: sticky` | 8 |
| `will-change` | 11 |
| `backdrop-filter` | 4 |
| `prefers-reduced-motion` | 18 |
| `perspective` / `preserve-3d` / `rotate3d` / `translateZ` / `backface-visibility` | **0 / 0 / 0 / 0 / 0** |
| `animation-timeline` / `@starting-style` / `@container` / `view-transition-name` | **0 / 0 / 0 / 0** |

And in the JavaScript: **0** uses of `Element.animate()` (no Web Animations API either), **0**
`startViewTransition`, 18 `requestAnimationFrame`, 2 `IntersectionObserver`, 1 `ResizeObserver`,
4 scroll listeners, 11 `matchMedia`, and **9 `prefers-reduced-motion` checks in JS** — which
resolves the open question flagged at `DESIGN_INSPIRATION.md` §10.2: the site's JS *does* consult
the media query.

**Conclusion: the admired look is 86 CSS keyframe animations, `position: sticky`, and
`IntersectionObserver`. Not one line of it is 3D.**

### 2.3 Correction — the prior study's byte figure is wrong

`DESIGN_INSPIRATION.md` §1 states the site ships *"74 KB compressed across **all** scripts
including React and the router."* **That number is wrong, by roughly 2×.**

Measured over the wire, with forced revalidation:

| | Transferred | Decoded |
|---|---|---|
| HTML document | 300 B (br) | 10,346 B |
| **JavaScript, all chunks** | **158.1 KB** | 615 KB |
| — of which critical path (entry + 9 `modulepreload`s) | **119.4 KB** | — |
| — `react-dom` chunk alone | 47.5 KB | 141.9 KB |
| **CSS** | **46.1 KB** | 231.7 KB |
| — `theme.css` alone | 43.2 KB | 219.0 KB |
| Images (AVIF + WebP + SVG) | 125.7 KB | — |
| **Total transferred** | **330.5 KB** | 810.5 KB |

The 330.5 KB total matches the prior study's 331 KB exactly, so the two measurements agree on the
whole — but the study's own §3.4 asset table (react-dom 46.4 + CMS 37.1 + app entry 30.7 =
114.2 KB) already contradicts its own §1 headline of 74 KB. The arithmetic never worked.

**Why this matters, and why it strengthens rather than weakens the verdict:**

- The study used "74 KB of JS is smaller than a minimal Three.js build" as a rhetorical flourish.
  Against the true 158.1 KB, **that specific sentence is false** and should not be repeated.
- But the corrected number makes the budget case *harder*, not easier: pleurat.com's
  **critical-path JavaScript alone (119.4 KB) exceeds this project's entire 98 KB first-load
  budget**, and its stylesheet alone (46.1 KB) is double the 23.4 KB of headroom that remains.
- So the instruction to the designer is not "match the reference." It is **"achieve the reference's
  feel on roughly a third of its bytes."** That is achievable — 86 keyframe rules compress to very
  little — but only if nothing expensive is added. Three.js is the most expensive thing available.

One more thing the prior study missed: the site loads Google Analytics (`gtag`) and Vercel
Insights. This project ships neither (`MOBILE_SPEC.md` §9.2), which is a genuine advantage.

---

## 3. Measured evidence table

All figures below were **measured in this session**, not cited. Method: each library was installed
and built with **the project's own toolchain** — Vite 8.2.2 (rolldown + oxc minifier), `target:
es2022`, sourcemaps off — then compressed with `gzip -9` and `brotli -q 11`. An empty module built
the same way is **700 B raw / 426 B gzip / 337 B brotli**; subtract that for library-only figures.

**Cross-validation.** Because the Three.js number decides the whole question, it was measured a
second time by an independent route: a different bundler (esbuild 0.28.2, `--bundle --minify
--format=esm`) and, separately, Bundlephobia's own resolver. The three agree:

| Three.js, full `import * as THREE` | gzip | Δ |
|---|---|---|
| This document (Vite 8 / rolldown / oxc) | 181,946 | — |
| Independent build (esbuild 0.28.2) | 186,794 | +2.7% |
| Bundlephobia API (webpack) | 182,364 | +0.2% |

| Three.js, `WebGLRenderer` floor | gzip | Δ |
|---|---|---|
| This document | 126,388 | — |
| Independent build (esbuild 0.28.2) | 129,717 | +2.6% |

Three toolchains, within 2.7%. The floor is real and it is not a bundler artefact.

### 3.1 Three.js — the door charge

`three@0.185.1`, current release at time of writing.

| Build | Raw | **gzip** | brotli |
|---|---|---|---|
| **Floor** — `WebGLRenderer` + `Scene` + `PerspectiveCamera` + `PlaneGeometry` + `MeshBasicMaterial` + 1 `Mesh` | 512,603 | **126,388** | 104,132 |
| **Card table** — the above plus 10 meshes, `CanvasTexture`, `Group`, `Color`, `MathUtils`, rAF loop | 515,295 | **127,447** | 105,158 |
| **Full** — `import * as THREE from 'three'` | 724,944 | **181,946** | 148,450 |
| Official prebuilt `three.core.min.js` | 385,386 | 100,867 | 82,263 |
| Official prebuilt `three.module.min.js` (imports core) | 365,552 | 86,590 | 72,382 |
| Official prebuilt, **core + module combined** = the real full WebGL build | 750,938 | 187,457 | 154,645 |
| Official prebuilt `three.webgpu.min.js` | 667,861 | 184,605 | 150,507 |

**The finding that settles the question:** the difference between the absolute floor and a complete
nine-card table scene is **1,059 gzipped bytes**. Tree-shaking a modern Three.js does work — it
saves ~30% against the full namespace import — but **`WebGLRenderer` transitively pulls in the
shader chunk library and the program/uniform plumbing, and that is ~126 KB gzipped that cannot be
shaken off.** There is no official "slim" or "core-only" WebGL target that avoids it.

So the trade is not "pay for what you use." It is **pay 126 KB, then build for free.** For a product
whose entire remaining budget is 23.4 KB, that is not a trade that can be made at any scale.

Note also `three.webgpu.min.js` at 184.6 KB gzip: WebGPU is *larger*, not smaller.

### 3.2 Lighter WebGL

| Library | Version | What was built | Raw | **gzip** | brotli |
|---|---|---|---|---|---|
| Hand-written raw WebGL | — | textured quad: shader compile, buffers, texture, draw | 1,698 | **803** | 705 |
| **twgl.js** | 7.0.0 | program + buffers + one draw call | 20,170 | **6,705** | 5,922 |
| **`fourwastaken`** ("four") | 0.4.3 | minimal three-alternative, full import | 25,898 | **8,804** | 8,049 |
| **gl-matrix** | 3.4.4 | math only, no renderer | 53,819 | **13,638** | 10,803 |
| **ogl** | 1.0.11 | renderer, camera, 9 textured quads, custom shader | 53,947 | **15,370** | 13,136 |
| **regl** | 2.1.1 | one triangle | 121,415 | **39,433** | 34,751 |
| `@react-three/fiber` | 9.7.0 | `{ Canvas }` — **on top of Three.js, not instead of it** | 163,357 | **51,795** | 45,703 |

Note the last row. This is a React app, so the realistic way anyone would actually use Three.js here
is React Three Fiber — which means **127.4 + 51.8 = 179.2 KB gzipped**, not 127.4. The `fourwastaken`
and hand-written rows are honest: a textured quad in raw WebGL really is under a kilobyte.

So the lighter options are real and genuinely small — `twgl` at 6.7 KB gzip is a fifth of the
headroom, `ogl` at 15.4 KB is two-thirds of it, raw WebGL is a rounding error. **They are still the
wrong answer**, for reasons that are not about bytes:

- Every one of them hands you a **`<canvas>`**, which is an image. Everything drawn into it stops
  being text (§7.3).
- You must author GLSL by hand, and **shader compilation is a first-frame cost of roughly
  100–400 ms on a mid-range Android**, landing precisely inside the 3.5 s first-meaningful-paint
  budget (`MOBILE_SPEC.md` §1.7).
- A WebGL context costs GPU memory that a five-year-old phone at a club table does not have spare.
- `MOBILE_SPEC.md` §8.2 caps concurrent animation at 2 elements and forbids idle rAF loops. A WebGL
  renderer is a permanent rAF loop by construction; stopping it means the canvas is a still image,
  at which point it should have been CSS.

`regl` at 39.4 KB is disqualified on size alone — 1.7× the entire remaining budget.

And to be scrupulous about the cheapest case: a complete hand-written textured-quad renderer really
is **803 bytes gzipped**, which is half the recommended CSS layer. It is still the wrong answer,
because it inherits every non-byte objection above — the canvas is still an image, the shader still
compiles on the first frame — and it adds a hand-rolled renderer to maintain. **Cheap is not the
same as free, and here it is not even the constraint.**

### 3.3 Animation libraries

| Library | Version | Raw | **gzip** | brotli | vs. remaining 23.4 KB |
|---|---|---|---|---|---|
| **Hand-written FLIP** on `Element.animate()` | — | ~600 | **~300** | — | ~1% |
| **`motion/mini`** (WAAPI `animate()`) | 13.1.1 | 8,170 | **3,233** | 2,932 | 14% |
| **`@formkit/auto-animate`** | 0.10.0 | 8,327 | **3,247** | — | 14% |
| **`popmotion`** | 11.0.5 | 15,424 | **6,828** | — | 29% |
| **`flip-toolkit`** | 7.2.6 | 21,964 | **7,140** | — | 31% |
| **anime.js** (`{ animate, stagger }`) | 4.5.0 | 33,989 | **13,826** | 12,563 | 59% |
| **`@react-spring/web`** | 10.1.2 | 52,360 | **20,074** | — | 86% |
| **`motion`** (full) | 13.1.1 | 61,930 | **21,547** | 19,758 | **92%** |
| **GSAP** core | 3.15.0 | 70,317 | **27,190** | 24,826 | **116% — over** |
| GSAP core + Flip plugin | 3.15.0 | — | **~37,000** | — | **158% — over** |
| **`framer-motion`** (whole package) | 13.1.1 | 185,337 | **62,054** | — | **265% — over** |
| **Recommended CSS layer** | — | 5,564 | **1,560** | 1,333 | **6.7%** |

Three status notes, since these packages are widely misdescribed:

- **GSAP became 100% free — including every former Club plugin (ScrollTrigger, Flip, SplitText,
  MorphSVG) and including commercial use — on 30 April 2025**, after Webflow acquired it. Licensing
  is no longer an argument against GSAP. **Size still is**: core alone is 116% of the remaining
  budget, and core + Flip is 158%.
- **`popmotion` is not deprecated**, but it has had no release since August 2022; its engine now
  lives inside Motion.
- **`framer-motion` has not been replaced by `motion` so much as renamed.** Both publish from the
  same repository at the identical version, and `motion/react` re-exports `framer-motion` directly.
  Treat them as one library with two entry points, priced above.

**What these buy over plain CSS, honestly:** spring physics, keyframe sequencing with a timeline,
stagger helpers, and FLIP. This product needs none of them:

- **Springs** — explicitly rejected. `DESIGN_INSPIRATION.md` §4.1 measured that the reference site
  declares a spring token and never leans on it; §11.1 argues that overshoot on a card reads as a
  mis-deal. Nothing here should bounce.
- **Timelines** — the longest sequence in the product is the claim resolution, ~1.5 s of five beats.
  That is five `animation-delay` values.
- **Stagger** — three values in the whole system (60 ms, 80 ms, 40 ms), applied to at most 9
  elements. Eight `:nth-child()` rules, ~200 bytes.
- **FLIP** — the genuine gap, and the one thing a library could justify. Three things close it
  without one: View Transitions does it natively for 79 bytes (§3.4); the canonical hand-written
  FLIP on `Element.animate()` is about twenty lines and ~300 bytes gzipped; and `@formkit/auto-
  animate`, the tiny option people reach for, **does not actually do this** — it is scoped to one
  parent's immediate children and has no cross-container reparent mechanism. The cheapest
  purpose-built FLIP library is `flip-toolkit` at 7.1 KB, which is 4.6× the entire recommended
  motion layer for one effect.

`motion/mini` at 3.2 KB is the only library I would not argue against on size. I still argue
against it on need: it would add a runtime dependency, a wiring surface inside `.tsx` files that
`CODEX_HANDOFF.md` §3 places off limits to the designer, and a second place where motion is
defined — for capability the platform now ships for free.

### 3.4 Native platform features — verified support, August 2026

Every row verified against caniuse.com; nothing here is from memory.

| Feature | Global | iOS Safari | Chrome | Firefox | Use here |
|---|---|---|---|---|---|
| **View Transitions** (same-document) | **90.2%** | **18.0+** | 111+ | 144+ | **Yes — core of the recommendation** |
| **`@starting-style`** | **90.7%** | **17.5+** | 117+ | 129+ | Yes — sheet and card entrances |
| **`transition-behavior: allow-discrete`** | **90.7%** | **17.4+** | 117+ | 129+ | Yes — animating `display` on sheets |
| **`linear()` easing** | **92.0%** | **17.2+** | 113+ | 112+ | Available; not needed (see §5) |
| **Container queries** (size) | **94.1%** | **16.0+** | 106+ | 110+ | Yes — layout, not motion |
| **CSS 3D** (`perspective`, `preserve-3d`, `rotate3d`) | universal | all | all | all | Yes — card flip only |
| **`animation-timeline`** (scroll-driven) | 85.4% | 26.0+ | 115+ | 157+ | **No** — the shell never scrolls |
| **`interpolate-size` / `calc-size()`** | **70.5%** | **not supported** | 129+ | not supported | **No** — Chrome/Edge only |
| **`sibling-index()`** | **79.6%** | 26.2+ | 138+ | 154+ | **No** — too new; use `:nth-child()` |
| **`@property`** | 94.2% | 16.4+ | 85+ | 128+ | Available; not needed |
| **`<dialog>`** / **`popover`** | 96.1% / 91.5% | 15.4+ / **18.3+** | 37+ / 116+ | Yes — sheets |
| **`@media (update: slow)`** | 92.2% | 17+ | 113+ | yes | See §7.4 — supported, but measures the wrong thing |
| **`navigator.deviceMemory`** | 76.4% | **not supported** | 63+ | not supported | **No** — see §7.4 |

Two of these are traps worth naming explicitly, because both are widely written about as if they
had shipped:

- **`interpolate-size: allow-keywords`** (animating to `height: auto`) is **Chrome and Edge only**.
  Safari and Firefox have not implemented it. Use the `grid-template-rows: 0fr → 1fr` technique from
  `DESIGN_INSPIRATION.md` §11.6 instead — it works everywhere and is already in the token set below.
- **`sibling-index()`** reached Baseline "newly available" on **2026-08-18 — three days before this
  document**, when Firefox 154 shipped it (Chrome 138 in June 2025, Safari 26.2 in December 2025).
  It is real and it is in Safari, but global support is **79.6%**, and Safari only got it eight
  months ago — so roughly one in five learners, skewed toward the older phones this product
  explicitly targets, would get no stagger at all. `calc(sibling-index() * var(--stagger-deal))` is
  one line; the eight `:nth-child()` rules that work everywhere are ~200 bytes. **Pay the 200
  bytes.** Revisit in a year.

### 3.5 The recommendation, costed

| Component | Raw | **gzip** | brotli |
|---|---|---|---|
| Motion CSS layer — tokens, keyframes, all six interactions, view-transition rules, reduced-motion block | 5,564 | **1,560** | 1,333 |
| View-Transition JS shim (minified, net of bundler baseline) | 172 | **79** | 66 |
| **Total** | **5,736** | **1,639** | **1,399** |

Against the current build, measured from `dist/`:

| | Raw | gzip | brotli |
|---|---|---|---|
| `index.html` | 726 | 441 | 288 |
| `index-*.js` | 236,607 | 73,599 | 64,048 |
| `index-*.css` (empty stubs) | 877 | 523 | 375 |
| **Current critical path** | 238,210 | **74,563** | **64,711** |
| **+ this recommendation** | 243,946 | **76,202** | **66,110** |
| Headroom remaining against the 98 KB target | | **21.8 KB** | **31.9 KB** |

Note the brotli column. Vercel serves brotli — I confirmed `content-encoding: br` on every
same-origin asset of the reference site, which is on the same platform. `MOBILE_SPEC.md` §1.6 says
"Brotli, falling back to gzip," so **the real headroom is closer to 31.9 KB than 23.4 KB.** Hold the
gzip number as the safe figure; bank the difference.

For contrast, the same table with Three.js:

| | gzip | vs. 98 KB target | vs. 120 KB ceiling |
|---|---|---|---|
| Current + Three.js card scene | **202.0 KB** | **2.06×** | **1.68×** |
| Current + Three.js, brotli | **169.9 KB** | 1.73× | **1.42×** |

There is no configuration in which it fits.

---

## 4. Per-interaction technique

First, the fact that determines most of these — established by reading the components, not assumed:

> **`TableView` renders no cards.** Each of the six seats is a name, a public count, and a team
> marker. The only card elements that exist in the DOM are the learner's own nine, inside
> `HandFan`. The whole app is **544 DOM nodes** (measured against the running dev server), against
> the reference site's 2,656.

That single fact removes the most Three.js-shaped requirement in the brief before it starts.

### 4.1 "Cards moving from one player's hand to another on a hit"

**This motion does not exist and should not be built.** There is no card at Kofi's seat to move —
`MOBILE_SPEC.md` §4.4 deliberately renders opponents as counts, because six fanned hands do not fit
on a 375 px screen and hidden information must stay hidden. Creating the card to fly would mean
editing `TableView.tsx`, which `CODEX_HANDOFF.md` §3 places off limits.

What actually changes on a hit: **one count decrements, another increments, and — only when the
learner is involved — one `<li>` enters or leaves `HandFan`.**

| Sub-event | Technique |
|---|---|
| Seat count changes | **View Transition.** Give each count a name: `[data-seat="0"] .count { view-transition-name: seat-0-count }` (6 rules). The old digit leaves upward, the new arrives from below — the `--rise-chip` / `--dur-chip` entrance. This is `DESIGN_INSPIRATION.md` §13.4 step 4's "number that swaps in place," and it is the one place a little theatre is earned. |
| Card arrives in the learner's hand | **Pure CSS.** A newly inserted element runs its `animation` automatically. `--rise-card` / `--dur-card` (12 px, 500 ms). No JS. |
| Card leaves the learner's hand | **View Transition.** React removes the node; CSS has nothing left to animate. `::view-transition-old()` is the only zero-byte mechanism that can. |
| Directing attention to *who* | **Not motion.** The log ticker line and the `[data-active]` seat change carry it. |

### 4.2 "A half-suit resolving and leaving every hand"

The product's biggest moment. Five beats, one View Transition, sequenced with `animation-delay` on
the pseudo-elements — no timeline library.

| ms | What | Technique |
|---|---|---|
| 0 | The claimed cards become the subject; their seat dims | CSS: invert the focus rule — `opacity: var(--dim)` on the seat, `1` on the cards |
| 0–300 | Each claimed card's edge turns accent, 40 ms apart around the table | CSS `transition`, `--stagger-claim` via `:nth-child()` |
| 300–800 | The learner's cards for that half-suit leave | **View Transition:** `::view-transition-old(hs-*)` — `translate` toward the rail plus `scale(1 → var(--shrink))`, `--dur-card`. They shrink because they are going away. |
| 800 | The score chip flips `[data-state="open"] → `[data-state="team0"]` | **Pure CSS.** An attribute-value selector that newly matches restarts its `animation` — `--rise-chip` / `--dur-chip`. No JS, no VT. |
| 800 | The numeric score increments | **View Transition** on `[data-testid="score-blue"]` — a text change, same as a count |
| 800–1500 | One-line verdict appears | **Pure CSS**, `--rise-caption` / `--dur-card` |

Give the nine `[data-half-suit]` groups explicit view-transition names (9 rules). Do **not** use
`view-transition-name: attr(data-half-suit type(<custom-ident>))` — `attr()` with a type is
Chrome-only today.

**The void outcome** (`[data-outcome="void"]`) uses the *same* choreography in a neutral colour with
**no** `--shrink`: the cards return rather than shrink away. Per `DESIGN_INSPIRATION.md` §13.4 and
`CODEX_HANDOFF.md` §6, it must look like neither a win nor a loss. Do not shake, flash, or buzz.

### 4.3 "The active seat changing"

**Pure CSS. Zero JS, zero View Transitions, and by far the highest value per byte in the document.**

```
[data-testid^="seat-"]            { opacity: var(--dim); transition: opacity var(--dur-focus) var(--ease-out); }
[data-testid^="seat-"][data-active] { opacity: 1; }
```

Plus the three-signal active-row pattern over `--dur-state`, all of which are attribute-driven:
the name goes muted → full ink, the count turns accent, and the hairline under it goes 8%-alpha →
solid accent. Three cheap simultaneous changes read as more emphatic than any one expensive one,
and opacity is free on the compositor.

The component already sets `aria-current` and an accessible name ending "to act", so the non-visual
channel is handled — which is what `MOBILE_SPEC.md` §7.3.4 requires.

### 4.4 "Step-to-step transitions"

`useTutorial` precomputes every frame and navigation is a single index change, so **one React state
update repaints the counts, the hand, the rail, and the log together.** That is the ideal shape for
`document.startViewTransition()`: wrap the update and the browser captures before/after for
everything at once.

| Element | Technique |
|---|---|
| Annotation panel | `[data-zone="annotation"] { view-transition-name: annotation }`, `--rise-panel` / `--dur-panel` (14 px, 380 ms) |
| Step title | Masked-line reveal — clip box with `overflow: hidden`, `padding-block-end: .22em` / `margin-block-end: -.22em` for descenders, inner span `translate: 0 140% → 0`, `--dur-line`, 80 ms per line, **max 2 lines** |
| Outgoing step | Fade only, `--dur-micro`. **No mirrored exit** — symmetrical transitions double perceived duration for no gain |
| Anything unchanged on the table | **Does not animate.** Give it no `view-transition-name`. The reference site's restraint here is most of why it feels calm |

**Without View Transitions** (the ~10% of browsers), the annotation swaps instantly and everything
else still works. That is an acceptable, honest degradation — and note the CSS-only alternative is
19 per-step selectors (`[data-step="s1"]`, …) to force an animation restart, ~760 bytes of rules to
recreate what the platform does in one.

### 4.5 "The score rail filling"

Two different problems that look like one.

- **The nine chips** — `[data-state]` flips. **Pure CSS**, as in §4.2. Add `[data-ninth]` its own
  treatment; `CODEX_HANDOFF.md` §6 asks for the ninth half-suit to be visible as the thing that
  breaks a 4–4, and the rail is where a learner should see it.
- **The `StepNav` progress bar** — `progressFill` carries an **inline `inline-size` percentage**,
  and `MOBILE_SPEC.md` §8.2 forbids animating `width`/`inline-size`.

  **Recommended now, no code change:** make the track `position: relative; overflow: hidden` and the
  fill `position: absolute; inset-block: 0; inset-inline-start: 0`, then
  `transition: inline-size var(--dur-state) var(--ease-out)`. This is a deliberate, argued exception
  to §8.2: the element is out of flow, has no children and no in-flow siblings, and is 4 px tall, so
  the layout it dirties is itself alone. It runs once per step, not per frame.

  **Better, and worth one line from the owner:** change `style={{ inlineSize: … }}` to
  `style={{ '--fill': progress }}` in `StepNav.tsx` and use `transform: scaleX(var(--fill))` with
  `transform-origin: inline-start`. Compositor-only, no exception needed. This is the single
  highest-value `.tsx` line in the product for motion purposes.

### 4.6 The rest, for completeness

| Interaction | Technique | Tokens |
|---|---|---|
| **First paint — the table** | The one element that scales on entry. Once, never again | `--rise-scene` + `--scene-scale`, `--dur-scene` |
| **First paint — the deal** | 9 `<li>`, 60 ms apart, via `:nth-child(2)…(9)` — **not** `sibling-index()` | `--rise-card`, `--dur-card`, `--stagger-deal` |
| **Log entry arriving** | Newly inserted element animates automatically. Pure CSS | `--rise-caption`, `--dur-card` |
| **Checkpoint feedback** | `[data-state="idle\|wrong\|correct"]`, `[data-placed]`, `[data-checked]` — colour, glyph and text swap. `MOBILE_SPEC.md` §7.3.6 forbids colour alone, so motion is decoration here, not signal | `--dur-state` |
| **Bottom sheets** | `<dialog>` or `popover` + `@starting-style` + `transition-behavior: allow-discrete`. ≤ 400 ms per §8.2. **No `backdrop-filter`** — forbidden on animating surfaces | `--rise-panel`, `--dur-panel` |
| **Disclosure / "tell me more"** | `grid-template-rows: 0fr → 1fr` with `overflow: hidden; min-block-size: 0` on the child. No measurement, correct at any length, works in Safari — unlike `interpolate-size` | `--dur-panel` |
| **Press feedback** | `:active { scale: var(--press-scale) }`. On touch there is no hover, so the 3.5% squash is the only confirmation a finger gets. Must render within 100 ms (§6.7) | `--press-scale`, `--dur-press` |
| **Card flip**, if wanted | `perspective` + `transform-style: preserve-3d` + `rotate3d`. Baseline widely available, 96.7%. **The one place CSS 3D earns its keep** — and note the reference site uses none of it. **Trap:** any `overflow` value other than `visible` on an ancestor forces `transform-style` to compute as `flat` and silently kills the 3D. This is spec-mandated and cross-browser, not an iOS bug — and `HandFan`'s card list is exactly the place someone will reach for `overflow: hidden` | `--dur-card` |
| **Active-seat "thinking" pulse** | A single breathing indicator, 1.6 s. **Exactly one**, and only while a seat is active — §8.2 forbids infinite animations, so this needs an owner exception or should be dropped | `--dur-ambient` |

On that last row, be strict: `MOBILE_SPEC.md` §8.2 says "**no infinite or looping animations
anywhere**," and acceptance criterion 44 tests for zero scripted animation frames after 3 s idle.
A breathing dot violates both. **My recommendation is to drop it** and let the three static signals
in §4.3 carry the active seat. The reference site's ambient loops exist to make a portfolio feel
alive; a learner at a table with people talking does not need a second thing competing for
attention, and it costs battery for ten minutes straight.

---

## 5. Motion token set

Derived from the measurements in `docs/DESIGN_INSPIRATION.md` §4.1–4.4 and §11.2, with the two
rules that document records made explicit: **entrance distance scales with object size**, and
**one easing does most of the work**. Values adjusted where §11.2 argues a phone tutorial should be
brisker than a portfolio.

```css
:root {
  /* ── Easing ────────────────────────────────────────────────────────────────
     One curve does ~90% of the work. The second exists only for A↔B morphs,
     where the motion is a change of state rather than an arrival.
     No spring. Overshoot on a card reads as a mis-deal.               (§4.1) */
  --ease-out:   cubic-bezier(.2, .8, .2, 1);   /* everything that arrives */
  --ease-inout: cubic-bezier(.7, 0, .2, 1);    /* A↔B morphs only         */
  --ease-mask:  cubic-bezier(.2, .85, .2, 1);  /* masked headline only    */

  /* ── Duration ──────────────────────────────────────────────────────────────
     Bimodal by design: feedback 120–700ms, ambient 1.6s+. Nothing between.
     Measured census: 0.3s×25, 0.2s×20, 0.25s×12, 0.5s×8, 0.18s×6.      (§4.2)
     Capped at 400ms for sheets per MOBILE_SPEC §8.2.                        */
  --dur-press:   120ms;  /* :active squash — must paint inside 100ms  (§6.7) */
  --dur-micro:   180ms;  /* hover, opacity, outgoing fade                    */
  --dur-state:   240ms;  /* colour + attribute state changes                 */
  --dur-panel:   380ms;  /* sheets, disclosure  — §8.2 ceiling is 400ms      */
  --dur-chip:    400ms;  /* chips, score numbers                             */
  --dur-card:    500ms;  /* one card entering or leaving                     */
  --dur-focus:   500ms;  /* dim ↔ focus on seats                             */
  --dur-block:   600ms;  /* a revealed block (§11.2 shortens 800 → 600)      */
  --dur-scene:   660ms;  /* the table, once, on first paint                  */
  --dur-line:    700ms;  /* masked headline line (§11.2 shortens 900 → 700)  */
  --dur-ambient: 1600ms; /* see §4.6 — recommended NOT to be used            */

  /* ── Stagger ───────────────────────────────────────────────────────────────
     Only three values exist, and each means something.                 (§4.4)
     Applied with :nth-child(); sibling-index() is only 79.6% supported. (§3.4) */
  --stagger-deal:  60ms;  /* 9 cards → 980ms total. Individually perceptible */
  --stagger-line:  80ms;  /* headline lines — you are meant to read the beat */
  --stagger-claim: 40ms;  /* around the table, so the eye follows the claim  */

  /* ── Distance — scales with the size of the thing that moves ───────────────
     This is the single most transferable rule in the reference system. (§4.3)
     Every entrance is translate-up + fade; only the scene also scales.       */
  --rise-chip:    8px;   /* badge, chip, score number       — --dur-chip     */
  --rise-caption: 9px;   /* log entry, verdict line         — --dur-card     */
  --rise-card:   12px;   /* one playing card                — --dur-card     */
  --rise-panel:  14px;   /* step panel, bottom sheet        — --dur-panel    */
  --rise-scene:  16px;   /* the table                       — --dur-scene    */
  --rise-block:  20px;   /* a revealed block                — --dur-block    */
  --rise-line:  140%;    /* masked headline, of its own height — --dur-line  */

  /* ── Scale and displacement ───────────────────────────────────────────── */
  --scene-scale: .965;   /* the table, on first paint only                   */
  --press-scale: .965;   /* :active squash — 3.5%                            */
  --shrink:      .92;    /* a card leaving toward the pile: going away       */
  --lift:       -2px;    /* hover elevation — the ENTIRE hover system        */
  --nudge:       3px;    /* arrow nudge, translate(3px, -3px) over 320ms     */

  /* ── Opacity ──────────────────────────────────────────────────────────── */
  --dim: .6;             /* "not the subject right now" — the universal rule */
}
```

Three rules that go with the tokens and are not expressible as values:

1. **Fade on plain `ease`, transform on `--ease-out`, same duration, `animation-fill-mode: both`.**
   The fade arrives perceptually a touch earlier than the settle, which is why the reference site's
   reveals read as *materialising* rather than *sliding in* (§4.3).
2. **Borders that change on state are `box-shadow: inset 0 0 0 1px`, never `border`.** No reflow,
   and it composites (§11.11).
3. **Never animate `width`, `height`, `top`, `left`, `margin`, `box-shadow`, or `filter`.**
   `MOBILE_SPEC.md` §8.2. The single argued exception is §4.5's progress fill.

`linear()` easing is supported (92.0%) but earns no place here: every curve in the system is a
cubic-bezier, and `linear()` exists for approximating springs — which this product does not use.

---

## 6. The `prefers-reduced-motion` strategy

Three layers. The first already exists; the second and third do not, and **the second closes a real
bug in what is shipped today.**

### 6.1 Keep the global damper (already in `src/index.css`)

The existing block sets `animation-duration: 0.01ms !important` and
`transition-duration: 0.01ms !important` on `*`. Keep it — 0.01 ms rather than 0 so any
`animationend` / `transitionend` handler still fires, which is the correct pattern and the one the
reference site uses.

### 6.2 Zero the motion tokens — this is not optional

**The global damper alone is not sufficient, and the gap is user-visible.**

`animation-delay` is a different property from `animation-duration`. The blanket rule zeroes
duration and leaves delay untouched. So with reduced motion on **today**, a nine-card deal would
still hold `--stagger-deal: 60ms` per card and the hand would pop in one card at a time across
480 ms — a staccato flicker, arguably worse than the animation it replaced.

Zeroing the tokens fixes it at the source, in one block, without hunting down rules:

```css
@media (prefers-reduced-motion: reduce) {
  :root {
    /* distances → 0: nothing travels */
    --rise-chip: 0px; --rise-caption: 0px; --rise-card: 0px; --rise-panel: 0px;
    --rise-scene: 0px; --rise-block: 0px; --rise-line: 0%;
    /* scales → 1: nothing swells or squashes */
    --scene-scale: 1; --press-scale: 1; --shrink: 1;
    --lift: 0px; --nudge: 0px;
    /* stagger → 0: THE ONE THE GLOBAL DAMPER MISSES */
    --stagger-deal: 0ms; --stagger-line: 0ms; --stagger-claim: 0ms;
  }
}
```

Note `--dim: .6` is **not** zeroed. It is not motion — it is the active-seat signal, and removing it
would remove information. Reduced motion means less movement, not less meaning
(`MOBILE_SPEC.md` §8.1.5).

### 6.3 Skip View Transitions in JavaScript, not in CSS

**View Transitions do not respect `prefers-reduced-motion` automatically** — MDN is explicit that
the author must handle it. Worse, the `*` selector in §6.1 **does not reach the
`::view-transition-*` pseudo-element tree**, so the existing damper has no effect on them at all.

A CSS rule on the pseudo-elements would work visually but still performs the full snapshot-and-
composite. MDN's recommended approach is to skip the transition entirely:

```js
const reduce = matchMedia('(prefers-reduced-motion: reduce)')

export function withTransition(update) {
  if (reduce.matches || !document.startViewTransition) return update()
  return document.startViewTransition(update).finished.catch(() => {})
}
```

That is the whole shim — **172 bytes raw, 79 bytes gzipped.** It doubles as the feature detection
for the ~10% of browsers without the API, so there is exactly one branch to reason about. Belt and
braces, add the CSS guard too (it costs ~90 bytes):

```css
@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(*),
  ::view-transition-old(*),
  ::view-transition-new(*) { animation: none !important; }
}
```

### 6.4 Where it has to be wired

`withTransition` wraps the `setState` calls in `next()` and `back()` in
`src/tutorial/useTutorial.ts` — a file `CODEX_HANDOFF.md` §3 places off limits. **This needs an
owner decision, and it is the only code change the recommendation requires.** It is roughly four
lines and changes no game logic, no state shape, and no test.

If the owner declines, everything in §4 still works except the two View Transition items — card
exits and text-value swaps — which degrade to instant changes. The guide remains complete and
correct; it just loses the two most satisfying moments.

### 6.5 The acceptance criteria this must satisfy

`MOBILE_SPEC.md` §11 items **42, 43, 44** and `CODEX_HANDOFF.md` §4.5. Specifically: with Reduce
Motion on, sheets appear instantly, no card-deal animation, no pulse on the active seat, all 19
steps and 4 checkpoints still completable, every state change still perceivable, and **zero
scripted animation frames after 3 s idle**. Dropping the ambient pulse (§4.6) is what makes 44 pass
by construction rather than by luck.

---

## 7. To the project owner — plainly

You asked for Three.js so the interactivity would be as smooth as possible, and you asked me to
look for something better and then make the call. Here is the honest version.

### 7.1 The site you want this to feel like does not use Three.js

I checked this myself rather than taking the earlier report's word for it. pleurat.com has **no
`<canvas>` element, and its shipped JavaScript calls `getContext` zero times across 458,925
characters.** It cannot be drawing anything in WebGL, because it never opens a drawing surface.

The look you like — the depth, the sense that things are made rather than assembled — comes from
**86 CSS keyframe animations, sticky positioning, and a very disciplined set of design tokens.**
There is not even any CSS 3D on it: zero `perspective`, zero `preserve-3d`, zero `rotate3d`.

So Three.js would not be *matching* the reference. It would be a different, heavier approach to a
result the reference achieves another way.

### 7.2 What Three.js actually costs, measured

I installed Three.js and built a real minimal card-table scene with this project's own build
tooling, rather than quoting a number from a website.

- A scene with a renderer, a camera, and **one** untextured rectangle: **126,388 bytes gzipped.**
- The same scene grown to a felt table and nine textured cards: **127,447 bytes gzipped.**

Look at those two numbers together, because that comparison is the whole argument. **Everything you
would actually build costs about a kilobyte. The entry ticket costs 126.** Tree-shaking does not
help, because the WebGL renderer drags in the shader library whether you use it or not. There is no
smaller official build.

Your first-load budget is 98 KB with a 120 KB hard stop. The app already uses 74.6 KB, leaving
23.4 KB. **Three.js alone is more than five times what is left, and on its own it is larger than the
hard ceiling.** There is no way to fit it — not by trimming CSS, not by dropping a font, not by
lazy-loading.

### 7.3 The argument that would still stand if Three.js were free

This is the part I would want to hear if I were you, because it is not about bytes.

`MOBILE_SPEC.md` §7.4 requires that **every card rank, every suit glyph, and every seat label is
live DOM text** — no raster images, no text baked into any image. Acceptance criterion 40 tests it
by disabling images; criterion 41 requires ranks and suits to be selectable as text; criterion 57
requires "10" to fit a 28 px chip without clipping at 200% text zoom; criterion 58 requires the two
jokers to be distinguishable in greyscale at 28 px.

**A WebGL canvas is an image.** Text drawn into it is not selectable, does not scale with the phone's
OS text-size setting, does not reflow at 200% zoom, cannot be translated, and is invisible to a
screen reader. Rendering the cards in Three.js would fail §7.4, §7.3, §7.6, and four numbered
acceptance criteria simultaneously — and it would do so on the exact users who most need the guide
to work: someone with low vision, at a dim table, holding the phone at arm's length.

That constraint is not a technicality. It is the reason the product renders cards as text in the
first place.

### 7.4 The hybrid — I took it seriously, and the answer is no

The idea is reasonable: CSS for everything structural, plus a small WebGL layer for one or two
moments of spectacle, lazily loaded so it never blocks first paint, skipped on reduced motion and
low-end phones. I looked for a way to make it work. Three things kill it, independently.

1. **The spec forbids the lazy load.** `MOBILE_SPEC.md` §9.2 requires **zero network requests after
   first load** — every step, all card data, and the cheat sheet ship in the initial bundle. A
   lazily-fetched WebGL chunk is exactly the thing that rule prohibits. So the layer must either be
   in the first load (impossible, §7.2) or violate §9.2. There is no third option.
2. **The low-end gate cannot be built.** I checked all four candidate signals:
   - `navigator.deviceMemory` — **76.4%, and absent from Safari on iOS entirely.** Apple and
     Mozilla have both declined it on fingerprinting grounds.
   - `navigator.connection.saveData` — Chromium-only; Safari never implemented it.
   - `navigator.hardwareConcurrency` — works on iOS 15.4+, but **Safari deliberately clamps the
     reported value to 4 or 8** to limit fingerprinting, so it cannot distinguish a new iPhone from
     a five-year-old one.
   - `@media (update: slow)` — the one well-supported option (92.2%, iOS Safari 17+), **but it
     measures the wrong thing.** It reports whether the *display* can repaint quickly; it is
     designed to catch e-ink. Every phone in this product's audience, cheap or not, reports `fast`.

   So there are three signals that do not work on iPhones and one that works everywhere and tells
   you nothing useful. A safety valve you cannot build is not a safety valve.
3. **There is no moment that deserves it.** I went looking for one honestly:
   - *An ambient felt or light effect.* Already solved by a repeating gradient at zero bytes
     (`DESIGN_INSPIRATION.md` §11.10), and §8.2 forbids the idle loop it would need.
   - *A celebratory finish after the last step.* This is the closest candidate and the one I would
     have argued for. But it lands at minute ten, when the learner's job is to put the phone down
     and pick up cards. Spending the entire performance budget on the moment the product's work is
     already finished is the wrong trade — and 126 KB over congested venue wifi at 1.6 Mbps is
     roughly 0.6 s of download plus 100–400 ms of shader compilation on a mid-range Android, for a
     flourish nobody is waiting for.

**So: no, the complexity is not worth it here.** Not "probably not" — there is no version of it that
satisfies the specifications you have already signed off.

### 7.5 What you give up

I want to be straight about this rather than pretending the trade is free.

You genuinely lose:

- **True volumetric cards** — real perspective, real thickness, per-card lighting that responds as
  the card turns.
- **Physics** — cards that tumble and settle differently every time. (Costed for completeness:
  `cannon-es` is 34.5 KB gzipped on top of Three.js; `rapier3d` is 26.6 KB of glue plus a
  **767 KB gzipped WebAssembly payload**.)
- **Post-processing** — bloom, depth of field, film grain, chromatic aberration.
- **Scale** — hundreds of simultaneously animating objects. CSS starts to strain in the low
  hundreds; WebGL does not.

Now the honest counterweight: **this product does not want the first two.** A teaching tool needs
the same layout every time, or the learner cannot compare step 8 to step 12. `DESIGN_INSPIRATION.md`
§12.1 makes this point well — non-deterministic settle positions actively hurt a tutorial. And
"scale" here means six seat tokens, nine cards, and nine chips: **544 DOM nodes total**, against the
reference site's 2,656. The compositor will not notice.

What you can still have, at no cost: a **real card flip with perspective and a thickness illusion**,
using `perspective` + `transform-style: preserve-3d` + `rotate3d`. That is universally supported
CSS, it is compositor-only, and it is the one piece of "3D" a card game actually wants. The
reference site does not even use it — so you would be going further than your own benchmark.

### 7.6 What you gain

- **126 KB back.** That is not an abstraction: it is the entire visual design system, plus a
  subset webfont if you decide you want one, plus roughly 20 KB still spare.
- **Roughly half the first-load time** on the connection this product is actually used on.
- **Every rank and suit stays selectable, zoomable, translatable, screen-readable, and printable** —
  which is what makes the cheat sheet work and the greyscale test pass.
- **No shader compilation stall** in the first three seconds, which is the most fragile moment in
  the entire session.
- **No idle GPU loop** eating battery for ten minutes at a table.
- **The designer can do all of it in the `.module.css` files** that `CODEX_HANDOFF.md` §2 already
  hands them, without touching a single `.tsx` — with the one four-line exception in §6.4.

### 7.7 The one thing I want to flag as a real cost, not a rounding error

My recommendation leans on the View Transitions API for two effects: animating a card *out* of the
hand, and morphing a number that changed. **90.2% of browsers support it** (Safari 18+, Chrome 111+,
Firefox 144+). The other ~10% get instant changes instead — correct, complete, slightly less
delightful.

I considered paying 3.2 KB for `motion/mini` to close that gap and concluded it does not: a library
still cannot animate a DOM node React has already unmounted without keeping it mounted, which means
`.tsx` changes either way. The platform does it better, for 79 bytes.

If it turns out to matter, the fallback is not a library — it is to accept the instant swap, which
is exactly what the reference site does, since it has no exit animations either.

---

## 8. Summary of decisions

| Question | Verdict |
|---|---|
| Three.js? | **No.** 126.4 KB gzip floor; exceeds the hard ceiling alone; fails §7.4 regardless of size |
| Lighter WebGL (`ogl` / `twgl` / `regl`)? | **No.** Cheaper (6.7–39.4 KB) but inherits every non-byte objection |
| JS animation library? | **No.** Cheapest credible option is 3.2 KB for capability the platform now ships free |
| CSS-only 3D? | **Yes, for card flips only.** Universally supported. Everything else is 2D |
| Web Animations API? | **No.** Nothing here needs imperative control; the reference site uses it zero times |
| View Transitions API? | **Yes.** 90.2%, progressive, 79 bytes, and the only zero-cost fix for exit animation |
| Scroll-driven animations? | **No.** The shell never scrolls as a document (`MOBILE_SPEC.md` §2.3) |
| `@starting-style` / `allow-discrete`? | **Yes.** 90.7%, Safari 17.4+. Use for sheets |
| `interpolate-size`? | **No.** Chrome/Edge only. Use `grid-template-rows: 0fr → 1fr` |
| `sibling-index()`? | **Not yet.** Baseline as of 2026-08-18, but only 79.6%. Use `:nth-child()` |
| Hybrid lazy WebGL layer? | **No.** Prohibited by §9.2; the device gate is unbuildable on iOS |
| Ambient/looping animation? | **No.** §8.2 forbids it; acceptance criterion 44 tests for it |
| **Total cost** | **1,639 B gzip / 1,399 B brotli** |

### Open items needing an owner decision

1. **§6.4 — four lines in `src/tutorial/useTutorial.ts`** to wrap `next()`/`back()` in
   `withTransition`. Off-limits file. Without it, card exits and number morphs degrade to instant.
2. **§4.5 — one line in `src/components/StepNav.tsx`** to expose progress as `--fill` instead of
   `inlineSize`, so the progress bar animates on the compositor rather than needing a documented
   exception to `MOBILE_SPEC.md` §8.2.
3. **§4.6 — drop the ambient "thinking" pulse.** My recommendation is yes, drop it; §8.2 and
   acceptance criterion 44 both point the same way. Confirm you are happy losing it.
