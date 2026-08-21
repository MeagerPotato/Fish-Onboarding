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
    title: 'Six players, two teams',
    body:
      'You play with Mia and Kofi on the Blue team. Ravi, Dana and Sam are Red. Seats ' +
      'alternate, so an opponent sits on each side of you. You can only see your own cards. ' +
      'You learn everything by listening.',
  },
  {
    id: 'the-nine',
    act: 1,
    mode: 'still',
    actions: [],
    title: 'Nine half-suits, five to win',
    body:
      'The deck is 54 cards: a full pack plus both jokers. Everyone gets nine. The cards split ' +
      'into nine sets of six. Each set is a half-suit. Every suit makes two: the low half ' +
      '(2 to 7) and the high half (9 to Ace). That is eight. The ninth is the four 8s plus the ' +
      'two jokers. Each half-suit is worth one point. The first team to win five ends the game ' +
      'on the spot.',
  },

  /* -------------------------------------------------------- act 2: the ask --- */
  {
    id: 'ask-intro',
    act: 2,
    mode: 'still',
    actions: [],
    title: 'Your turn: ask for one card',
    body:
      'On your turn you do one of two things. You ask for a card, or you claim a half-suit. To ' +
      'ask, you name one card and one opponent, out loud. They hand it over, or they say no. ' +
      'There is no drawing and no discarding.',
  },
  {
    id: 'cp1',
    act: 2,
    mode: 'beat',
    actions: [A(0, 1, '5S')],
    title: 'Which ask is allowed?',
    body:
      'An ask must follow four rules. Ask an opponent, never a teammate. Hold a card of that ' +
      'half-suit already. Do not ask for a card you hold. And the player you ask must still have ' +
      'cards.',
    checkpoint: {
      kind: 'ask-choice',
      brief: 'You hold the 2, 3 and 4 of spades. Three of these break a rule.',
      prompt: 'Which ask is allowed?',
      options: [
        {
          target: 2,
          card: '6S',
          note: 'Mia is on your team. You can never ask a teammate for a card.',
        },
        {
          target: 1,
          card: '9D',
          note: 'You hold no high diamond. You can only ask in half-suits you already hold.',
        },
        {
          target: 1,
          card: '2S',
          note: 'The 2 of spades is already in your hand. You cannot ask for a card you hold.',
        },
        {
          target: 1,
          card: '5S',
          note: 'All four rules pass. Ravi is an opponent, you hold low spades, and you lack the 5.',
        },
      ],
      correct: 3,
      reveal:
        'Ravi hands it over. That is a hit, so you go again. The table now knows you hold low ' +
        'spades.',
    },
    expect: { event: 'ask', hit: true, turnAfter: 0 },
  },
  {
    id: 'chain-hit',
    act: 2,
    mode: 'beat',
    actions: [A(0, 1, '8H')],
    title: 'A hit means you go again',
    body:
      'You hold the 8 of clubs and the 8 of diamonds. Both sit in the Eights & Jokers half-suit, ' +
      'so you can ask for any 8 or either joker. You ask Ravi for the 8 of hearts and get it. ' +
      'Two hits, and it is still your turn.',
    expect: { event: 'ask', hit: true, turnAfter: 0 },
  },
  {
    id: 'the-miss',
    act: 2,
    mode: 'beat',
    actions: [A(0, 3, '6S')],
    title: 'A miss ends your turn',
    body:
      'You ask Dana for the 6 of spades. She does not have it, so now it is her turn. Guess ' +
      'wrong and you hand the turn to an opponent. The 6 of spades was with Mia all along. She ' +
      'is your partner, so you can never ask her for it.',
    expect: { event: 'ask', hit: false, turnAfter: 3 },
  },

  /* ----------------------------------------------- act 3: reading the table --- */
  {
    id: 'dana-run',
    act: 3,
    mode: 'montage',
    actions: [A(3, 0, '3S'), A(3, 2, '9S'), A(3, 0, '2H'), A(3, 2, '4S')],
    title: 'Dana’s turn tells you a lot',
    body:
      'Dana gets three hits: your 3 of spades, Mia’s 9 of spades, then your 2 of hearts. She ' +
      'asks Mia for the 4 of spades and misses, so the turn goes to Mia. Everyone saw all of ' +
      'that. You now know Dana holds your 3 of spades. Remember it.',
    expect: { event: 'ask', hit: false, turnAfter: 2 },
  },
  {
    id: 'partners-work',
    act: 3,
    mode: 'montage',
    actions: [A(2, 1, '7S'), A(1, 4, '5H'), A(4, 5, 'RJ'), A(4, 5, 'BJ'), A(4, 1, '2C'), A(1, 0, '5H')],
    title: 'The turn moves, and the table learns',
    body:
      'Mia asks Ravi for the 7 of spades and misses. But she just proved something: she holds a ' +
      'low spade, or she could not have asked at all. Ravi misses too. Kofi takes both jokers ' +
      'from Sam, so you know he has them. Two more misses, and it is your turn again.',
    expect: { event: 'ask', hit: false, turnAfter: 0 },
  },
  {
    id: 'cp2',
    act: 3,
    mode: 'beat',
    actions: [A(0, 3, '3S')],
    title: 'One of these is a sure thing',
    body:
      'Most asks are a guess. Some are not. You watched a card move a moment ago, so you know ' +
      'exactly where it is now.',
    checkpoint: {
      kind: 'ask-choice',
      brief: 'You hold the 2, 4 and 5 of spades.',
      prompt: 'Which ask is certain to work?',
      options: [
        {
          target: 3,
          card: '3S',
          note: 'Right. Dana took this from your hand a moment ago, in front of everyone. It has not moved.',
        },
        {
          target: 5,
          card: '3S',
          note: 'Allowed, but wrong. The 3 went to Dana, not Sam. This would miss and give Sam the turn.',
        },
        {
          target: 3,
          card: '6S',
          note: 'Allowed, but a guess. Nobody has shown you where the 6 of spades is.',
        },
        {
          target: 2,
          card: '3S',
          note: 'Not allowed. Mia is your partner, and you can never ask a partner for a card.',
        },
      ],
      correct: 0,
      reveal:
        'Dana hands it straight back. This is the real game. Every question and every card is ' +
        'public. Good players remember all of it.',
    },
    expect: { event: 'ask', hit: true, turnAfter: 0 },
  },
  {
    id: 'close-the-set',
    act: 3,
    mode: 'beat',
    actions: [A(0, 3, '7S')],
    title: 'One more card',
    body:
      'Dana asked for a low spade earlier, so she had to hold one. Only the 6 and the 7 were ' +
      'unaccounted for. You ask for the 7 and get it. You now hold five of the six low spades. ' +
      'Only the 6 is missing.',
    expect: { event: 'ask', hit: true, turnAfter: 0 },
  },

  /* ------------------------------------------------------ act 4: the claim --- */
  {
    id: 'cp3',
    act: 4,
    mode: 'beat',
    actions: [],
    title: 'Claim the low spades',
    body:
      'Holding cards scores nothing. To win a half-suit you claim it. Name the half-suit, then ' +
      'name who holds each of its six cards. You hold five of them. You have never touched the ' +
      '6 of spades, but the table already told you where it is.',
    checkpoint: {
      kind: 'claim',
      brief: 'Put each card with the player holding it. Blue team only.',
      prompt: 'Who holds each low spade?',
      halfSuit: 'LOW-S',
      deductions: [
        { card: '2S', because: 'In your hand from the start.' },
        { card: '3S', because: 'Dana took it from you, and you took it back.' },
        { card: '4S', because: 'In your hand from the start.' },
        { card: '5S', because: 'Your first ask. You took it from Ravi.' },
        {
          card: '6S',
          because:
            'Mia asked for a low spade, so she holds one. You hold all the others. Hers must be the 6.',
        },
        { card: '7S', because: 'You took it from Dana one ask ago.' },
      ],
      whyWrong:
        'That is the trap. Your team held all six, but one was in the wrong hand. So Red is ' +
        'awarded the half-suit. A claim is not "do we have these". It is "do I know exactly ' +
        'where they are".',
      reveal:
        'All six right. Blue scores it and the cards leave every hand. And it is still your ' +
        'turn. A claim never ends your turn.',
    },
    expect: { event: 'claim', outcome: 'team0', turnAfter: 0, scoreAfter: [1, 0] },
  },
  {
    id: 'two-outcomes',
    act: 4,
    mode: 'still',
    actions: [],
    title: 'A claim is either right or wrong',
    body:
      'You just saw a right one. There is only one other result. If an opponent holds even one ' +
      'of the six, the other team is awarded it. If your team holds all six but you name the ' +
      'wrong hand for one, the other team is awarded it too. Close is not good enough.',
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
    title: 'Skipping ahead',
    body:
      'A real game runs another twenty or thirty asks here. We will jump to the result. Your ' +
      'team wins three more half-suits: low clubs, high clubs and high hearts. Each one is ' +
      'claimed the same way you just did it. Blue 4, Red 0.',
    expect: { event: 'claim', outcome: 'team0', turnAfter: 0, scoreAfter: [4, 0] },
  },
  {
    id: 'forced-miss',
    act: 5,
    mode: 'beat',
    actions: [A(0, 1, '8S')],
    title: 'Sometimes every ask is a bad one',
    body:
      'It is still your turn and you have to ask. You hold only three 8s, so Eights & Jokers is ' +
      'the one half-suit you can ask in. Every card you need is with your partner Kofi, and you ' +
      'cannot ask him. So you ask Ravi and miss on purpose.',
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
    title: 'Red catches up',
    body:
      'Ravi has been listening too. He claims four half-suits in a row and names all twenty-four ' +
      'cards right. A claim never ends your turn, so he never has to stop. Blue 4, Red 4. One ' +
      'half-suit left.',
    expect: { event: 'claim', outcome: 'team1', scoreAfter: [4, 4] },
  },
  {
    id: 'endgame',
    act: 5,
    mode: 'beat',
    actions: [{ type: 'designate', seat: 1, to: 0 }],
    title: 'Red has run out of cards',
    body:
      'Those claims used up every card Red had. When a whole team runs out with half-suits still ' +
      'left, play stops. The team with cards must claim the rest alone, with no help from ' +
      'partners. It was Red’s turn, so Ravi picks who does it. He picks you.',
    expect: { event: 'designate', turnAfter: 0, phaseAfter: 'endgame' },
  },
  {
    id: 'cp4',
    act: 5,
    mode: 'beat',
    actions: [],
    title: 'Claim this one to win',
    body:
      'The score is 4–4, so this half-suit is the tiebreaker. You hold three of the six cards. ' +
      'Kofi holds the other three. You have never seen them, but you can work them out.',
    checkpoint: {
      kind: 'claim',
      brief: 'The four 8s, the red joker and the black joker.',
      prompt: 'Who holds each card of Eights & Jokers?',
      halfSuit: 'EIGHTS',
      deductions: [
        { card: '8C', because: 'In your hand from the start.' },
        { card: '8D', because: 'In your hand from the start.' },
        { card: '8H', because: 'You took it from Ravi with your second ask.' },
        {
          card: '8S',
          because:
            'Kofi asked for the jokers, so he held a card of this half-suit. You hold the other three 8s and both jokers are placed, so his card is the 8 of spades.',
        },
        { card: 'RJ', because: 'Kofi took the red joker from Sam, in front of everyone.' },
        { card: 'BJ', because: 'Kofi took the black joker on his next ask.' },
      ],
      whyWrong:
        'Be careful. This one wins the game. Name one wrong hand and Red is awarded the ' +
        'half-suit instead. That takes them to five, and they win.',
      reveal:
        'All six right. Blue takes Eights & Jokers and wins 5–4. The ninth half-suit broke the ' +
        'tie, which is exactly what it is for.',
    },
    expect: { event: 'claim', outcome: 'team0', phaseAfter: 'finished', scoreAfter: [5, 4] },
  },
  {
    id: 'why-nine',
    act: 5,
    mode: 'still',
    actions: [],
    title: 'Why the 8s and jokers are in',
    body:
      'The standard game removes the four 8s and plays eight half-suits, so 4–4 draws are ' +
      'common. Adding both jokers makes a ninth. Every half-suit always goes to a team, and ' +
      'nine is odd, so someone always reaches five first. A draw cannot happen.',
  },

  /* ------------------------------------------------------- act 6: reference --- */
  {
    id: 'cheat-sheet',
    act: 6,
    mode: 'still',
    actions: [],
    title: 'That is the whole game',
    body:
      'Ask an opponent for one card from a half-suit you hold. Hit and you go again. Miss and ' +
      'the turn is theirs. Claim a half-suit by naming who holds all six cards. First team to ' +
      'five wins. The rest is listening.',
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
