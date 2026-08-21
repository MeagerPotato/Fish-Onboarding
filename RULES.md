# RULES.md — Fish (Literature), the 9 half-suit variant

Single source of truth for this project's rules engine and for every word of tutorial copy.
This repo teaches **one** variant. There are no toggles and no alternate rule sets: the guide has
ten minutes and a beginner's attention, and both are spent on the variant this club actually plays.

**Baseline sources** (the standard game this variant modifies):
- pagat.com — Literature: https://www.pagat.com/quartet/literature.html
- Wikipedia — Literature (card game): https://en.wikipedia.org/wiki/Literature_(card_game)

The standard game uses a 48-card deck (52 minus the four 8s) and 8 half-suits. **This variant adds
the two jokers back and promotes the four 8s into a 9th half-suit.** Everything else follows the
baseline.

---

## 0. Terminology (binding on all UI copy)

| Term | Use |
|---|---|
| **half-suit** | The word this guide uses, everywhere, for a set of 6 collectable cards. |
| ~~book~~ | **Never used in tutorial copy.** Permitted exactly once, in the glossary, as a note that other tables say "book" for the same thing. |
| **ask** | The core action: requesting one named card from one named opponent. |
| **hit** / **miss** | The two outcomes of an ask. |
| **claim** | Declaring a half-suit and the exact location of all 6 of its cards. |
| **void** | A claimed half-suit that scores for nobody. |

Rationale: "book" collides with the everyday meaning and with quartet games where a book is four of
a kind. "Half-suit" is self-describing — it tells a beginner what the thing *is* the first time they
read it. Mixing the two words doubles the vocabulary a beginner must hold in the first two minutes.

Code identifiers follow the same rule: `HalfSuitId`, `halfSuitCards()`, `cardHalfSuit()`. There is
no `book` identifier anywhere in `lib/` or `src/`.

---

## 1. Decision table

| # | Rule | Pinned setting |
|---|------|----------------|
| 1 | Players & teams | 6 players, 2 teams of 3, seated alternating — seats 0,2,4 = Team A, seats 1,3,5 = Team B |
| 2 | Deck | Standard 52 **plus both jokers** to 54 cards |
| 3 | Half-suits | **9 half-suits of 6.** Per suit: LOW = 2·3·4·5·6·7, HIGH = 9·T·J·Q·K·A. Plus **EIGHTS = 8C·8D·8H·8S·red joker·black joker** |
| 4 | Deal | All 54 dealt, **9 per player**; first turn = seat 0 |
| 5 | Ask: target | One specific card from one specific **opponent**; teammates may never be asked |
| 6 | Ask: half-suit requirement | Asker must hold at least 1 card of the asked card's half-suit |
| 7 | Ask: own card | Asker may not ask for a card they already hold |
| 8 | Ask: target has cards | Target must hold at least 1 card (of anything) |
| 9 | Hit | Target hands the exact card over face up; asker **keeps the turn** and asks again |
| 10 | Miss | Turn passes to the player who was asked |
| 11 | Claim timing | On your own turn only |
| 12 | Claim content | Name the half-suit and the exact holder of **every** one of its 6 cards; every holder named must be on your own team |
| 13 | Claim: correct | All six locations right, so your team scores the half-suit |
| 14 | Claim: opponent holds at least 1 | **Opposing team** scores the half-suit, regardless of the other five locations |
| 15 | Claim: own team holds all six, any location wrong | Half-suit is **void** — removed from play, nobody scores |
| 16 | Claim without holding | You may claim a half-suit while holding none of its cards |
| 17 | After any claim | The claimant's turn **continues** (correct, opponent-scored, or void alike) |
| 18 | Information | Card counts are public. Every ask and its result is public and stays in the on-screen log. Hidden card identities are never shown |
| 19 | Out of cards (not via own claim) | You drop out: cannot ask, cannot be asked; play continues around you |
| 20 | Out of cards via your own claim | You choose any teammate **with cards** and pass the turn to them |
| 21 | Whole team out of cards | Play stops; the team **with** cards must claim every remaining half-suit — procedure in §5 |
| 22 | Game end | All **9** half-suits resolved (scored or void) |
| 23 | Winner | More half-suits wins. 9 is odd, so a clean game cannot tie — see §6 |
| 24 | Player count | 6 only |

---

## 2. The 54-card deck

### The nine half-suits

| # | Half-suit | ID | Cards |
|---|---|---|---|
| 1 | Low Clubs | `LOW-C` | 2C 3C 4C 5C 6C 7C |
| 2 | Low Diamonds | `LOW-D` | 2D 3D 4D 5D 6D 7D |
| 3 | Low Hearts | `LOW-H` | 2H 3H 4H 5H 6H 7H |
| 4 | Low Spades | `LOW-S` | 2S 3S 4S 5S 6S 7S |
| 5 | High Clubs | `HIGH-C` | 9C TC JC QC KC AC |
| 6 | High Diamonds | `HIGH-D` | 9D TD JD QD KD AD |
| 7 | High Hearts | `HIGH-H` | 9H TH JH QH KH AH |
| 8 | High Spades | `HIGH-S` | 9S TS JS QS KS AS |
| 9 | **Eights & Jokers** | `EIGHTS` | 8C 8D 8H 8S RJ BJ |

8 × 6 = 48, plus 6 = **54 cards**, dealt 9 to each of 6 players with none left over.

### Card identifiers

Two characters, rank then suit, with ranks `2 3 4 5 6 7 8 9 T J Q K A` and suits `C D H S`.
The two jokers are the only cards not of that form:

| Card | ID |
|---|---|
| Red joker | `RJ` |
| Black joker | `BJ` |

**The two jokers are distinct, individually askable cards.** You ask for "the red joker", not "a
joker" — the same way you ask for the 8D and not "an eight". Physical decks vary; the club's
convention is that the joker printed in colour is the red joker and the monochrome one is the black
joker. If a deck's two jokers are identical, mark one before dealing.

### Why the 8s move

In the standard 48-card game the 8s are simply removed, because 48 divides evenly by 6 and 52 does
not. This variant keeps them and pairs them with the two jokers, which restores a whole extra
half-suit and brings the deck to 54 — still an exact 9-card deal for 6 players.

---

## 3. Ask legality (engine error codes)

An `ask{seat, target, card}` is legal iff **all** of the following hold, in this order:

| Check | Error code |
|---|---|
| Game is in the `playing` phase | `WRONG_PHASE` |
| It is the asker's turn | `NOT_YOUR_TURN` |
| Asker holds at least 1 card | `ASKER_OUT` |
| Target is not the asker | `TARGET_SELF` |
| Target is an opponent (different team) | `TARGET_TEAMMATE` |
| Target holds at least 1 card | `TARGET_OUT` |
| Card is one of the 54 real cards | `INVALID_CARD` |
| Asker holds at least 1 card of the asked card's half-suit | `NO_CARD_OF_HALF_SUIT` |
| Asker does not already hold the asked card | `ASKING_OWN_CARD` |

**Hit** — the card moves target to asker; the turn does not change.
**Miss** — the turn passes to the target.
Both outcomes are public events recording asker, target, the named card, and hit/miss.

The four gates a beginner must internalise, in the guide's words:
1. Ask an **opponent** — never a teammate.
2. You must **already hold a card of that half-suit**.
3. You may not ask for a card **you already hold**.
4. The person you ask must **still have cards**.

---

## 4. Claim resolution

`claim{seat, halfSuit, assignments}` is legal iff: the half-suit is unresolved
(`HALF_SUIT_RESOLVED`); it is the claimant's turn in `playing` or `endgame`
(`NOT_YOUR_TURN` / `WRONG_PHASE`); assignments cover exactly the 6 cards of that half-suit
(`BAD_ASSIGNMENTS`); and every assigned seat is on the claimant's own team (`ASSIGN_OPPONENT`).

You claim **for your team**. There is no way to name an opponent as a holder — if you believe an
opponent holds one of the six, the move is to not claim.

Resolution order (the public event reveals the **actual** holders in every case):

1. Any of the 6 cards actually held by the **opposing** team, so the **opposing team scores** it.
2. Otherwise the claimant's team holds all six:
   - all six locations correct, so the **claimant's team scores**;
   - any location wrong, so it is **void** and nobody scores.
3. The six cards leave every hand; the half-suit is marked resolved. The claimant's turn continues
   (row 17) unless §5 applies. The game ends when all 9 are resolved.

Claiming while holding none of the half-suit is legal (row 16) and is occasionally correct — if the
public log has told you where all six sit, you can claim a half-suit you have never touched.

---

## 5. Running out of cards and the endgame

- Emptied because an opponent took your last card on a hit, or because a claim removed your last
  cards on someone else's turn — you **drop out** silently (row 19). The turn is unaffected. You can
  no longer be asked, so your teammates lose a hiding place and your opponents lose a target.
- Emptied by **your own claim** — you must `pass{to}` a teammate who still has cards (row 20). Only
  `pass` is legal while this is pending (phase `awaitPass`).
- **Whole team out** (either team's total is 0 with half-suits remaining) — phase `endgame`:
  - If the turn belongs to a player **with** cards, that player alone claims all remaining
    half-suits, in any order, without consulting teammates.
  - If the turn belongs to the **empty** team, that player must `designate{to}` one opponent who has
    cards (phase `awaitDesignate`), and that player alone claims out the rest.
  - Endgame claims resolve exactly as in §4 — misplacing a card among your own teammates still
    voids it.
- Precedence: if a claim resolves the 9th half-suit the game is `finished` regardless of any pending
  pass or designate. If a claimant empties both themselves and their whole team, `awaitDesignate`
  wins over `awaitPass`.

---

## 6. Scoring and the tiebreaking 9th half-suit

Each resolved half-suit scores 1 for the team that won it. Void half-suits score for nobody.
The team with more half-suits wins.

**Nine is odd on purpose.** In the standard 8-half-suit game 4–4 is a common and unsatisfying
result. With nine, a game in which every half-suit is scored *cannot* tie — the closest result is
5–4. `EIGHTS` is the half-suit that makes the count odd, which is why the club calls it the
tiebreaking half-suit.

> **Caveat, stated in the guide too:** a tie is still *arithmetically* possible if half-suits are
> voided — for example 4–4 with one void. Voids are the only route to a draw. This is treated as a
> genuine (rare) outcome, not swept under the rug.

`EIGHTS` is dealt, asked for, and claimed exactly like the other eight. It has no special powers and
is not held back for a tiebreak — it simply exists, and its existence is what makes the total odd.

> **ASSUMPTION FLAGGED FOR REVIEW.** This section reads "tiebreaking" as *structural*: the 9th
> half-suit exists so the total is odd and clean games cannot tie. The alternative reading — that
> `EIGHTS` is set aside and only played when the other eight finish 4–4 — is **not** what this repo
> implements. If the club's intent is the second reading, say so and this section plus the engine's
> deal change together; nothing else does.

---

## 7. Worked examples (engine test vectors)

1. **Correct claim.** Team A (seats 0,2,4) holds LOW-S as 2S@0, 3S@0, 4S@2, 5S@2, 6S@4, 7S@4.
   Seat 0 claims with exactly those locations, so Team A scores LOW-S and seat 0 keeps the turn.
2. **Opponent holds one.** As above but 7S is actually at seat 1 (Team B), so **Team B** scores
   LOW-S, even though Team A had five of the six.
3. **Misplacement voids.** Team A holds all six but seat 0 swaps the stated locations of 4S and 6S,
   so LOW-S is **void**, nobody scores, and seat 0 keeps the turn.
4. **Claim-out pass.** Seat 0's correct claim uses their last 2 cards, so seat 0 must pass to seat 2
   or 4, whichever has cards. Passing to a cardless teammate is `PASS_TARGET_OUT`.
5. **Endgame designation.** Seat 0's claim empties all of Team A while Team B still has cards, so
   seat 0 designates a Team B seat with cards and that seat alone claims the remaining half-suits.
6. **The jokers are ordinary.** Seat 0 holds 8D and asks seat 3 for `RJ`. Legal: `RJ` is in the
   `EIGHTS` half-suit and seat 0 holds 8D, which is in the same half-suit. Holding a joker likewise
   licenses asking for any 8.
7. **Tiebreaker.** Eight half-suits resolve 4–4 and `EIGHTS` is the last one standing; whoever wins
   it wins the game 5–4.
