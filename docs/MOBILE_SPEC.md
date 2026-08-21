# MOBILE INTERFACE SPECIFICATION

**Project:** Fish-Onboarding — a 10-minute interactive guide to Literature (Canadian Fish)
**Scope:** Mobile (portrait phone) interface contract. Desktop is specified separately.
**Status:** Normative. "Must" is a requirement; "should" is a strong default that needs a written reason to break.
**Owner boundary:** This document specifies *structure, behaviour, budgets, and semantics*. It does not specify visual design. Colour, type scale, shape language, texture, and all CSS are owned by Codex. Where this document names a CSS custom property, it is naming a **slot the designer must fill**, not a value.

---

## 0. The one-paragraph version

A learner scans a printed QR code at a club table and lands directly on step 1 of 19 — no start screen, no interstitial. The app is a fixed five-zone shell sized to `100svh` that never scrolls as a whole: header rail, table, annotation, hand strip, nav bar. Interactive checkpoints open in a bottom sheet at 88svh. There is exactly **one** mobile layout across all phone widths (width changes sizes, never structure) plus exactly **one** fallback mode (`compact scroll`) that handles landscape, tiny screens, and 200% text zoom with the same code. First load is ≤ 98 KB compressed and needs no network afterwards. No service worker. Progress lives in `localStorage` and in the URL.

### 0.1 Terminology rule (binding on all UI copy)

Always **"half-suit"**. Never "book". This applies to every string in the interface, every `aria-label`, every checkpoint prompt, the score board header, and the cheat sheet. Exactly one exception is permitted: a single glossary line in the cheat sheet may note that "book" is a common synonym elsewhere.

Never abbreviate "half-suit" to "HS", "h-suit", or similar in user-facing copy, including at 320px. Where the label does not fit, wrap it — a line break after the hyphen is acceptable and layouts must reserve two lines of height for it (see §4.6).

### 0.2 The game this specifies (pinned variant)

**`RULES.md` is the single source of truth for rules.** Where this document and `RULES.md` disagree about the game, `RULES.md` wins and this document is the bug. The facts below are restated only because they are load-bearing for the measurements here.

- 54 cards: standard 52 + 2 jokers. Ranks are `2 3 4 5 6 7 8 9 T J Q K A`; **`T` renders to the learner as "10"** — two glyphs, the widest rank, and the one every card-sizing number in §4.5 must accommodate.
- **9 half-suits of 6 cards** (`LOW-C`…`HIGH-S`, plus `EIGHTS`). Per suit LOW = 2–7 and HIGH = 9–A. The 9th half-suit is the four 8s plus both jokers.
- 6 players, 2 teams of 3, seated alternating (seats 0/2/4 vs 1/3/5), 9 cards each.
- A claim assigns each of a half-suit's 6 cards to a specific seat **on the claimer's own team** — **3 possible holders: the learner plus two teammates** (engine guard: `ASSIGN_OPPONENT`). Every count in §5 derives from that 6×3 shape.
- **A claim has three outcomes, not two** (`RULES.md` rows 13–15): your team scores; the *opposing* team scores because an opponent held at least one of the six; or the half-suit is **void** and nobody scores. §5.5 specifies the UI for all three.
- **Players go out.** A seat that reaches 0 cards drops out and can neither ask nor be asked (`RULES.md` row 19). Seat tokens therefore need an "out" state (§4.4).
- **A learner may claim a half-suit while holding none of its cards** (`RULES.md` row 16). The claim UI must not assume the six cards come from the hand (§5.5).

---

## 1. QR entry flow

### 1.1 What the QR encodes

The printed QR encodes **the bare HTTPS origin with a trailing slash and nothing else**:

```
https://<host>/
```

Requirements:

1. **No path.** Do not encode a deep link to a step. A physical code outlives any step numbering, and a learner who scans mid-guide should start at the beginning.
2. **No query string, no UTM, no tracking parameters, no fragment.**
3. **Target URL length ≤ 25 characters.** Every character raises the QR version and module count, and module density is the dominant factor in scan latency on old cameras in dim venue lighting. A 25-character URL fits QR version 2 (25×25 modules) at error-correction level M; a 60-character URL needs version 4 (33×33) and scans measurably slower on a 5-year-old phone across a table. Procure a short apex domain and serve the app at its root.
4. **Error correction level M (15%).** L is too fragile for a card that will live on a table with drinks on it; Q and H inflate module count for no benefit at this size.
5. **Printed at ≥ 30mm × 30mm with a ≥ 4-module quiet zone**, on matte stock (gloss produces specular glare under overhead venue lighting).
6. The human-readable URL must be printed beneath the code at ≥ 10pt so it can be typed when a camera fails.

### 1.2 The landing moment

**Drop straight into step 1. No start screen, no splash, no cookie banner, no "tap to begin".**

Rationale: the learner already committed by scanning. A start screen spends a tap and roughly a second on the dominant path to deliver information that step 1 must carry anyway. Step 1 is therefore written to double as the welcome — it must establish "you are one of six players at a table" in its first sentence without assuming a prior screen.

There is no cookie banner because there are no cookies and no analytics on the critical path (§9.2).

### 1.3 Resume behaviour

On load, read `localStorage` progress (§9.4) and branch:

| Condition | Behaviour |
|---|---|
| No saved progress | Render step 1. |
| Saved progress, `updatedAt` **< 2 hours** old, and saved step **≥ 4** | Restore to the saved step. Show a dismissible bar above the nav: "Picked up at step 12. **Start over**" — auto-dismiss after 8s, or on any nav tap. |
| Saved progress, `updatedAt` **< 2 hours** old, saved step **1–3** | Render step 1 silently. Restoring to step 2 saves nothing and confuses. |
| Saved progress **≥ 2 hours** old | Render step 1. Do not offer to resume; a returning learner on a different day wants the beginning. Retain the record for the checkpoint answers only. |
| Saved progress fails to parse, or `schemaVersion` mismatch | Discard silently, render step 1. Never show a storage error to a learner. |

The resume bar must be **non-blocking and non-modal**. Never show a "Resume? / Start over?" dialog — it is a decision the learner has no context to make in under a second, at a table, with people waiting.

### 1.4 URL and history contract

- The current step is reflected in the path: `/step/1` … `/step/26`, plus `/cheatsheet`. `vercel.json` already rewrites all paths to `index.html`, so this works with no server change.
- Advancing a step **pushes** a history entry. The Android hardware back button and the iOS Safari back gesture therefore mean "previous step", which is what every user expects. On step 1, back exits the site — correct and expected.
- Opening a bottom sheet also pushes a history entry, so back closes the sheet rather than jumping a step (§6.6). Closing the sheet by button calls `history.back()` so the two paths cannot desynchronise.
- Deep-linking to `/step/N` must work (shared links, bookmarks) and must not be blocked by missing prior-step state — every step must be renderable from its own scripted state.

### 1.5 Cold cache on bad wifi

Assume a congested venue: **1.6 Mbps down, 300ms RTT, mid-tier Android (~4× CPU slowdown vs. a current flagship)**. All budgets below are against that profile.

Requirements:

1. **`index.html` must be meaningful on its own.** With zero JS and zero external CSS, the served document must paint a readable title, one orienting sentence, and a "Loading the guide…" line. Critical CSS is inlined in `<head>`. No spinner-only screen; a spinner on a congested network is indistinguishable from a broken page.
2. **Inline critical CSS must be ≤ 14 KB compressed**, so the initial paint fits inside the TCP initial congestion window (10 segments ≈ 14.6 KB) and arrives in one round trip.
3. **No render-blocking external stylesheet.** The non-critical stylesheet loads asynchronously.
4. **No web fonts.** System font stack only, mandatory. A font fetch on congested wifi buys a typeface at the cost of either invisible text (FOIT) or a reflow (FOUT) during the most fragile second of the session. This is not negotiable for v1.
5. **Preload the JS entry** from the document head.
6. **Slow-load escape hatch:** if the JS entry has not executed within **8 seconds**, the shell must replace "Loading the guide…" with "Still loading — the venue wifi may be slow." plus a **Retry** button (≥ 44×44px) that reloads. This is objectively testable by throttling.
7. **The shell's first paint must not shift.** The shell's heading occupies the same box the real step heading will occupy, so hydration causes no layout shift (§1.7, CLS).

### 1.6 Byte budget (first load)

Compressed transfer size (Brotli, falling back to gzip). These are **ceilings, not targets**.

| Asset | Budget (compressed) |
|---|---|
| `index.html` incl. inline critical CSS + shell markup | 6 KB |
| JS — React 19 + ReactDOM | 45 KB |
| JS — application (19 steps of content, game logic, components) | 35 KB |
| CSS — non-critical, async | 12 KB |
| Web fonts | **0 KB** (mandatory) |
| Raster images | **0 KB** (mandatory — see §7.4) |
| **Critical-path total** | **≤ 98 KB** |
| **Hard ceiling before the budget is escalated to the owner** | **120 KB** |

Supporting limits:

- **Uncompressed JS ≤ 350 KB.** Parse/compile on mid-tier Android runs roughly 1 ms/KB; 350 KB keeps main-thread parse under ~400ms.
- `favicon.svg` ≤ 1 KB and is off the critical path.
- Source maps are emitted (`vite.config.ts` sets `sourcemap: true`) but are **not** counted — browsers fetch them only with devtools open. Do not disable them; do verify they are not preloaded or referenced from the critical path.

> **Recommendation (needs an owner decision — see §12):** drop `react-router-dom`. It costs roughly **20 KB compressed**, which is the entire margin between the 98 KB target and the 120 KB ceiling, and this app is a single linear stepper with two routes. Reading `location.pathname` and calling `history.pushState` directly covers §1.4 completely. Keeping the router is survivable but spends the whole budget cushion on one dependency.

### 1.7 Time budget

| Metric | Budget on the §1.5 profile |
|---|---|
| Time to first byte (HTML) | ≤ 1.2 s |
| **First Contentful Paint** (shell text legible) | ≤ 1.8 s |
| **Largest Contentful Paint** | ≤ 2.5 s |
| **First meaningful paint** — step 1 heading + body + Next button rendered and tappable | ≤ 3.5 s |
| Cumulative Layout Shift, whole session | ≤ 0.05 |
| Interaction to Next Paint, any interaction, whole session | ≤ 200 ms |

CLS ≤ 0.05 is cheap to hit here because every zone in §4 has a fixed height and the hand and table have fixed slot counts. Treat any measured shift as a bug in zone sizing, not as a tolerance to spend.

---

## 2. Viewport & browser chrome

### 2.1 The viewport meta contract

Exactly this, and it is already correct in `index.html`:

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

**`user-scalable=no` and `maximum-scale` are forbidden.** Reasons, in order of weight:

1. It is a WCAG 2.1 **1.4.4 Resize Text** failure and removes the single most important accommodation a low-vision user has.
2. **QR codes very often open in an in-app webview** — the scanner app's embedded browser, a messaging app's browser — not in Safari. iOS Safari has ignored `user-scalable=no` since iOS 10, but **in-app webviews and Android browsers still honour it**. So the "modern browsers ignore it anyway" argument is exactly wrong for this product's dominant entry path.
3. Pinch-zoom on a card rank is precisely how someone reads the screen in a dim room across a table. Removing it removes the product's own fallback for §7.

Also forbidden: `touch-action: none` on the document or root, and `overscroll-behavior: none` on the root. (`overscroll-behavior: contain` **on sheets only** is required — §6.7.)

### 2.2 Viewport units: `svh`, not `dvh`, never `vh`

**The app shell is sized to `100svh`.** Expose it once as `--app-h` so there is exactly one definition site.

| Unit | Verdict | Why |
|---|---|---|
| `svh` | **Required for the shell** | Smallest viewport = browser toolbars *shown*. A layout sized to `svh` is never occluded by an expanded toolbar and never resizes when the toolbar collapses. |
| `dvh` | **Forbidden for the shell** | It tracks toolbar collapse, so the table and hand would resize under the learner's eyes mid-scroll. On a fixed-zone layout this is continuous jank, not a nicety. |
| `lvh` | **Forbidden** | Largest viewport — content is hidden under the toolbars whenever they are shown. |
| `vh` | **Forbidden** | On iOS Safari `vh` resolves to `lvh`, inheriting that bug. |

`dvh` is permitted **only** for a hypothetical full-bleed overlay that genuinely should grow into reclaimed toolbar space. Nothing in the current design qualifies. Any use requires a written exception.

**Legacy fallback:** for browsers without `svh` support, `--app-h` is set from JS using `window.innerHeight`, recomputed on `resize` and `orientationchange`, debounced **150 ms**. Gate this behind a feature query so modern browsers never run the JS path.

### 2.3 iOS Safari toolbar collapse

Because the shell is `svh`-sized and does not scroll as a document, Safari's toolbar **will not collapse** — collapse is driven by document scroll. This is the desired outcome: stable chrome, stable layout, no resize events during a lesson. The scrolling that does exist is confined to the annotation zone and to sheets, which are inner scroll containers and do not trigger toolbar collapse.

Do not attempt to force toolbar collapse (no scroll-to-1px hacks). Do not build any UI that assumes the extra `lvh − svh` space is available.

### 2.4 Safe areas, notch, home indicator

`viewport-fit=cover` is set, so the page paints edge to edge and the app is responsible for insets.

1. Background surfaces extend to the physical edges. **No content and no control may sit inside an inset region.**
2. Header rail adds `env(safe-area-inset-top)` to its padding.
3. **Nav bar adds `env(safe-area-inset-bottom)` to its padding.** On home-indicator devices this is 34px. **Nothing interactive may sit within 34px of the bottom edge** — the system's swipe-up gesture intercepts touches there, and a Next button in that band feels broken in a way the learner will blame on the app.
4. Left and right insets apply in landscape on notched devices; the compact scroll mode (§2.5) must honour them.
5. Expose insets as `--safe-t`, `--safe-r`, `--safe-b`, `--safe-l` so component authors never call `env()` ad hoc.

### 2.5 Orientation policy

**Support landscape. Never prompt to rotate. Never lock orientation.**

A rotate-to-portrait nag is a WCAG 2.1 **1.3.4 Orientation** failure, and a learner may have their phone propped, mirrored, or mounted. It is also the kind of hostile screen that makes someone put the guide down.

But do **not** author a bespoke landscape layout. Instead:

> **When usable height < 560px, OR the device is in landscape at a phone width, the shell switches to `compact scroll mode`.**

In compact scroll mode:

- The fixed five-zone shell is abandoned. The page becomes a single vertically scrolling column.
- The table collapses from the ellipse to a **compact seat strip**: one horizontal row of six seat tokens with counts, learner's seat marked first, still showing the active seat.
- The hand strip is retained unchanged.
- The nav bar remains fixed to the bottom of the viewport with safe-area padding.
- The annotation zone is unconstrained in height and flows naturally.

This single mode is the answer to landscape, to small phones, **and** to 200% text zoom (§7.6). One fallback, defined once, three problems solved. That is the reason it is defined by height rather than by orientation.

---

## 3. Responsive contract

### 3.1 The headline

**Mobile has one layout. Width changes sizes only — never structure. Height changes mode.**

Both the component author and the designer implement against that sentence. If a proposed change requires a structural fork between two phone widths, it is out of contract and needs an amendment.

### 3.2 Breakpoints

| Name | Range | Reference devices | What changes |
|---|---|---|---|
| **`xs`** | **320px – 359px** | iPhone SE 1st gen (320×568), old budget Android | Floor. Nothing may break. Horizontal page padding 12px. Hand chip 28×40px. Type at base scale. |
| **`sm`** | **360px – 413px** | iPhone SE 2/3 (375×667), iPhone 13 mini, most Android | **Primary design target: 375×650.** Horizontal padding 16px. Hand chip 32×46px. |
| **`md`** | **414px – 767px** | iPhone 15/16 (393–430), large Android | Same structure. Horizontal padding 20px. Hand chip 36×52px. One type step up on annotation body (17px → 18px). |
| **`lg`** | **≥ 768px** | Tablet / desktop | **Out of scope for this document.** Until the desktop layout takes over, the mobile shell must remain correct: cap it at `max-width: 480px`, centred. A tablet must never see a stretched phone layout. |

Orthogonal, applies at every width:

| Name | Trigger | Effect |
|---|---|---|
| **`compact-h`** | usable height **< 560px** | Compact scroll mode (§2.5). |

**320px is the hard floor.** Every acceptance criterion in §11 must pass at 320px. No horizontal page scroll is permitted at any width (§11.3).

### 3.3 How breakpoints are expressed

Define the values as custom properties for use in calculations and for documentation:

`--bp-sm: 360px`, `--bp-md: 414px`, `--bp-lg: 768px`, `--bp-compact-h: 560px`

**Caveat the designer must handle:** custom properties cannot be used inside media query conditions. The raw pixel values must therefore be duplicated in the media queries themselves. Every such duplication carries a comment pointing back to the custom property, or the values are injected at build time from a single constants module. Pick one mechanism and use it everywhere; drift between the two lists is a defect.

---

## 4. Portrait layout

### 4.1 Design frame

Primary target **375 × 650**. All heights below are CSS pixels.

The five zones fill `--app-h` exactly. **The shell itself never scrolls.** Only the annotation zone and sheets scroll internally.

### 4.2 Zone allocation

| # | Zone | Height | Behaviour |
|---|---|---|---|
| — | Safe area, top | `--safe-t` (0–59px) | Padding on the header rail |
| 1 | **Header rail** | **48px** | Fixed |
| 2 | **Table zone** | **200px** | Fixed |
| 3 | **Annotation zone** | **flex — min 116px, preferred 206px** | The only flexible zone; scrolls internally |
| 4 | **Hand strip** | **132px** | Fixed |
| 5 | **Nav bar** | **64px** + `--safe-b` | Fixed |

Fixed subtotal: **444px**.

- At 650px usable height → annotation gets **206px**.
- At 560px usable height → annotation gets its **116px minimum**. This is the tightest supported case.
- Below 560px → compact scroll mode (§2.5, §3.2).

The annotation zone absorbs every pixel of variation. No other zone flexes. This is what makes CLS ≤ 0.05 achievable and what lets the designer size the table and hand once.

### 4.3 Zone 1 — header rail (48px)

Contents, single row:

- Act label (e.g. "Act 2 · The ask"), ≤ 22 characters, ≥ 14px.
- Step counter "12/26", ≥ 14px, tabular figures.
- Score chip "Us 2 · Them 1", ≥ 14px, tabular figures — **a tap target ≥ 44×44px** that opens the score board sheet.
- A 4px progress bar occupying the rail's bottom edge, width = `step / 26`. It must also expose `role="progressbar"` with `aria-valuenow`/`aria-valuemin`/`aria-valuemax`, because a 4px bar is not perceivable to everyone.

The full 9-half-suit score board does **not** live in the rail. It is a 3×3 grid inside the score sheet (§4.7).

### 4.4 Zone 2 — table (200px)

180px for the seat ring, 20px for the log ticker at its bottom edge.

**Seat ring.** Six seats on an ellipse, `rx` ≈ 147px, `ry` ≈ 62px within the 351px × 180px content box at `sm`.

- **The learner is fixed at bottom-centre (6 o'clock).** Seats proceed clockwise. This never changes across steps — the learner's spatial anchor is the one thing that must be stable.
- Seat token ≥ 56 × 56px.
- Seat token contains: short name (≥ 13px), card count (≥ 14px, tabular figures, single digit — 0 to 9), and a team marker.
- **Out state.** A seat at 0 cards is out of the hand (`RULES.md` row 19) and can neither ask nor be asked. Its token must be visibly and *textually* distinguished — reduced emphasis plus the word "out", with the accessible name gaining " — out". Dimming alone is not sufficient: a dimmed token at arm's length in a lit room reads as a rendering artefact, and "why can't I ask Sam?" is exactly the question the guide exists to pre-empt. Out seats remain in the ring at their original position; seats never reflow, because the ring is the learner's spatial anchor.
- **Team identity must not be colour alone.** Team is carried by token *shape* (e.g. two distinct silhouettes) plus a text marker, with colour as reinforcement only. The alternating seating is a rule the guide is actively teaching, so the layout must make "my team, their team, my team…" visually obvious going around the ring — that is a layout requirement, not decoration.
- **The active seat must not be marked by colour alone.** Required: a ≥ 3px ring at ≥ 3:1 contrast against its adjacent surface, **plus** a directional caret, **plus** the seat's accessible name gaining " — active".
- Turn changes must be announced to assistive tech via a polite live region.

**Log ticker (20px).** One line, the most recent event only, ≥ 13px, e.g. "Priya asked Sam for ♦Q — miss". The whole ticker is a tap target ≥ 44px tall (it may overlap the seat ring's dead space to reach 44px, but its text box is 20px) that opens the full log sheet. New entries must not animate in when reduced motion is set (§8).

### 4.5 Zone 4 — hand strip (132px)

This is the hardest fixed-height problem in the layout. The resolution:

> **All 9 cards are always visible in a single non-scrolling row, grouped by half-suit. The strip is display-only; it is a single tap target that opens the full-size hand sheet.**

Internal allocation: 20px label row ("Your hand · 9 cards"), 88px card row, 24px padding.

**Why not the alternatives:**

- **Fan / overlapping arc.** Overlapped ranks are unreadable at arm's length and the hit targets overlap, which is disqualifying anywhere the learner must pick a specific card.
- **Horizontal scroll strip.** Hides part of the hand. The learner cannot reason about a legal ask without seeing their whole hand, and reasoning about the hand *is the lesson*. It would also collide with any swipe navigation (§6.4).
- **Two-row grid.** 9 cards over 2 rows at a readable card size needs ~190px of height. The zone has 132px. It does not fit without stealing from the annotation zone, which is the zone that carries the teaching.

**Sizing, verified against the floor:**

| Band | Available width | Chip | Within-group gap | Between-group gap | Worst case (9 groups) |
|---|---|---|---|---|---|
| `xs` (320px) | 296px | 28 × 40px | 2px | 4px | 9×28 + 8×4 = **284px** ✓ |
| `sm` (375px) | 351px | 32 × 46px | 2px | 6px | 9×32 + 8×6 = **336px** ✓ |
| `md` (414px) | 390px | 36 × 52px | 2px | 6px | 9×36 + 8×6 = **372px** ✓ |

The worst case is a hand holding one card in each of nine different half-suits — the maximum number of group gaps. The row must fit that case with no scroll. Verify against it, not against a convenient hand.

**Chip contents:** rank glyph ≥ 16px above suit glyph (≥ 14px at `sm`/`md`, ≥ 12px at `xs`). Chips are rendered as live text, never images (§7.4).

**Two chip contents need explicit handling:**

- **"10"** (engine rank `T`) is two glyphs and sets the width floor. At `xs` the chip is 28px wide; "10" at 16px in a condensed or tabular face must fit inside it with ≥ 2px side bearing. The designer must verify "10" specifically — not "8" — when choosing the rank face. Do **not** solve this by rendering `T`; learners read "10".
- **The two jokers** have no rank and no suit glyph. They need their own chip treatment carrying a joker mark plus a text distinction (§7.3.7). They must remain distinguishable from each other at 28px.

**Why display-only:** at 28–36px wide, a chip cannot be an independent tap target without violating the 44px minimum, and faking it with overlapping invisible hit areas creates mis-taps. So chips are not independent targets at all. Per-card selection happens exclusively inside sheets, where there is room for real 44px targets (§5). The strip as a whole is one full-width target ≥ 44px tall that opens the hand sheet, where ranks render at ≥ 20px.

**Teaching highlight:** the cards belonging to the half-suit currently under discussion must be visually distinguished in the strip by a non-colour-only treatment (outline plus elevation change), and their accessible names must carry the distinction too.

### 4.6 Zone 5 — nav bar (64px + safe area)

- **Next** — primary, right-aligned, ≥ 44px tall, ≥ 120px wide, inside the thumb zone (§6.2).
- **Back** — secondary, left-aligned, ≥ 44×44px.
- ≥ 8px between them.
- On checkpoint steps, Next is replaced by **"Answer this"** (full-width, ≥ 44px) which opens the checkpoint sheet. Next reappears once the checkpoint is answered.
- Nothing within `--safe-b` of the physical bottom edge.

### 4.7 Demoted-to-sheet elements

Five persistent panels do not fit in 650px. Two are demoted to a summary-plus-sheet pattern:

| Element | Always-visible summary | Sheet |
|---|---|---|
| Public log | 1-line ticker in zone 2 | Full reverse-chronological log, newest first, each entry ≥ 14px |
| Score board | "Us 2 · Them 1" chip in zone 1 | 3×3 grid of the 9 half-suits |

**Score board sheet:** the 9 cells are a 3×3 grid — this is exactly why 9 half-suits is a friendlier number than 8 on a phone. Cell label = suit glyph + "Low" / "High"; the ninth cell is labelled **"8s + Jokers"**. Rank range ("2–7", "9–A") on a secondary line where height allows. Each cell's state (unclaimed / won by us / won by them) must be conveyed by label and shape, not colour alone. Reserve two lines of height for the "Half-suits won" heading at `xs` (§0.1).

### 4.8 Content constraints derived from this layout

These are binding on whoever writes the 19 steps of copy. They are consequences of the zone heights, not style preferences.

| Content | Limit | Derivation |
|---|---|---|
| Seat display names | **≤ 7 characters** | Must fit an 81px segment at ≥ 14px in the claim sheet at 320px (§5.4) |
| Act titles | **≤ 22 characters** | Header rail, sharing 48px with the counter and score chip |
| Step annotation body | **≤ 180 characters** | 206px preferred zone height, minus 24px heading, 44px button, 16px padding = 122px of text; at 17px/1.5 line-height that is ~4.8 lines; at 375px width, ~41 characters per line |
| Log entry | **≤ 48 characters** | One 13px line in a 351px ticker |
| Score cell label | **≤ 11 characters** | 3×3 grid cell at 320px |

Longer annotation text is permitted — the zone scrolls — but **the first 180 characters must carry the point of the step on their own.** A learner at a table will not scroll to find the thesis.

---

## 5. The claim checkpoint on a phone

The hardest screen in the product: assign each of a half-suit's **6 cards** to one of **3 seats** (the learner plus two teammates).

### 5.1 Recommendation

> **Use a per-card segmented control: six rows in a bottom sheet, each row a card chip plus a 3-option segmented radio group. All six assignments are visible simultaneously.**

### 5.2 Why

1. **A claim is a simultaneous constraint, not a sequence.** The learner is reasoning across all six cards at once — "if Priya has the Jack, then Sam must have the Queen". Any pattern that shows one card at a time destroys the exact cognitive work the checkpoint exists to teach. This is the decisive argument, and it eliminates the stepper outright.
2. **No modal state.** There is never a "which card is selected right now?" question. In a social setting with divided attention, invisible mode state is the most reliable source of error.
3. **Minimum interaction cost:** 6 taps, one per row. Revision is 1 tap on a different segment — no undo, no drag-back, no back-navigation.
4. **Native semantics for free.** Each row is a `radiogroup` with an accessible name of the card; screen reader, keyboard, and switch-control support come from the platform rather than from bespoke code.
5. **It fits.** Verified in §5.4 — the whole thing renders without scrolling at 375×650.

### 5.3 Why not the others

**Tap-card-then-tap-seat — rejected.** Introduces exactly the modal state that (2) above avoids. Worse, the natural drop targets are the seat tokens on the table diagram, which are 56px and clustered on an ellipse; a mis-tap assigns a card to the wrong seat with no obvious feedback. Requires up to 12 taps. Error recovery ("how do I un-assign?") has no natural gesture.

**Bottom-sheet stepper, one card at a time — rejected.** Kills cross-card reasoning (argument 1). Revising card 2 after seeing card 6 costs four back-taps. Six sequential screens feels long at the emotional peak of the guide, where the learner should feel the claim snap into place. It optimises for screen real estate, which §5.4 proves is not actually scarce.

**Drag-and-drop — rejected, and specifically:**

- HTML5 drag-and-drop **does not fire for touch input on mobile Safari**. It would have to be rebuilt on pointer events.
- Drag must be disambiguated from scroll. The standard fix is a long-press delay of 250ms+ before the drag engages, which adds latency to every single assignment and is undiscoverable.
- It conflicts with the sheet's own scroll container and with the page beneath.
- With 44px drag handles on a 375px screen, three drop zones are ~100px each — reachable, but a drag traverses most of the screen, which **fails one-handed thumb use** (§6.2). Six such drags is genuinely tiring.
- It is inaccessible to screen readers and switch control without a complete keyboard-operable alternative — and that alternative *is* the segmented control. So the team would build the recommended pattern anyway, plus a fragile gesture layer on top.

Verdict: drag-and-drop is the most expensive option to build, the least accessible, the worst for one-handed use, and it requires implementing the recommended option as its own fallback. **Do not build it.**

### 5.4 Layout, verified

Sheet at **88svh** = 572px at the 650px design frame.

| Element | Height |
|---|---|
| Compact table strip, pinned at sheet top | 64px |
| Title ("Claim ♠ High — who holds each card?") | 40px |
| Assignment counter ("3 of 6 assigned") | 24px |
| 6 rows × 48px | 288px |
| Submit button | 56px |
| Padding | 24px |
| **Total** | **496px** ✓ fits in 572px with no scroll |

At the tightest supported height (560px usable → 493px sheet), it scrolls by 3px. Acceptable.

**Row width, verified at the floor:**

| Band | Content width | Card chip | Gap | Per segment |
|---|---|---|---|---|
| `sm` (375px) | 351px | 44px | 8px | (351−52)/3 = **99px** ✓ |
| `xs` (320px) | 296px | 44px | 8px | (296−52)/3 = **81px** ✓ |

Every segment clears 44px width and 44px height at every supported size. This is why seat names are capped at 7 characters (§4.8) — an 81px segment at ≥ 14px will not hold more.

### 5.5 Behaviour

1. The compact table strip stays pinned at the top of the sheet — checkpoints 1 and 2 require reading the table and log while answering, and the claim requires knowing who sits where.
2. Live assignment counter, "N of 6 assigned", in a polite live region.
3. **Submit is disabled until all 6 are assigned**, and the disabled state must state why in visible text ("Assign all 6 cards to continue") — never a bare greyed button. The button must remain focusable while disabled so assistive tech can reach the explanation (`aria-disabled`, not the `disabled` attribute).
4. **On submit, the true holder of all six cards is revealed** (the engine returns `actualHolders` and `RULES.md` makes the reveal unconditional). Each row shows the learner's assignment against the truth, marked with a glyph and text, never colour alone. The reveal is the teaching payload of the whole checkpoint — it must be the most prominent thing on screen after submit, not a footnote under the button.
5. **Three outcomes must be distinguishable, not two.** `RULES.md` rows 13–15 give: *your team scores*; *the opposing team scores* because an opponent held at least one of the six; *void* — your team held all six but a location was wrong, so nobody scores. A binary right/wrong treatment is a spec violation. Each outcome gets its own heading, its own glyph, and one sentence naming the rule that produced it. The void case in particular is counter-intuitive and is the reason this checkpoint exists.
6. **A wrong claim is never a dead end.** The learner may revise and resubmit without limit. On the second incorrect attempt, reveal a hint naming one card's holder. There is no scoring here; the objective is comprehension.
7. Options are the **three seats on the learner's own team, including the learner**. Label the learner's own option "You". Opponent seats must not appear as options — offering an illegal choice teaches the wrong rule, and the engine rejects it as `ASSIGN_OPPONENT`.
8. **The six cards are the half-suit's six cards, not the learner's hand.** A learner may claim a half-suit while holding none of it (`RULES.md` row 16). Rows are generated from the half-suit definition. Cards the learner happens to hold may be marked as such, but holding a card must never be a precondition for it appearing as a row.
9. Each row's radio group is named by the card ("Queen of Spades", "Red joker"), each option by the seat name. Do not rely on visual row adjacency to convey the pairing.
10. After any claim the claimant's turn continues (`RULES.md` row 17). The UI must not imply the turn passed.

### 5.6 The other three checkpoints

All four checkpoints use **the same bottom sheet mechanism** at 88svh, opened by the "Answer this" button in the nav bar. One mechanism, one set of behaviours, one thing to learn.

- **"Which of these asks is legal?"** — single-select list, one row per candidate ask, each row ≥ 44px, full-width. On an incorrect pick, the feedback must name the **specific** rule broken, mapped to the engine's own error codes so copy and engine cannot drift: asked a teammate (`TARGET_TEAMMATE`), holds no card of that half-suit (`NO_CARD_OF_HALF_SUIT`), already holds the card (`ASKING_OWN_CARD`), target has no cards (`TARGET_OUT`). These are four of `RULES.md` §3's "four gates a beginner must internalise" — the candidate asks should cover them rather than repeating one.
- **Reasoning question** — same list pattern. Feedback explains the inference from public information, referencing specific log entries by their position in the log so the learner can open the log sheet and re-read them.
- **Endgame / scoring decision** — same list pattern. Note this checkpoint sits on `RULES.md` rows 21–23, where one team is out of cards and the other must claim every remaining half-suit.

**Seat-picker interactions (`pass` and `designate`).** Two distinct choices that look alike and must not be conflated in copy or in code:

| Action | Trigger | Legal targets |
|---|---|---|
| `pass{to}` | The learner's own claim used up their last cards (`RULES.md` row 20, phase `awaitPass`) | A **teammate** who still has cards |
| `designate{to}` | The learner's whole team is out while opponents still hold cards (`RULES.md` §5, phase `awaitDesignate`) | An **opponent** who still has cards |

Both use a **list of seat rows, not the table diagram** — the same full-width ≥ 44px row pattern as the other checkpoints. Do not make the learner tap a 56px seat token on the ellipse: the targets are small, clustered, and the choice set is at most two.

Seats with no cards are **excluded from the list entirely** rather than shown disabled, since they are not legal choices (`PASS_TARGET_OUT`, `DESIGNATE_TARGET_INVALID`). Each list must state in one line *why* the learner is choosing — "You're out of cards. Who on your team plays on?" versus "Your team is out. Who claims the rest?" — because the two screens are visually identical and mean opposite things.

Shared checkpoint behaviour: inline non-blocking feedback, unlimited retries, no timers, no score, results announced in a polite live region, and the sheet never traps the learner (Close is always available and always ≥ 44×44px).

---

## 6. Touch & input

### 6.1 Hit targets

- **Minimum 44 × 44 CSS px** for every interactive element. This exceeds WCAG 2.2 AA (24×24) deliberately and matches the house standard used across the sibling project, where sub-44px controls are logged as defects.
- **Minimum 8px between adjacent targets.** Where two targets are closer, they must be merged into one.
- The 44px minimum applies to the *hit area*, which may exceed the visible box — but hit areas must never overlap each other. Where a visible element cannot reach 44px (hand chips, log ticker text), it must not be an independent target at all (§4.5).

### 6.2 Thumb reach, one-handed portrait

Measured from the bottom edge of the viewport:

| Band | Range | Use |
|---|---|---|
| **Easy** | 0 – 160px | **All primary actions must live here**: Next, Answer this, Submit, sheet primary actions |
| **Reachable** | 160 – 420px | Secondary controls, the hand strip, the log ticker |
| **Stretch** | > 420px | Display only, plus low-frequency controls where a mis-tap is cheap |

Consequences: the score chip and act label sit in the header (stretch zone) because they are read far more often than tapped. Back sits bottom-**left**, which is the harder corner for a right-handed thumb — deliberate, since accidental backward navigation is more annoying than a deliberate reach. Sheet Submit buttons are bottom-anchored within the sheet.

### 6.3 Step navigation: tap only

**Tap-only. No swipe navigation between steps.** Three independent reasons:

1. It would collide with the horizontally scrolling hand fallback at `xs` (§4.5), where a horizontal drag is ambiguous.
2. A left-edge swipe on iOS Safari is the **browser's back gesture**, occupying roughly the leftmost 20px. A swipe-to-navigate implementation either fights it or is shadowed by it.
3. In a social setting with people talking, an accidental swipe advances the lesson past something the learner has not read, and the recovery (swipe back) is not obvious to a beginner.

Swipe **is** permitted for one thing: **swipe-down to dismiss a sheet.** It is a platform-standard gesture, it is vertical so it does not collide with the hand, and it is additive — the Close button is always present and is the specified path.

### 6.4 Long-press

**No action may require a long-press.** Long-press is reserved for the OS text-selection and context menus. Card definitions, glossary terms, and seat details are all reachable by tap.

### 6.5 Hover

**No information may exist only in a `:hover` state.** Any tooltip, definition, or detail must be reachable by tap and present in the DOM for assistive technology. Hover styling is permitted as pure enhancement on pointer-capable devices, gated behind a hover feature query so touch devices never inherit a sticky hover state after a tap.

### 6.6 Sheets and the back button

Opening a sheet pushes a history entry. Consequences, all required:

- The Android hardware back button closes the sheet rather than changing step.
- The iOS back gesture closes the sheet.
- Escape closes the sheet.
- The sheet's Close button calls `history.back()` so all four paths run identical code and cannot desynchronise.
- Focus moves into the sheet on open and returns to the triggering control on close.
- `role="dialog"`, `aria-modal="true"`, focus trapped while open.

### 6.7 Touch CSS requirements

Named requirements for the designer to implement:

- `touch-action: manipulation` on every interactive element, to eliminate the 300ms double-tap-zoom delay. **Do not** apply `touch-action: none` at the document level.
- `overscroll-behavior: contain` on every scroll container — the annotation zone and every sheet — so scroll does not chain to the shell behind.
- **A visible `:active` state on every interactive element, rendering within 100ms.** If `-webkit-tap-highlight-color` is suppressed, it must be *replaced*, never merely removed — silently removing it makes every tap feel broken on Android.
- `user-select: none` on card chips and seat tokens, so a slightly-long press does not start a text selection. **Do not** apply it to annotation copy, the log, or the cheat sheet — learners legitimately select and copy that text.
- Focus-visible outlines must be preserved for keyboard and switch-control users. Never blanket-remove focus outlines.

---

## 7. Legibility

Design assumption: read at arm's length (~40cm), in a lit room, on a screen possibly at reduced brightness, by someone who has never seen this game.

### 7.1 Type minimums

| Element | Minimum |
|---|---|
| Annotation / teaching body | **17px** (18px at `md`) |
| Checkpoint option labels | **16px** |
| Card rank, hand strip | **16px** |
| Card rank, sheets and full-size cards | **20px** |
| Suit glyph, hand strip | **14px** (12px at `xs`) |
| Seat card count | **14px**, tabular figures |
| Seat name, act label, step counter, log entry | **13px** |
| **Absolute floor, any text anywhere** | **13px** |

Additional:

- Body line-height ≥ **1.5**.
- Measure 45–75 characters. At 375px and 17px this lands at ~41 characters per line — narrower than ideal, which is a known and accepted consequence of the device, and is the reason for the 180-character annotation cap (§4.8) rather than a reason to shrink the type.
- **Any `<input>` or `<textarea>` must be ≥ 16px**, or iOS Safari auto-zooms the viewport on focus and does not zoom back out. (The current design has no free-text input; this binds if one is added.)
- All type in `rem`, so OS-level text scaling works.

### 7.2 Contrast

| Content | Minimum ratio |
|---|---|
| Body text and all text < 24px | **4.5 : 1** |
| Text ≥ 24px, or ≥ 19px bold | **3 : 1** |
| UI component boundaries, card edges, seat token borders | **3 : 1** |
| Active-seat marker against adjacent surfaces | **3 : 1** |
| Focus indicator against both the component and the background | **3 : 1** |
| Disabled controls | Exempt from the ratio, but the accompanying explanatory text is not (§5.5.3) |

These apply in **both** light and dark schemes — `index.html` declares `color-scheme: light dark`, so both will be rendered and both must be verified.

### 7.3 Colour independence

**No information may be carried by colour alone.** Specific bindings:

1. **Suits** are distinguished primarily by **glyph shape** (♠ ♥ ♦ ♣), which is always shown. Shape is the primary channel; colour is reinforcement.
2. If suits are coloured, use a **four-colour scheme** (e.g. spades black, hearts red, diamonds blue, clubs green) rather than the traditional two-colour deck. A red/black deck gives a deuteranope two ambiguous pairs at exactly the moment they must read a rank across a table. Every suit colour must clear **3:1 against the card face**, and any two suit colours must be distinguishable by luminance as well as hue.
3. **Team identity** (Us / Them) must never be red/green, and never colour alone — it is carried by token shape plus a text marker (§4.4).
4. **Active seat** — ring + caret + accessible-name suffix (§4.4).
5. **Score board cell state** — label text plus shape, not fill colour alone (§4.7).
6. **Checkpoint correct/incorrect** — glyph plus text, not colour alone (§5.5.4).
7. **Jokers and 8s** (the ninth half-suit) need a distinct treatment that does not depend on colour.

   **The jokers are the sharpest colour-independence problem in this product and need a specific ruling.** `RULES.md` §2 names them "the red joker" and "the black joker" — they are two distinct, individually askable cards whose *only* canonical distinguishing feature is a colour word. For a colourblind learner, a red-vs-black distinction carried by fill colour is precisely the failure mode §7.3 exists to prevent, and here it is not cosmetic: asking for the wrong joker is an illegal or wasted ask.

   Required: each joker carries a **distinct non-colour mark** (two different joker glyphs, or a mark plus a differing outline treatment) **and** its full text label — "Red joker" / "Black joker" — wherever it appears at full size, with the words in the accessible name at every size including the 28px hand chip. The colour words stay, because they are the table's shared vocabulary and the learner must be able to say them out loud; but they must never be the *only* channel on screen.

### 7.4 No text in images

**No raster images anywhere in this product** (§1.6 sets the budget to 0 KB), and specifically **no text baked into any image, raster or vector.**

Card faces, suit glyphs, ranks, seat labels, and the cheat sheet are all **live DOM text**. Reasons: text in images does not scale with OS text size, does not reflow at 200% zoom, is invisible to screen readers, cannot be selected or copied, cannot be translated, and prints at screen resolution. Decorative inline SVG is permitted for non-text ornament only.

### 7.5 Dark mode

`color-scheme: light dark` is declared. Both schemes must meet §7.2 independently. Neither may be the only scheme in which a §7.3 distinction holds.

### 7.6 Text scaling

Content and functionality must survive **200% text scaling** (WCAG 1.4.4) and **200% page zoom**. The mechanism is already specified: at 200% the usable height drops below 560px and the layout enters compact scroll mode (§2.5). Nothing may be clipped, and no control may become unreachable.

---

## 8. Motion & battery

### 8.1 `prefers-reduced-motion`

A global reduced-motion block is required. When `prefers-reduced-motion: reduce` is set:

1. All non-essential transitions and animations drop to **0ms** (or a single frame).
2. No parallax, no auto-playing card-deal animation, no attention-seeking pulse on the active seat.
3. Sheets **appear and disappear instantly** rather than sliding.
4. Log entries appear without a slide or fade.
5. **Every state change must remain perceivable without motion.** Any state currently communicated by an animation needs a non-motion equivalent — an immediate colour-plus-label swap, a glyph change, or a live-region announcement. Turn changes, hit/miss results, and checkpoint feedback are the three that matter most.
6. The guide must be completable end to end with motion off. Motion is never load-bearing.

### 8.2 Animation cost on mid-range phones

- **Animate `transform` and `opacity` only.** These are compositor-only properties.
- **Never animate** `width`, `height`, `top`, `left`, `margin`, `box-shadow`, or `filter` — each forces layout or paint every frame.
- **`backdrop-filter` is forbidden** on any surface that animates or scrolls, including sheet backdrops. It is among the most expensive effects on mid-tier Android GPUs and will visibly drop frames during a sheet transition — the single most-seen animation in this app.
- **Maximum 2 elements animating concurrently.**
- Durations: **120–240ms** for state changes, **≤ 400ms** for sheet enter/exit.
- **No infinite or looping animations anywhere.** They drain battery, prevent the compositor from idling, and compete with a live conversation for attention.
- **No `requestAnimationFrame` loop while idle.** Any rAF work must be scheduled by an interaction and must stop when it settles.
- Target 60fps. Any interaction exceeding **200ms INP** is a defect (§1.7).

---

## 9. Offline & resilience

### 9.1 Service worker: **no**

**Do not ship a service worker in v1.**

Reasoning:

1. **The payoff is near zero on the dominant path.** This is a single-session, ~10-minute, one-time-use experience reached from a printed QR code. A service worker's value is repeat visits. This product's modal user visits once, learns the game, and starts playing.
2. **The failure mode is worse than the problem.** A stale cached bundle means a learner at a club table is being taught a rule that has since been corrected — with no visible signal that it is stale. For a product whose only job is to teach rules accurately, silent staleness is the worst available bug.
3. **The cost is real.** Registration, versioning, update and `skipWaiting` choreography, and the "reload to update" prompt are all surface area, and each is a source of bugs that only reproduce on someone else's phone.
4. **HTTP caching already covers the actual scenarios.** See §9.3.

**Revisit if either becomes true:** measured repeat visits exceed 15%, or the critical-path bundle exceeds 250 KB compressed. Until then, this is a deliberate omission, not an oversight.

### 9.2 No network after first load

**Zero network requests after the app has loaded.** Every one of the 19 steps, all scripted game state, all card data, and the cheat sheet ship in the initial bundle.

Consequences that are requirements:

- No lazy-loaded step content, no runtime fetch of card data.
- No analytics beacon on the critical path. If analytics is added later it must be fire-and-forget, must not block interaction, and must not produce a visible error when it fails.
- Losing connectivity mid-session is therefore **invisible**: there is no request to fail. Do not build an offline banner, a connectivity listener, or a retry UI — there is nothing to retry.
- The only network-dependent moment in the entire product is the first load, which §1.5 already handles.

### 9.3 HTTP caching and bfcache

- Hashed assets under `/assets/*`: `Cache-Control: public, max-age=31536000, immutable`.
- `index.html`: `Cache-Control: no-cache` — revalidated every load, so a rules correction reaches everyone on their next visit with no invalidation dance.
- **`Cache-Control: no-store` must never be set on the document**, and the app must register **no `unload` handler** (use `pagehide`/`visibilitychange` instead). Both would disqualify the page from the back/forward cache.

The bfcache is the real mechanism behind "the learner locked their phone mid-step and came back five minutes later" — the page resumes instantly with live state, no reload, no re-download. That is the offline scenario that actually occurs at a table, and it is handled without a service worker. Preserving bfcache eligibility is therefore a **requirement**, not an optimisation.

### 9.4 Local progress persistence

Key: `fish-onboarding:progress:v1`

```json
{
  "schemaVersion": 1,
  "stepId": 12,
  "actId": 2,
  "checkpointAnswers": { "legal-ask": "b", "claim-spades-high": { "…": "…" } },
  "startedAt": "2026-08-20T19:02:11.000Z",
  "updatedAt": "2026-08-20T19:07:44.000Z"
}
```

Requirements:

1. Written on every step change, **debounced 250ms**, and flushed on `visibilitychange → hidden`. Never on `unload` (§9.3).
2. **Every read and write wrapped in try/catch.** Safari Private Browsing has historically thrown on `setItem`, and quota errors happen. On failure, fall back to in-memory state and continue silently — **a storage failure must never surface to the learner and must never block progress.**
3. `schemaVersion` mismatch or parse failure → discard and start clean (§1.3).
4. **No personal data, ever.** Step index and checkpoint answers only. No identifiers, no free text, no device fingerprint.
5. The URL (§1.4) is the second, independent persistence channel. Browser session restore therefore recovers the step even if `localStorage` is unavailable.
6. "Start over" clears the key and navigates to `/step/1`.

---

## 10. Print / share fallback

The cheat sheet is the artefact the learner keeps. It must survive leaving the browser.

### 10.1 Screenshot survivability

- **The primary cheat sheet panel must fit in a single 375 × 650 viewport with no scrolling.** A screenshot is the overwhelmingly likely way this gets kept and shared, and a screenshot captures one viewport.
- At most **two panels total**. Each must be self-contained and independently meaningful — a screenshot of panel 2 alone must not be a fragment. Panel 1 carries what matters mid-game: the ask rule, the turn rule, the claim rule. Panel 2 carries the half-suit reference and the glossary.
- **No `position: fixed` chrome overlapping the panel** — the nav bar, header rail, and any sheet must not appear in the capture. The cheat sheet route renders without the shell chrome, or hides it.
- The panel must be legible when the screenshot is later viewed scaled down in a messaging app: minimum type on the cheat sheet is **14px**, not 13px.

### 10.2 Print

A print stylesheet is required.

- **Fits one page** at both A4 and US Letter, portrait.
- Drops: nav bar, header rail, progress bar, table, hand strip, all sheets, all interactive controls.
- **Forces a light scheme.** Printing a dark-themed page wastes ink and renders greys illegibly. Do not let `color-scheme: dark` reach the printer.
- Black text on white. Suits print as glyphs (§7.3.1), so **nothing is lost when printed in greyscale** — this is a direct benefit of the shape-primary rule and must be verified, not assumed.
- `print-color-adjust: exact` is permitted only for elements where a fill is genuinely load-bearing. Per §7.3, nothing should qualify; if something does, that is a §7.3 violation to fix rather than a print exception to grant.
- No `position: fixed` elements — they repeat on every page or clip.
- URLs are not expanded into the printed text.

### 10.3 Sharing

- The cheat sheet has its own route, `/cheatsheet`, deep-linkable and shareable as a plain URL. That is the specified share mechanism.
- All cheat sheet text is **selectable and copyable** (§6.7 forbids `user-select: none` here).
- The Web Share API is an **optional enhancement only**: feature-detect it, and where absent fall back to a "Copy link" button. Nothing may depend on it.
- The cheat sheet must be reachable directly from the last step **and** from a control in the header rail, so a learner mid-guide can jump to it when the table is waiting.

---

## 11. Acceptance criteria

Run on a **real phone**, not a simulator, at 320px and at 375px, in both light and dark schemes. Every item is objectively pass/fail.

**Entry and load**

1. Scanning the printed QR opens the app at step 1 with no intermediate screen, no splash, and no consent dialog.
2. On a throttled connection (1.6 Mbps, 300ms RTT), readable text — a heading plus one sentence — is painted within **1.8 s**.
3. On the same connection, step 1's heading, body, and a tappable Next button are all present within **3.5 s**.
4. Total compressed transfer for a cold first load is **≤ 120 KB** (target ≤ 98 KB), measured in DevTools with cache disabled.
5. Uncompressed JS is **≤ 350 KB**.
6. Zero font files and zero raster images appear in the network waterfall.
7. With the network blocked after load, all 19 steps, all 4 checkpoints, and the cheat sheet are completable with **zero** network requests recorded.
8. With JS blocked entirely, `index.html` still paints a heading and a sentence (not a blank page and not a bare spinner).
9. With the JS entry delayed past **8 s**, the "Still loading" message and a working Retry button appear.

**Viewport and chrome**

10. The `viewport` meta is exactly `width=device-width, initial-scale=1, viewport-fit=cover`. Searching the built output for `user-scalable` and `maximum-scale` returns zero matches.
11. Pinch-zoom to at least 200% works on every screen, including inside every sheet.
12. Scrolling within the annotation zone does **not** collapse or expand the iOS Safari toolbar, and the shell does not resize.
13. On a home-indicator device, no interactive element sits within **34px** of the bottom edge; the Next button is fully tappable on the first attempt, ten times out of ten.
14. In landscape on a phone, the app enters compact scroll mode. No rotate prompt appears and orientation is not locked.
15. At 200% OS text scaling, the app enters compact scroll mode; no text is clipped and every control remains reachable.

**Layout**

16. At 320px width, no horizontal page scrollbar exists and no content is clipped, on every one of the 19 steps.
17. At 375 × 650, the shell does not scroll as a whole; only the annotation zone and sheets scroll.
18. All 9 hand cards are visible simultaneously without scrolling, at 320px, including a hand holding one card in each of nine different half-suits.
19. Card ranks in the hand strip render at **≥ 16px**; suit glyphs at **≥ 14px** (≥ 12px at 320px).
20. All 6 seats, all 6 card counts, and the active-seat marker are visible and legible at 320px without scrolling.
21. Cumulative Layout Shift across a full 19-step run is **≤ 0.05**.
22. Advancing 19 steps and returning produces no zone-height change other than the annotation zone.

**Claim checkpoint**

23. The claim sheet shows all **6** card rows and their assignments simultaneously, without scrolling, at 375 × 650.
24. Every segment in every claim row measures **≥ 44px wide and ≥ 44px tall** at 320px.
25. A complete claim is achievable in exactly **6 taps** from the sheet opening.
26. Changing an already-made assignment takes exactly **1 tap**.
27. Submit is unavailable until all 6 cards are assigned, and a visible text explanation states why.
28. An incorrect claim can be revised and resubmitted with no limit and no dead end.
29. The claim's holder options are exactly the learner plus the two teammates — no opponent seat appears as an option.

**Touch and input**

30. Every interactive element measures **≥ 44 × 44px**, and adjacent targets are **≥ 8px** apart. (Automate with a DOM sweep of `getBoundingClientRect` over all interactive elements.)
31. Every interactive element shows a visible pressed state within **100ms** of touch-down.
32. Double-tapping any button does not zoom the page.
33. Horizontal swipes anywhere on the screen do **not** change step.
34. No action anywhere in the app requires a long-press.
35. With a sheet open, the hardware/gesture back control closes the sheet and does not change step; a second back changes step.
36. Closing a sheet returns focus to the control that opened it.

**Legibility**

37. All body text is **≥ 17px**; no text anywhere is below **13px**.
38. All text meets **4.5:1** contrast (**3:1** for ≥ 24px or ≥ 19px bold), verified in both light and dark schemes with a contrast checker.
39. Rendered in greyscale (device grayscale accessibility filter), every suit remains identifiable, both teams remain distinguishable, the active seat remains identifiable, and every score-board cell state remains readable.
40. No image in the app contains text — verified by disabling images and confirming no information is lost.
41. All card ranks and suits are selectable as text.

**Motion**

42. With Reduce Motion enabled at the OS level, no element animates: sheets appear instantly, no pulse on the active seat, no card-deal animation.
43. With Reduce Motion enabled, all 19 steps and all 4 checkpoints are still completable, and every state change is still perceivable.
44. No animation runs while the app is idle (verified in a performance trace: zero scripted animation frames after 3 s of no interaction).
45. Sheet open/close holds ≥ 55fps on a mid-tier Android device.

**Persistence**

46. Advancing to step 12, closing the tab, and reopening the URL within 2 hours restores step 12 with a dismissible bar.
47. The same sequence after 2 hours opens step 1.
48. With `localStorage` disabled or throwing, the app runs normally through all 19 steps and shows no error.
49. Locking the phone at step 12 and returning after 5 minutes restores the same step with live state and no reload (bfcache verified in DevTools).
50. `/step/17` entered directly renders step 17 correctly.

**Cheat sheet**

51. The primary cheat sheet panel fits a single 375 × 650 screenshot with no scrolling and no fixed chrome in the capture.
52. Printing produces one page at A4 and one at Letter, black on white, with no navigation chrome and no clipped content.
53. Printing while the device is in dark mode still produces a light-background page.
54. All cheat sheet text is selectable and copyable.
55. Every instance of the word "book" in the built output is confined to the single permitted glossary line — verified by a case-insensitive search over the built bundle and the rendered DOM.

**Variant conformance (`RULES.md`)**

56. The rank `T` renders as "10" everywhere in the UI; a search of the rendered DOM for a standalone "T" as a card rank returns zero matches.
57. "10" fits inside a hand chip at 320px with ≥ 2px side bearing and is not clipped or ellipsised.
58. The red joker and the black joker are distinguishable from each other **in greyscale**, at hand-chip size (28px) and at full size, and both carry their full text label in their accessible name.
59. A seat at 0 cards shows the word "out", carries " — out" in its accessible name, and remains at its original ring position; no seat reflows when a player goes out.
60. All three claim outcomes are reachable in the guide and each renders a distinct heading, glyph, and rule sentence: your team scores, opposing team scores, void.
61. After submitting a claim, the true holder of all six cards is displayed.
62. The claim sheet renders all six rows for a half-suit of which the learner holds zero cards.
63. Where a pass or designate choice is offered, it is a list of ≥ 44px seat rows; `pass` lists only teammates with cards and `designate` lists only opponents with cards, and each screen states why the learner is choosing.
64. The final result screen renders a tie correctly (reachable when a void produces 4–4), not only a win or a loss.
65. Each incorrect answer on the legality checkpoint names the specific broken rule, and the four candidate asks across the checkpoint cover four distinct engine error codes.

---

## 12. Open questions for the project owner

1. **Drop `react-router-dom`?** It costs ~20 KB compressed — the entire margin between the 98 KB target and the 120 KB ceiling — for two routes in a linear stepper. Recommend removing it; needs your call before the component author starts. (§1.6)
2. **Domain length.** The QR budget assumes a target URL ≤ 25 characters at the apex. If the app will live at a long path on an existing domain, the QR gets denser and scan latency rises on older cameras. Worth buying a short domain. (§1.1)
3. **Four-colour deck.** §7.3.2 recommends spades/hearts/diamonds/clubs in four distinct colours rather than the traditional red/black. It is unambiguously better for colourblind readers and at arm's length, but it is unfamiliar and it is a visual-identity decision that belongs to you and Codex, not to this spec. Shape-primary is required either way; the four-colour scheme is the recommendation on top.
4. **Seat names ≤ 7 characters.** Derived from the claim sheet at 320px (§5.4). This constrains the scripted game's cast. Satisfied: the cast is You, Ravi, Mia, Dana, Kofi, Sam — all ≤ 4 characters, with distinct initials, and a test in tests/tutorial/script.test.ts enforces it.
5. **Cheat sheet: one panel or two?** §10.1 permits two. One is better for sharing; two allows a fuller half-suit reference. This is a content-scope decision that determines whether the 9 half-suits get a full table or a compressed line.
6. **Analytics.** This spec assumes none. If any is wanted, it must be fire-and-forget and off the critical path (§9.2) — and note that §9.1's "revisit the service worker at 15% repeat visits" trigger is unmeasurable without it.
