# CURRICULUM.md — what the guide teaches, and why in this order

The promise is: **a complete beginner can sit down and play after about ten minutes.** Not
play well — play *legally and confidently*, without someone at the table having to stop and
explain the claim rule twice.

Everything below is a design constraint, not a description. `tests/tutorial/script.test.ts`
enforces the parts that can be enforced.

---

## 1. What "knows how to play" actually requires

Eleven things. A beginner who has all eleven can take a seat; one who is missing any single
one will stall the table.

| # | Must know | Taught in |
|---|---|---|
| 1 | Six players, two teams, alternating seats, hidden hands | Act 1 |
| 2 | 54 cards divide into nine half-suits of six | Act 1 |
| 3 | Five half-suits wins; nine is odd on purpose | Act 1, reinforced Act 5 |
| 4 | A turn is one ask, or one claim, and nothing else | Act 2 |
| 5 | The four gates an ask must pass | Act 2, checkpoint 1 |
| 6 | Hit keeps the turn; miss gives it away | Act 2 |
| 7 | Every ask and result is public — that is the game | Act 3, checkpoint 2 |
| 8 | A claim names the half-suit *and* all six exact holders | Act 4, checkpoint 3 |
| 9 | Three claim outcomes: score, opponents score, void | Act 4 |
| 10 | Running out of cards, and the whole-team-out endgame | Act 5 |
| 11 | The ninth half-suit and why draws are almost impossible | Act 5, checkpoint 4 |

Deliberately **not** taught: strategy, counting conventions, signalling, when to claim on
thin information. Those belong in a second document. Ten minutes buys the rules and one good
habit — listening to the log — and nothing else.

---

## 2. The five acts

| Act | Title | What it buys |
|---|---|---|
| 1 | The table | Orientation. What you are looking at, what you are trying to win. |
| 2 | The ask | The core loop, and the four legality gates, learned by being caught out. |
| 3 | Reading the table | The realisation that the public log is the actual game. |
| 4 | The claim | How a half-suit is won, and the three ways it ends. |
| 5 | Winning | Running dry, the endgame, and the ninth half-suit deciding it. |
| 6 | Take it to the table | The whole game on one printable card. |

---

## 3. The four checkpoints

The user chose "walkthrough with you-try checkpoints", so the guide is not a slideshow. Four
times, the learner has to make the decision themselves.

Three design rules govern every one of them:

1. **Exactly one correct answer**, and it is the move the script goes on to play. The
   learner's reasoning and the game's history never diverge, which is what lets "Back" work
   and keeps the whole thing deterministic.
2. **Solvable by deduction from public information alone.** Never a guess. This is the hard
   constraint that drove the hand-authored deal in `src/tutorial/table.ts` — a checkpoint you
   can only guess at teaches guessing.
3. **A wrong answer teaches more than a right one.** Each wrong option carries the specific
   reason it fails, and a wrong claim shows exactly what voiding costs.

| # | Step | Teaches | How the learner can know |
|---|---|---|---|
| 1 | Which ask is legal? | The four gates | Three options each break one visible gate |
| 2 | Which ask is certain? | The log is information | Dana publicly took the 3♠ from your hand |
| 3 | Claim the low spades | The claim mechanic, and void | Five in hand; Mia's 6♠ is deducible from her earlier ask |
| 4 | Claim Eights & Jokers | The ninth half-suit, for the game | Kofi's 8♠ is the only card left after his two joker hits |

Checkpoint 4 is the payoff: the score is 4–4, the learner personally makes the winning claim,
and the ninth half-suit decides the game 5–4. The variant's whole purpose is felt rather than
asserted.

---

## 4. Where the ten minutes go

The budget is **derived from the copy**, not hand-set — see `stepSeconds()` in
`src/tutorial/script.ts`. A hand-set number drifts the moment anyone edits a sentence, and
then the ten-minute promise quietly becomes untrue. Reading time comes from the word count;
interaction time is a fixed allowance per step type.

Two figures are published, because one would be flattering rather than honest:

| Reading speed | Total | Note |
|---|---|---|
| 250 wpm — short second-person copy read beside a picture | **9.8 min** | The typical learner |
| 200 wpm — careful, comprehension-first reading | **11.2 min** | The conservative case |

Roughly **43% of the time is checkpoints** — the parts the learner does rather than reads.
That ratio is asserted in the tests, because it is the difference between a tutorial and a
brochure.

Nothing auto-advances. The budget constrains how much copy a step may carry; it is never a
timer shown to the learner, and a slow reader is not punished.

### Keeping it honest

If the guide grows past its budget the test fails, and there are only three legitimate
responses:

1. Cut words. Usually the right answer.
2. Merge two steps that are making the same point. Also usually right.
3. Accept a longer guide and change the published figure. Legitimate, but then the README and
   the marketing have to change with it.

Raising the words-per-minute constant to make the number look better is not on the list.

---

## 5. Why the teaching game is a real game

Every step replays a genuine `GameAction` through the same pure reducer the rules live in
(`lib/engine/reduce.ts`), starting from a hand-authored 54-card deal. Nothing is mocked or
narrated into existence.

This matters more than it sounds. A tutorial whose examples are hand-written prose drifts:
someone edits a rule, and three slides quietly start teaching the old one. Here, if a step's
copy says "this hits and you keep the turn", the engine produced that hit and that turn, and
`tests/tutorial/script.test.ts` fails the build if it ever stops doing so. The tests also
check that every claim checkpoint really is solvable, that every stated deduction names a real
transfer, and that the guide never says "book".

The deal is authored rather than seeded because a teaching game has to put specific cards in
specific places. Five of the learner's team's cards start in opposing hands so there are real
hits to teach with; two of the opposition's start on the learner's side so the other team has
something to fish back.

---

## 6. Known limitations

- **Strategy is absent by design.** A learner finishes knowing the rules and one habit. They
  will lose their first few games.
- **The montages compress time.** Two steps apply several moves at once and say so plainly
  ("A real game now runs another twenty or thirty asks"). They are real engine moves, but the
  learner is not shown every ask that a real game would contain.
- **The endgame is shown once, not drilled.** Whole-team-out and the designate rule appear in
  the script and on the cheat sheet, but there is no checkpoint on them. They are rare enough
  that a table can look them up.
- **One variant only.** This teaches the club's nine half-suit game. A player who sits down at
  a standard 48-card table will find the 8s missing and eight half-suits instead of nine.
