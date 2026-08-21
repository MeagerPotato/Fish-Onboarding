# Fish Onboarding

**Learn Literature (Canadian Fish) in about ten minutes.** An interactive guide for complete
beginners — a scripted teaching game with four points where you have to make the move
yourself. Written in deliberately plain language: sentences average nine words.

Built for the club's nine half-suit variant: 54 cards, and the four 8s plus both jokers form a
ninth, tiebreaking half-suit.

Most people will reach this by scanning a QR code at the table, so it is phone-first and
completely self-contained — no accounts, no backend, no network requests after load.

---

## Status

| | |
|---|---|
| Rules engine | Done — 54 cards, 9 half-suits, 86 tests including 300 fuzzed games |
| Teaching script | Done — 19 steps, 4 checkpoints, verified against the engine |
| Components | Done — headless, semantic, accessible |
| Visual design | Done — see [DESIGN_BRIEF.md](DESIGN_BRIEF.md) for the contract it was built to |

**82 KB gzipped of a 98 KB budget.** No webfont, no images, no external requests, no WebGL —
see [docs/MOTION_STACK.md](docs/MOTION_STACK.md) for why Three.js was measured and rejected.

### Where the design came from

Three studies, each measured rather than asserted:

- [docs/DESIGN_INSPIRATION.md](docs/DESIGN_INSPIRATION.md) — a reference site the look is drawn
  from. The headline finding is that it uses no WebGL at all: its feel is plain CSS and DOM.
- [docs/DIAGRAM_SYSTEM.md](docs/DIAGRAM_SYSTEM.md) — the token system, adapted from
  `cathrynlavery/diagram-design` (MIT, © 2025 Cathryn Lavery). Technique adapted; nothing copied.
- [docs/MOTION_STACK.md](docs/MOTION_STACK.md) — why the animation layer is 1.6 KB of CSS.

The rule that binds all of it: **colour never encodes anything on its own.** Team is carried by
corner radius, suit by glyph, state by border style. The whole interface survives greyscale, which
is checked by measurement rather than by eye.

---

## Develop

```bash
npm install
npm run dev
```

```bash
npm run verify
```

`verify` runs typecheck, lint, and the full test suite. It must pass before anything ships.

```bash
npm run script:trace
```

Prints the whole teaching game move by move — every hand, every event, the running score. This
is the tool for editing the script: it shows what the engine will actually do, so a new step
can be written against reality rather than hope.

---

## How it is put together

```
RULES.md              The pinned rules. Single source of truth for engine and copy alike.
CURRICULUM.md         What the guide teaches, in what order, and where the ten minutes go.
DESIGN_BRIEF.md      The design brief: what is yours, what is not, what "done" means.

lib/engine/           Pure rules engine. No framework, platform or DOM imports.
src/tutorial/         The teaching script, the hand-authored deal, view models, state machine.
src/components/       Headless React components + their empty stylesheets.
docs/                 Design study, mobile spec, desktop QA.
tests/                82 tests. The specification, in executable form.
```

**Nothing in the guide is hand-waved.** Every step replays a real `GameAction` through the
same pure reducer the rules live in, starting from a fixed 54-card deal. If a step's copy says
"this hits and you keep the turn", the engine produced that hit and that turn — and the tests
fail the build if it ever stops doing so.

Every checkpoint is solvable by deduction from the public log alone. That constraint is why
the deal is hand-authored rather than seeded: a checkpoint you can only guess at teaches
guessing.

---

## Terminology

A set of six collectable cards is a **half-suit**. Never a "book" — the guide uses one word so
a beginner has one thing to remember, and a test enforces it. There is exactly one permitted
mention of the synonym, in the glossary on the final reference card, so that a player who
hears it at another table knows what is meant.

---

## The variant

Nine half-suits, not the standard eight:

| | |
|---|---|
| Deck | 52 + both jokers = **54** |
| Deal | 6 players, **9 cards each** |
| Half-suits | Low (2–7) and High (9–A) of each suit = 8, plus **Eights & Jokers** = 9 |
| To win | First team awarded **5** half-suits. Play stops immediately |

Nine is odd on purpose. In the standard eight half-suit game a 4–4 draw is common and
deflating. Here every resolved half-suit is awarded to a team — a wrong declaration hands it to
the opponents rather than discarding it — so the scores always sum to the number resolved, and
with nine on the table **a draw cannot happen.**

The game stops the moment a team is awarded its 5th half-suit. Any still on the table are never
played, so a finished game shows anywhere from five to nine resolved.

Full rules, including claim resolution and the endgame, are in [RULES.md](RULES.md).
