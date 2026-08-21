/**
 * The teaching script has to stay true to the engine and to CURRICULUM.md.
 *
 * These tests are the reason the guide can promise that nothing in it is hand-waved:
 * every step is replayed through the real reducer, every claim in the copy is checked
 * against the events the engine actually produced, and every checkpoint is proved to be
 * solvable — one correct answer, reachable by deduction, matching what the script then does.
 */
import { describe, expect, it } from 'vitest'
import {
  ALL_HALF_SUITS,
  checkInvariants,
  explainAsk,
  halfSuitCards,
  seatTeam,
  reduce,
  validateDeal,
  describeDealProblem,
  type Seat,
} from '../../lib/engine/index.ts'
import { PLAYERS, TUTORIAL_DEAL, YOU, seatName } from '../../src/tutorial/table.ts'
import { ACTS, SCRIPT, TOTAL_SECONDS, TOTAL_SECONDS_TYPICAL, stepSeconds, type Step } from '../../src/tutorial/script.ts'
import { replay, trueAssignments } from '../../src/tutorial/replay.ts'

const frames = replay()

/* ------------------------------------------------------------------- deal --- */

describe('the teaching deal', () => {
  it('is a legal 54-card deal of 9 cards each', () => {
    const r = validateDeal(TUTORIAL_DEAL.map((h) => [...h]))
    if (!r.ok) throw new Error(r.problems.map(describeDealProblem).join('\n'))
    expect(r.ok).toBe(true)
  })

  it('seats six players alternating by team, with the learner at seat 0', () => {
    expect(PLAYERS).toHaveLength(6)
    expect(YOU).toBe(0)
    expect(PLAYERS[0].isYou).toBe(true)
    for (const p of PLAYERS) expect(p.team).toBe(seatTeam(p.seat))
  })

  it('gives every player a short name that fits a narrow phone layout', () => {
    // docs/MOBILE_SPEC.md derives the claim sheet's segmented control from a 7-char budget.
    for (const p of PLAYERS) expect(p.name.length, `${p.name} is too long`).toBeLessThanOrEqual(7)
    expect(new Set(PLAYERS.map((p) => p.name)).size).toBe(6)
    expect(new Set(PLAYERS.map((p) => p.name[0])).size, 'initials must be distinguishable').toBe(6)
  })
})

/* ----------------------------------------------------------------- replay --- */

describe('the script replays through the real engine', () => {
  it('runs every step without the engine rejecting an action', () => {
    expect(frames).toHaveLength(SCRIPT.length)
  })

  it('holds the engine invariants after every single step', () => {
    for (const f of frames) {
      expect(checkInvariants(f.after), `after "${f.step.id}"`).toEqual([])
    }
  })

  it('ends 5-4 to the learner’s team with all nine half-suits resolved', () => {
    const end = frames[frames.length - 1].after
    expect(end.phase).toBe('finished')
    expect(end.score).toEqual([5, 4])
    expect(Object.keys(end.halfSuits)).toHaveLength(9)
    expect(end.log.at(-1)).toMatchObject({ type: 'game_over', winner: 0, score: [5, 4] })
  })

  it('decides the game on the ninth half-suit, claimed by the learner', () => {
    const end = frames[frames.length - 1].after
    const eights = end.halfSuits['EIGHTS']
    expect(eights?.outcome).toBe('team0')
    expect(eights?.claimer).toBe(YOU)
    // Every other half-suit is resolved before EIGHTS, and they split 4-4.
    const beforeEights = frames.find((f) => f.step.id === 'cp4')?.before
    expect(beforeEights?.score).toEqual([4, 4])
    expect(ALL_HALF_SUITS.filter((h) => !beforeEights?.halfSuits[h])).toEqual(['EIGHTS'])
  })

  it('matches every expectation a step declares', () => {
    for (const f of frames) {
      const e = f.step.expect
      if (!e) {
        expect(f.applied, `"${f.step.id}" declares no expectation so must apply no action`).toHaveLength(0)
        continue
      }
      if (e.event) expect(f.events.some((x) => x.type === e.event), `"${f.step.id}" event`).toBe(true)
      if (e.hit !== undefined) {
        // A montage contains several asks; the expectation describes how the step ENDS.
        const ask = f.events.filter((x) => x.type === 'ask').at(-1)
        expect(ask, `"${f.step.id}" expected an ask`).toBeDefined()
        if (ask?.type === 'ask') expect(ask.hit, `"${f.step.id}" final ask hit`).toBe(e.hit)
      }
      if (e.outcome) {
        const claims = f.events.filter((x) => x.type === 'claim')
        expect(claims.length, `"${f.step.id}" expected a claim`).toBeGreaterThan(0)
        expect(claims.at(-1)).toMatchObject({ outcome: e.outcome })
      }
      if (e.turnAfter !== undefined) expect(f.after.turn, `"${f.step.id}" turn`).toBe(e.turnAfter)
      if (e.phaseAfter) expect(f.after.phase, `"${f.step.id}" phase`).toBe(e.phaseAfter)
      if (e.scoreAfter) expect(f.after.score, `"${f.step.id}" score`).toEqual(e.scoreAfter)
    }
  })

  it('only ever acts on the acting seat’s own turn', () => {
    for (const f of frames) {
      // Re-walk the step's actions so the turn is re-derived after each one, which is what
      // makes this meaningful for montages where the turn changes mid-step.
      let state = f.before
      for (const a of f.applied) {
        expect(a.seat, `"${f.step.id}" acted out of turn`).toBe(state.turn)
        const r = reduce(state, a)
        expect(r.ok, `"${f.step.id}" action rejected on re-walk`).toBe(true)
        if (!r.ok) break
        state = r.state
      }
      expect(state.turn, `"${f.step.id}" re-walk diverged`).toBe(f.after.turn)
    }
  })
})

/* ------------------------------------------------------------ checkpoints --- */

const checkpointSteps = SCRIPT.filter((s) => s.checkpoint)

describe('checkpoints', () => {
  it('has four of them, spread across the guide', () => {
    expect(checkpointSteps).toHaveLength(4)
    expect(checkpointSteps.map((s) => s.id)).toEqual(['cp1', 'cp2', 'cp3', 'cp4'])
  })

  it('every ask-choice checkpoint has exactly one right answer, and the script plays it', () => {
    for (const f of frames) {
      const cp = f.step.checkpoint
      if (cp?.kind !== 'ask-choice') continue

      const verdicts = cp.options.map((o) => explainAsk(f.before, YOU, o.target, o.card, seatName))
      const good = verdicts
        .map((v, i) => ({ v, i }))
        .filter(({ v }) => v.legal && v.wouldHit)
        .map(({ i }) => i)

      expect(good, `"${f.step.id}" must have exactly one legal option that hits`).toEqual([cp.correct])

      // The correct option is precisely the action the script goes on to play.
      const played = f.applied[0]
      expect(played?.type).toBe('ask')
      if (played?.type === 'ask') {
        expect(played.target).toBe(cp.options[cp.correct].target)
        expect(played.card).toBe(cp.options[cp.correct].card)
      }
    }
  })

  it('every wrong option is wrong for the reason its note gives', () => {
    for (const f of frames) {
      const cp = f.step.checkpoint
      if (cp?.kind !== 'ask-choice') continue
      cp.options.forEach((o, i) => {
        if (i === cp.correct) return
        const v = explainAsk(f.before, YOU, o.target, o.card, seatName)
        // A wrong option is either illegal, or legal but a miss. Never a legal hit.
        expect(v.legal && v.wouldHit, `"${f.step.id}" option ${i} is secretly correct`).toBe(false)
        expect(o.note.trim().length, `"${f.step.id}" option ${i} needs an explanation`).toBeGreaterThan(20)
      })
    }
  })

  it('every claim checkpoint is placeable, and its answer wins the half-suit', () => {
    for (const f of frames) {
      const cp = f.step.checkpoint
      if (cp?.kind !== 'claim') continue

      const truth = trueAssignments(f.before, cp.halfSuit)
      const cards = halfSuitCards(cp.halfSuit)

      // Solvable at all: the learner's own team really does hold all six.
      for (const c of cards) {
        expect(seatTeam(truth[c]), `"${f.step.id}": ${c} is not on the learner's team`).toBe(0)
      }
      // And the engine agrees it scores.
      const claim = f.events.find((e) => e.type === 'claim')
      expect(claim, `"${f.step.id}" produced no claim`).toBeDefined()
      if (claim?.type === 'claim') {
        expect(claim.halfSuit).toBe(cp.halfSuit)
        expect(claim.outcome).toBe('team0')
      }
    }
  })

  it('every claim checkpoint explains where all six cards are, and each explanation is true', () => {
    for (const f of frames) {
      const cp = f.step.checkpoint
      if (cp?.kind !== 'claim') continue

      const cards = [...halfSuitCards(cp.halfSuit)]
      const explained = cp.deductions.map((d) => d.card)
      expect([...explained].sort(), `"${f.step.id}" must explain all six cards`).toEqual([...cards].sort())

      const truth = trueAssignments(f.before, cp.halfSuit)
      for (const d of cp.deductions) {
        expect(d.because.trim().length, `"${f.step.id}": ${d.card} needs a reason`).toBeGreaterThan(15)
        // Any name mentioned in the reason must be the actual holder or a player who
        // publicly handled the card — a reason naming the wrong holder is a real bug.
        const holder = seatName(truth[d.card] as Seat)
        const namesOthers = PLAYERS.filter((p) => p.name !== holder && p.name !== 'You')
          .filter((p) => new RegExp(`\\b${p.name}\\b`).test(d.because))
        for (const other of namesOthers) {
          expect(
            /\b(took|from|off|asked|back|handed|hands)\b/.test(d.because),
            `"${f.step.id}": ${d.card} names ${other.name} but does not describe a transfer`,
          ).toBe(true)
        }
      }
    }
  })

  it('a claim checkpoint’s answer is exactly what the replay applies', () => {
    for (const f of frames) {
      const cp = f.step.checkpoint
      if (cp?.kind !== 'claim') continue
      const played = f.applied[0]
      expect(played?.type).toBe('claim')
      if (played?.type === 'claim') {
        expect(played.assignments).toEqual(trueAssignments(f.before, cp.halfSuit))
      }
    }
  })
})

/* ----------------------------------------------------------- curriculum --- */

describe('curriculum constraints', () => {
  it('fits the ten-minute promise for a typical reader, with a bounded worst case', () => {
    // 250 wpm — short second-person copy read alongside a picture.
    expect(TOTAL_SECONDS_TYPICAL).toBeLessThanOrEqual(600)
    // 200 wpm — careful, comprehension-first reading. Allowed to overrun, but not without limit.
    expect(TOTAL_SECONDS).toBeLessThanOrEqual(720)
    expect(TOTAL_SECONDS).toBeGreaterThan(420)
  })

  it('keeps any single step short enough to stay a step', () => {
    for (const s of SCRIPT) {
      const cap = s.checkpoint ? 90 : 35
      expect(stepSeconds(s), `"${s.id}" is too long to be one step`).toBeLessThanOrEqual(cap)
    }
  })

  it('spends most of its time on the parts the learner does, not reads', () => {
    const doing = SCRIPT.filter((s) => s.checkpoint).reduce((n, s) => n + stepSeconds(s), 0)
    expect(doing / TOTAL_SECONDS, 'checkpoints should be a substantial share of the guide').toBeGreaterThan(0.35)
  })

  it('gives every step a positive budget and a non-trivial explanation', () => {
    for (const s of SCRIPT) {
      expect(s.title.trim().length, `"${s.id}" title`).toBeGreaterThan(8)
      expect(s.body.trim().length, `"${s.id}" body`).toBeGreaterThan(60)
    }
  })

  it('covers every act in order, with no gaps', () => {
    const seen = [...new Set(SCRIPT.map((s) => s.act))]
    expect(seen).toEqual(ACTS.map((a) => a.id))
    const acts = SCRIPT.map((s) => s.act)
    expect(acts).toEqual([...acts].sort((a, b) => a - b))
  })

  it('teaches all three claim outcomes and both ask outcomes somewhere in the copy', () => {
    const all = SCRIPT.map((s) => `${s.title} ${s.body}`).join(' ').toLowerCase()
    for (const idea of ['void', 'the other team scores', 'keeps the turn', 'hands the turn']) {
      expect(all, `the guide never explains "${idea}"`).toContain(idea)
    }
  })
})

/* ---------------------------------------------------------- terminology --- */

describe('terminology (RULES.md §0)', () => {
  /** Everything a learner can read, from the script and the act headings. */
  function allCopy(): { where: string; text: string }[] {
    const out: { where: string; text: string }[] = []
    for (const a of ACTS) out.push({ where: `act ${a.id}`, text: `${a.title} ${a.goal}` })
    for (const s of SCRIPT) {
      out.push({ where: s.id, text: `${s.title} ${s.body}` })
      const cp = s.checkpoint
      if (!cp) continue
      out.push({ where: `${s.id}.prompt`, text: `${cp.prompt} ${cp.brief} ${cp.reveal}` })
      if (cp.kind === 'ask-choice') for (const o of cp.options) out.push({ where: `${s.id}.option`, text: o.note })
      else {
        out.push({ where: `${s.id}.whyWrong`, text: cp.whyWrong })
        for (const d of cp.deductions) out.push({ where: `${s.id}.${d.card}`, text: d.because })
      }
    }
    return out
  }

  it('never says "book" anywhere a learner can read it', () => {
    for (const { where, text } of allCopy()) {
      expect(/\bbooks?\b/i.test(text), `"${where}" uses the word "book": ${text.slice(0, 90)}`).toBe(false)
    }
  })

  it('says "half-suit", and says it often', () => {
    const joined = allCopy().map((c) => c.text).join(' ')
    expect(/half-suit/i.test(joined)).toBe(true)
    expect(joined.match(/half-suits?/gi)?.length ?? 0).toBeGreaterThan(12)
  })

  it('has no `book` identifier anywhere in the engine or tutorial source', async () => {
    const { readdirSync, readFileSync, statSync } = await import('node:fs')
    const { join } = await import('node:path')
    const walk = (dir: string): string[] =>
      readdirSync(dir).flatMap((f) => {
        const p = join(dir, f)
        return statSync(p).isDirectory() ? walk(p) : p.endsWith('.ts') || p.endsWith('.tsx') ? [p] : []
      })
    for (const file of [...walk('lib'), ...walk('src')]) {
      const src = readFileSync(file, 'utf8')
      // Allow the word in prose comments; forbid it as an identifier.
      const offenders = src.match(/\b(book|Book|BOOK)[A-Za-z_]*\s*[:=(]/g)
      expect(offenders, `${file} declares a "book" identifier`).toBeNull()
    }
  })
})

/** Small guard so a future edit cannot silently orphan a step. */
describe('script integrity', () => {
  it('has unique step ids', () => {
    const ids = SCRIPT.map((s: Step) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('only attaches actions to steps that are not stills', () => {
    for (const s of SCRIPT) {
      if (s.mode === 'still') expect(s.actions, `"${s.id}"`).toHaveLength(0)
      if (s.mode === 'montage') expect(s.actions.length, `"${s.id}"`).toBeGreaterThan(1)
    }
  })
})
