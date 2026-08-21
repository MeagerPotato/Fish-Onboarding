/**
 * The scripted teaching game behind the guide.
 *
 * Every action below is a real `GameAction` replayed through the pure `reduce`, starting
 * from `TUTORIAL_DEAL`. Nothing here is mocked or narrated into existence: if a step says
 * "this hits and you keep the turn", the engine produced that hit and that turn.
 * `tests/tutorial/script.test.ts` replays the whole thing and fails if any annotation,
 * expectation, or checkpoint answer disagrees with what actually happened.
 *
 * Shape of the game (RULES.md §6): eight half-suits resolve 4-4 and Eights & Jokers —
 * the ninth — decides it 5-4. The learner personally makes the winning claim.
 *
 * Every checkpoint is solvable by deduction from the public log. That is a hard
 * requirement, not a nicety: a checkpoint you can only guess at teaches guessing.
 */
import type { Card, GameAction, HalfSuitId, Outcome, Phase, PublicEvent, Seat } from '../../lib/engine/index.ts'

/** Which act a step belongs to. Acts are the guide's five chapters plus the closing card. */
export const ACTS = [
  { id: 1, title: 'The table', goal: 'What you are looking at and what you are trying to win.' },
  { id: 2, title: 'The ask', goal: 'The only move you make on your turn, and the four rules it must obey.' },
  { id: 3, title: 'Reading the table', goal: 'Why every question out loud is the real game.' },
  { id: 4, title: 'The claim', goal: 'How a half-suit is actually won — and the three ways it can end.' },
  { id: 5, title: 'Winning', goal: 'Running out of cards, the endgame, and the ninth half-suit.' },
  { id: 6, title: 'Take it to the table', goal: 'The whole game on one card.' },
] as const

export type ActId = (typeof ACTS)[number]['id']

/**
 * A multiple-choice decision over candidate asks. Exactly one option is correct, and the
 * correct one is always the action the script goes on to play, so the learner's reasoning
 * and the game's history never diverge.
 */
export interface AskChoiceCheckpoint {
  kind: 'ask-choice'
  prompt: string
  /** Short label for why the learner is being asked, shown above the options. */
  brief: string
  options: readonly { target: Seat; card: Card; note: string }[]
  /** Index into `options` of the one correct answer. */
  correct: number
  /** Shown once the learner gets it right. */
  reveal: string
}

/**
 * Place every card of a half-suit with a specific teammate. The correct answer is derived
 * from the engine state at that moment, so it cannot drift; `hint` explains how the learner
 * could have known, and `whyWrong` is shown when they submit a placement that would void.
 */
export interface ClaimCheckpoint {
  kind: 'claim'
  prompt: string
  brief: string
  halfSuit: HalfSuitId
  /** How each card's location is publicly derivable, card by card. */
  deductions: readonly { card: Card; because: string }[]
  whyWrong: string
  reveal: string
}

export type Checkpoint = AskChoiceCheckpoint | ClaimCheckpoint

/** What the engine must produce for a step — asserted by the script test. */
export interface StepExpectation {
  event?: PublicEvent['type']
  hit?: boolean
  outcome?: Outcome
  turnAfter?: Seat
  phaseAfter?: Phase
  scoreAfter?: [number, number]
}

export interface Step {
  id: string
  act: ActId
  /**
   * `beat` — one action, narrated in full.
   * `montage` — several actions at once, summarised; used to compress time honestly.
   * `still` — no action at all; a teaching frame over the current position.
   */
  mode: 'beat' | 'montage' | 'still'
  actions: readonly GameAction[]
  title: string
  body: string
  checkpoint?: Checkpoint
  expect?: StepExpectation
}

const A = (seat: Seat, target: Seat, card: Card): GameAction => ({ type: 'ask', seat, target, card })

export const SCRIPT: readonly Step[] = [
  /* ------------------------------------------------------ act 1: the table --- */
  {
    id: 'welcome',
    act: 1,
    mode: 'still',
    actions: [],
    title: 'Six players, two teams, one deck',
    body:
      'You are Blue, with Mia and Kofi. Red is Ravi, Dana and Sam, and the teams sit alternately ' +
      'round the table. You cannot see anyone else’s cards — not even your own partners’. ' +
      'Everything you learn, you learn out loud.',
  },
  {
    id: 'the-nine',
    act: 1,
    mode: 'still',
    actions: [],
    title: 'Nine half-suits, five to win',
    body:
      '54 cards: a normal pack plus both jokers, dealt nine each. It divides into nine sets of ' +
      'six, called half-suits. Each suit splits in two, low (2 to 7) and high (9 to Ace) — that ' +
      'is eight. The ninth is the odd one out: the four 8s with the red and black jokers. Each ' +
      'half-suit is worth one point, and five wins. Nine is odd on purpose, because with eight a ' +
      '4–4 stalemate is common. That is why the club calls Eights & Jokers the tiebreaking half-suit.',
  },

  /* -------------------------------------------------------- act 2: the ask --- */
  {
    id: 'ask-intro',
    act: 2,
    mode: 'still',
    actions: [],
    title: 'On your turn, you ask for one card',
    body:
      'That is the whole move: name one card and one opponent, out loud, in front of everybody. ' +
      'They hand it over or they say no. No drawing, no discarding, no passing. You ask, or you ' +
      'claim a half-suit. Nothing else.',
  },
  {
    id: 'cp1',
    act: 2,
    mode: 'beat',
    actions: [A(0, 1, '5S')],
    title: 'Your turn — which ask is even allowed?',
    body:
      'An ask must clear four rules: only an opponent, never a teammate; you must already hold a ' +
      'card of that half-suit; never a card already in your hand; and they must still have cards.',
    checkpoint: {
      kind: 'ask-choice',
      brief: 'You hold the 2, 3 and 4 of spades. Three of these break a rule.',
      prompt: 'Which ask is legal?',
      options: [
        {
          target: 2,
          card: '6S',
          note: 'Mia is your partner. You may never ask a teammate — which is what makes partners so hard to use.',
        },
        {
          target: 1,
          card: '9D',
          note: 'You hold no high diamond, so you may not fish there. You can only ask into half-suits you already hold.',
        },
        {
          target: 1,
          card: '2S',
          note: 'The 2 of spades is already yours. Asking for a card in your own hand is never allowed.',
        },
        {
          target: 1,
          card: '5S',
          note: 'Legal on all four counts — an opponent, a half-suit you hold, a card you lack, and Ravi still has cards.',
        },
      ],
      correct: 3,
      reveal:
        'Ravi hands it over. A hit, so the turn stays yours. Notice what the table just learned ' +
        'for free: you hold low spades.',
    },
    expect: { event: 'ask', hit: true, turnAfter: 0 },
  },
  {
    id: 'chain-hit',
    act: 2,
    mode: 'beat',
    actions: [A(0, 1, '8H')],
    title: 'A hit keeps the turn, so you go again',
    body:
      'You hold the 8 of clubs and 8 of diamonds, so you are in Eights & Jokers — 8s and jokers ' +
      'are one half-suit, so an 8 lets you ask for a joker and a joker lets you ask for an 8. ' +
      'You try Ravi for the 8 of hearts. It lands.',
    expect: { event: 'ask', hit: true, turnAfter: 0 },
  },
  {
    id: 'the-miss',
    act: 2,
    mode: 'beat',
    actions: [A(0, 3, '6S')],
    title: 'A miss hands the turn to whoever you asked',
    body:
      'You ask Dana for the 6 of spades. She does not have it, and now the turn is hers. Guess ' +
      'wrong and you hand the initiative to the person you were robbing. Worse: the 6 has been ' +
      'with Mia all along, and you can never ask your own partner for it.',
    expect: { event: 'ask', hit: false, turnAfter: 3 },
  },

  /* ----------------------------------------------- act 3: reading the table --- */
  {
    id: 'dana-run',
    act: 3,
    mode: 'montage',
    actions: [A(3, 0, '3S'), A(3, 2, '9S'), A(3, 0, '2H'), A(3, 2, '4S')],
    title: 'Dana runs, and tells you what she has',
    body:
      'Three hits: your 3 of spades, Mia’s 9 of spades, your 2 of hearts. Then she asks Mia for ' +
      'the 4 of spades, misses, and the turn crosses over. All of it public. You now know for ' +
      'certain that Dana holds your 3 of spades — you watched it go. Remember that.',
    expect: { event: 'ask', hit: false, turnAfter: 2 },
  },
  {
    id: 'partners-work',
    act: 3,
    mode: 'montage',
    actions: [A(2, 1, '7S'), A(1, 4, '5H'), A(4, 5, 'RJ'), A(4, 5, 'BJ'), A(4, 1, '2C'), A(1, 0, '5H')],
    title: 'The turn goes round and the log fills up',
    body:
      'Mia asks Ravi for the 7 of spades and misses — but she has just proved she holds a low ' +
      'spade, or she could not have asked. Ravi misses. Kofi takes both jokers off Sam, so both ' +
      'are certainly his. Two more misses and the turn is back with you. Nobody wrote anything ' +
      'down; everybody heard everything.',
    expect: { event: 'ask', hit: false, turnAfter: 0 },
  },
  {
    id: 'cp2',
    act: 3,
    mode: 'beat',
    actions: [A(0, 3, '3S')],
    title: 'One of these is a certainty, not a guess',
    body:
      'Most asks are a gamble. A few are not. Somewhere in what you just watched is a card whose ' +
      'exact location you know for sure — and which you are allowed to ask for.',
    checkpoint: {
      kind: 'ask-choice',
      brief: 'You hold the 2, 4 and 5 of spades.',
      prompt: 'Which ask is guaranteed to hit?',
      options: [
        {
          target: 3,
          card: '3S',
          note: 'Certain. Dana took this out of your hand a moment ago, in the open, and it has not moved.',
        },
        {
          target: 5,
          card: '3S',
          note: 'Legal but wrong — you watched the 3 go to Dana, not Sam. This misses and hands Sam the turn.',
        },
        {
          target: 3,
          card: '6S',
          note: 'Legal but a pure guess. Nothing public has told you where the 6 of spades is.',
        },
        {
          target: 2,
          card: '3S',
          note: 'Illegal before it is even wrong. Mia is your partner, and partners can never be asked.',
        },
      ],
      correct: 0,
      reveal:
        'Straight back. This is the game underneath the cards: every question and every card ' +
        'handed over is a public record, and the winners are still listening on the twentieth ask.',
    },
    expect: { event: 'ask', hit: true, turnAfter: 0 },
  },
  {
    id: 'close-the-set',
    act: 3,
    mode: 'beat',
    actions: [A(0, 3, '7S')],
    title: 'One more and the set is nearly home',
    body:
      'Dana had to hold a low spade to ask for one, and only the 6 and 7 were unaccounted for. ' +
      'You try the 7 and it comes over. You now hold five of the six low spades. Only the 6 is ' +
      'missing.',
    expect: { event: 'ask', hit: true, turnAfter: 0 },
  },

  /* ------------------------------------------------------ act 4: the claim --- */
  {
    id: 'cp3',
    act: 4,
    mode: 'beat',
    actions: [],
    title: 'Your turn — claim the low spades',
    body:
      'Holding cards scores nothing. To win a half-suit you claim it: name it, then say exactly ' +
      'which player on your team holds each of its six cards — six specific names, and you may not ' +
      'ask your partners. You hold five of the six. The last is the 6 of spades, which you have never touched. But ' +
      'you have been listening, and the table already told you where it is.',
    checkpoint: {
      kind: 'claim',
      brief: 'Place all six with the player actually holding them. Blue team only.',
      prompt: 'Who holds each low spade?',
      halfSuit: 'LOW-S',
      deductions: [
        { card: '2S', because: 'Yours since the deal.' },
        { card: '3S', because: 'Dana took it; you took it straight back.' },
        { card: '4S', because: 'Yours since the deal.' },
        { card: '5S', because: 'Your very first ask, off Ravi.' },
        {
          card: '6S',
          because:
            'Mia asked for the 7 of spades, so she holds a low spade. Every other one is in your hand, so hers is the 6.',
        },
        { card: '7S', because: 'You took it from Dana one ask ago.' },
      ],
      whyWrong:
        'That is the trap. When your team really does hold all six but you put one in the wrong ' +
        'hand, the half-suit is voided — gone from the game, scored by nobody. A claim is not ' +
        '"do we have these", it is "do I know exactly where these are".',
      reveal:
        'All six correct. Blue scores it, the cards leave every hand, and — this surprises people ' +
        '— your turn continues. A claim never costs you the turn, whichever way it goes.',
    },
    expect: { event: 'claim', outcome: 'team0', turnAfter: 0, scoreAfter: [1, 0] },
  },
  {
    id: 'three-outcomes',
    act: 4,
    mode: 'still',
    actions: [],
    title: 'A claim ends in exactly three ways',
    body:
      'You just saw the good one. The other two matter more. If even one card is in an opponent’s ' +
      'hand, the other team scores it — however right the rest were. If your team holds all six ' +
      'but you misplace one, nobody scores and it is gone. Right cards, wrong hands, no points.',
  },

  /* --------------------------------------------------------- act 5: winning --- */
  {
    id: 'blue-locks-in',
    act: 5,
    mode: 'montage',
    actions: [
      { type: 'claim', seat: 0, halfSuit: 'LOW-C', assignments: { '2C': 0, '3C': 0, '4C': 2, '5C': 2, '6C': 4, '7C': 4 } as Record<Card, Seat> },
      { type: 'claim', seat: 0, halfSuit: 'HIGH-C', assignments: { '9C': 2, TC: 2, JC: 2, QC: 4, KC: 4, AC: 4 } as Record<Card, Seat> },
      { type: 'claim', seat: 0, halfSuit: 'HIGH-H', assignments: { '9H': 4, TH: 0, JH: 2, QH: 2, KH: 4, AH: 4 } as Record<Card, Seat> },
    ],
    title: 'The next few minutes, compressed',
    body:
      'A real game now runs another twenty or thirty asks. Skipping to the result: your team ' +
      'converts three more — low clubs, high clubs, high hearts — each claimed exactly the way ' +
      'you just did it. Blue 4, Red 0.',
    expect: { event: 'claim', outcome: 'team0', turnAfter: 0, scoreAfter: [4, 0] },
  },
  {
    id: 'forced-miss',
    act: 5,
    mode: 'beat',
    actions: [A(0, 1, '8S')],
    title: 'Sometimes every legal ask is a bad one',
    body:
      'You still have the turn and must use it. You hold only three 8s, so Eights & Jokers is the ' +
      'one half-suit you may ask into — and every card you are missing is with your partner Kofi, ' +
      'whom you cannot ask. So you ask Ravi, knowing it will miss. That is a normal part of the game.',
    expect: { event: 'ask', hit: false, turnAfter: 1 },
  },
  {
    id: 'red-answers',
    act: 5,
    mode: 'montage',
    actions: [
      { type: 'claim', seat: 1, halfSuit: 'LOW-D', assignments: { '2D': 1, '3D': 1, '4D': 3, '5D': 3, '6D': 5, '7D': 5 } as Record<Card, Seat> },
      { type: 'claim', seat: 1, halfSuit: 'LOW-H', assignments: { '2H': 3, '3H': 1, '4H': 1, '5H': 3, '6H': 3, '7H': 5 } as Record<Card, Seat> },
      { type: 'claim', seat: 1, halfSuit: 'HIGH-D', assignments: { '9D': 1, TD: 1, JD: 3, QD: 3, KD: 5, AD: 5 } as Record<Card, Seat> },
      { type: 'claim', seat: 1, halfSuit: 'HIGH-S', assignments: { '9S': 3, TS: 1, JS: 3, QS: 3, KS: 5, AS: 5 } as Record<Card, Seat> },
    ],
    title: 'Red claims four in a row and levels it',
    body:
      'Ravi has been listening just as hard. Four claims, back to back, all twenty-four cards ' +
      'placed correctly — and because a claim never ends your turn, he never has to stop. ' +
      'Blue 4, Red 4. One half-suit left.',
    expect: { event: 'claim', outcome: 'team1', scoreAfter: [4, 4] },
  },
  {
    id: 'endgame',
    act: 5,
    mode: 'beat',
    actions: [{ type: 'designate', seat: 1, to: 0 }],
    title: 'Red has run out of cards entirely',
    body:
      'Those claims used up every card Red was holding. When a whole team runs dry with ' +
      'half-suits left, play stops and the side that still has cards must claim out the rest ' +
      'alone, with no help from partners. It was Red’s turn, so Ravi picks who does it. He picks you.',
    expect: { event: 'designate', turnAfter: 0, phaseAfter: 'endgame' },
  },
  {
    id: 'cp4',
    act: 5,
    mode: 'beat',
    actions: [],
    title: 'For the game — claim Eights & Jokers',
    body:
      '4–4, and the ninth half-suit decides it. You hold three of the six. The other three are ' +
      'with Kofi, and again you have never seen them — but the table told you everything you need.',
    checkpoint: {
      kind: 'claim',
      brief: 'The four 8s, the red joker and the black joker. Place every one.',
      prompt: 'Who holds each card of Eights & Jokers?',
      halfSuit: 'EIGHTS',
      deductions: [
        { card: '8C', because: 'Yours since the deal.' },
        { card: '8D', because: 'Yours since the deal.' },
        { card: '8H', because: 'You took it off Ravi with your second ask.' },
        {
          card: '8S',
          because:
            'Kofi asked for the jokers, so he already held one of these six. You have the other three 8s and both jokers are placed, so his was the 8 of spades.',
        },
        { card: 'RJ', because: 'Kofi took the red joker off Sam, in the open.' },
        { card: 'BJ', because: 'Kofi took the black joker on the very next ask.' },
      ],
      whyWrong:
        'Careful — this one is for the game. Misplace a card and the half-suit voids: 4–4, and ' +
        'the whole thing ends in the draw this deck exists to prevent.',
      reveal:
        'All six correct. Blue takes Eights & Jokers, 5–4, game over. The ninth half-suit decided ' +
        'it, which is exactly what it is there for.',
    },
    expect: { event: 'claim', outcome: 'team0', phaseAfter: 'finished', scoreAfter: [5, 4] },
  },
  {
    id: 'why-nine',
    act: 5,
    mode: 'still',
    actions: [],
    title: 'Why the 8s and jokers are in the deck',
    body:
      'The standard game throws the 8s away and plays eight half-suits, where 4–4 draws are ' +
      'common and deflating. Adding both jokers makes a ninth and makes the total odd, so a game ' +
      'where every half-suit is won must end 5–4. Only a void can still produce a draw.',
  },

  /* ------------------------------------------------------- act 6: reference --- */
  {
    id: 'cheat-sheet',
    act: 6,
    mode: 'still',
    actions: [],
    title: 'That is the whole game',
    body:
      'Ask an opponent for one card from a half-suit you already hold. Hit and go again; miss and ' +
      'the turn is theirs. Claim by naming where all six cards sit on your side. Five of nine ' +
      'wins. Everything else is listening.',
  },
]

/* --------------------------------------------------------------- pacing --- */

/** Average adult silent reading speed, words per minute. Used for the time budget. */
const WORDS_PER_MINUTE = 200

/**
 * Seconds spent on a step beyond reading its body: watching the table move, or working
 * through a decision. Checkpoints dominate, because placing six cards is slower than
 * reading about placing six cards.
 */
const INTERACTION_SECONDS: Record<Step['mode'], number> = { still: 4, beat: 7, montage: 11 }
const CHECKPOINT_SECONDS = { 'ask-choice': 20, claim: 34 } as const

function countWords(...parts: string[]): number {
  return parts.join(' ').split(/\s+/).filter(Boolean).length
}

/** Words a learner actually has to read on this step, including any checkpoint text. */
export function stepWords(step: Step): number {
  const cp = step.checkpoint
  if (!cp) return countWords(step.title, step.body)
  if (cp.kind === 'ask-choice') {
    return countWords(step.title, step.body, cp.brief, cp.prompt, ...cp.options.map((o) => o.note))
  }
  return countWords(step.title, step.body, cp.brief, cp.prompt, ...cp.deductions.map((d) => d.because))
}

/**
 * The paced budget for a step: reading time plus interaction time.
 *
 * Derived rather than hand-authored on purpose. A hand-set number drifts the moment anyone
 * edits the copy, and then the ten-minute promise quietly becomes a lie. This is a design
 * constraint on how much copy a step may carry. It is not a timer shown to the learner,
 * and nothing in the guide auto-advances.
 */
export function stepSeconds(step: Step): number {
  const reading = (stepWords(step) / WORDS_PER_MINUTE) * 60
  const interaction =
    INTERACTION_SECONDS[step.mode] + (step.checkpoint ? CHECKPOINT_SECONDS[step.checkpoint.kind] : 0)
  return Math.ceil(reading + interaction)
}

/**
 * Two honest numbers rather than one flattering one.
 *
 * TOTAL_SECONDS is the conservative figure: 200 wpm, the rate usually quoted for careful
 * comprehension reading. TOTAL_SECONDS_TYPICAL uses 250 wpm, closer to what people actually
 * do with short second-person copy they are reading alongside a picture. The truth for any
 * given learner is somewhere between the two, and CURRICULUM.md quotes the range, not a point.
 */
export const TOTAL_SECONDS = SCRIPT.reduce((n, s) => n + stepSeconds(s), 0)

export const TOTAL_SECONDS_TYPICAL = SCRIPT.reduce(
  (n, s) => n + Math.ceil((stepWords(s) / 250) * 60 + INTERACTION_SECONDS[s.mode] + (s.checkpoint ? CHECKPOINT_SECONDS[s.checkpoint.kind] : 0)),
  0,
)


/** Steps that require the learner to do something before the guide moves on. */
export const CHECKPOINT_STEPS = SCRIPT.filter((s) => s.checkpoint !== undefined)

export function stepIndexById(id: string): number {
  return SCRIPT.findIndex((s) => s.id === id)
}
