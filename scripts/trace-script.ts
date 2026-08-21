/**
 * Print a human-readable trace of the teaching game, step by step.
 * Run with: npm run script:trace
 *
 * This is the tool for authoring the script — it shows every hand, every event and the
 * running score, so a new step can be written against what the engine will actually do
 * rather than against what the author hopes it will do.
 */
import { ALL_HALF_SUITS, seatTeam } from '../lib/engine/index.ts'
import type { GameState, PublicEvent } from '../lib/engine/index.ts'
import { PLAYERS, seatName } from '../src/tutorial/table.ts'
import { SCRIPT, TOTAL_SECONDS } from '../src/tutorial/script.ts'
import { ReplayError, replay } from '../src/tutorial/replay.ts'

function describe(e: PublicEvent): string {
  switch (e.type) {
    case 'game_started':
      return `game starts, ${seatName(e.startingSeat)} to act`
    case 'ask':
      return `${seatName(e.asker)} asks ${seatName(e.target)} for ${e.card} — ${e.hit ? 'HIT' : 'miss'}`
    case 'claim':
      return `${seatName(e.claimer)} claims ${e.halfSuit} — ${e.outcome.toUpperCase()}`
    case 'pass':
      return `${seatName(e.from)} passes the turn to ${seatName(e.to)}`
    case 'designate':
      return `${seatName(e.from)} designates ${seatName(e.to)}`
    case 'player_out':
      return `${seatName(e.seat)} is out of cards`
    case 'endgame':
      return `ENDGAME — team ${e.claimingTeam} must claim out`
    case 'game_over':
      return `GAME OVER — ${e.score[0]}-${e.score[1]}, winner ${e.winner === 'tie' ? 'nobody (tie)' : `team ${e.winner}`}`
  }
}

function hands(s: GameState): string {
  return PLAYERS.map((p) => `    ${p.name.padEnd(5)} (${seatTeam(p.seat) === 0 ? 'Blue' : 'Red '}) ${String(s.hands[p.seat].length).padStart(2)}  ${s.hands[p.seat].join(' ')}`).join('\n')
}

try {
  const frames = replay()
  console.log(`\n=== TEACHING SCRIPT: ${SCRIPT.length} steps, ${TOTAL_SECONDS}s budgeted (${(TOTAL_SECONDS / 60).toFixed(1)} min) ===\n`)
  console.log('Opening deal:')
  console.log(hands(frames[0].before))
  console.log()

  for (const f of frames) {
    const cp = f.step.checkpoint ? `  [CHECKPOINT: ${f.step.checkpoint.kind}]` : ''
    console.log(`--- #${String(f.index).padStart(2)} act${f.step.act} ${f.step.mode.padEnd(7)} ${f.step.id}${cp}`)
    console.log(`    "${f.step.title}"`)
    for (const a of f.applied) {
      const detail =
        a.type === 'ask' ? `${seatName(a.target)} / ${a.card}` : a.type === 'claim' ? a.halfSuit : `-> ${seatName(a.to)}`
      console.log(`    action: ${a.type} by ${seatName(a.seat)} (${detail})`)
    }
    for (const e of f.events) console.log(`      * ${describe(e)}`)
    console.log(
      `    after: turn=${seatName(f.after.turn)} phase=${f.after.phase} score=${f.after.score[0]}-${f.after.score[1]} counts=[${f.after.hands.map((h) => h.length).join(',')}]`,
    )
  }

  const end = frames[frames.length - 1].after
  console.log('\n=== FINAL ===')
  console.log(`phase: ${end.phase}   score: Blue ${end.score[0]} - Red ${end.score[1]}`)
  for (const h of ALL_HALF_SUITS) {
    const r = end.halfSuits[h]
    console.log(`  ${h.padEnd(8)} ${r ? `${r.outcome.padEnd(6)} claimed by ${seatName(r.claimer)}` : 'UNRESOLVED'}`)
  }
  console.log()
} catch (e) {
  if (e instanceof ReplayError) {
    console.error(`\nREPLAY FAILED\n  ${e.message}\n`)
    process.exit(1)
  }
  throw e
}
