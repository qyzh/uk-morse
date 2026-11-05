/**
 * The board game on the home view: walk the Morse tree to each target before
 * the fuse runs out. A run lasts until the lives are gone. Every element is
 * judged as it's keyed, so a right code needs no commit and a wrong turn costs
 * a life at once. Between runs the board is free to key on. Views only render
 * this state; keying goes through `input`.
 */
import { LETTERS, pickTarget } from '../core/drills'
import type { MorseEntry } from '../core/morse-data'
import { createMorseInput } from '../input/morse-input'
import type { MorseInput, MorseInputGate } from '../input/morse-input'
import type { ProgressState } from '../store/progressStore'

export const START_LIVES = 3
export const FUSE_SEGMENTS = 12

const HIT_END_MS = 350
/** Long enough to read the route and hear most of it. */
const MISS_END_MS = 1400
const HITS_PER_LEVEL = 8
/** Above this level the board stops marking the target. */
const LAST_HINT_LEVEL = 2
const COMBO_PER_MULTIPLIER = 4
const MAX_MULTIPLIER = 5
const BASE_ROUND_MS = 6000
const ROUND_MS_PER_LEVEL = 500
const MIN_ROUND_MS = 2000

export type BoardOutcome = 'hit' | 'wrong' | 'timeout'

export type BoardGameState = {
  phase: 'ready' | 'playing' | 'over'
  /** Null until the first run starts. */
  target: MorseEntry | null
  /** Set once the round is decided, until the next one starts. */
  outcome: BoardOutcome | null
  /** Counts up with each new target. */
  round: number
  hits: number
  score: number
  /** Points the last hit earned. */
  points: number
  /** Consecutive hits in this run. */
  combo: number
  lives: number
  /** Segments left before the round times out. */
  fuse: number
  isRecord: boolean
}

export type BoardGameOptions = {
  /** Applies between runs. In a run every element is judged, so there's nothing to commit. */
  autoCommitMs: () => number
  beep: (kind: 'dit' | 'dah') => void
  /** Sounds a target's code after a miss. */
  play: (morse: string) => void
  progress: Pick<ProgressState, 'recordBoardScore'>
}

export type BoardGame = {
  input: MorseInput
  getState: () => BoardGameState
  subscribe: (listener: () => void) => () => void
  /** Starts a run. Ignored while one is going. */
  start: () => void
  /** Stops all timers. */
  dispose: () => void
}

export const levelOf = (hits: number): number => 1 + Math.floor(hits / HITS_PER_LEVEL)

export const hasHint = (level: number): boolean => level <= LAST_HINT_LEVEL

export const multiplierOf = (combo: number): number =>
  Math.min(MAX_MULTIPLIER, 1 + Math.floor(combo / COMBO_PER_MULTIPLIER))

export const roundMsOf = (level: number): number =>
  Math.max(MIN_ROUND_MS, BASE_ROUND_MS - (level - 1) * ROUND_MS_PER_LEVEL)

/** Each level opens one more ring of the tree: two elements, three, then all. */
const poolOf = (level: number): readonly MorseEntry[] => {
  if (level > 2) return LETTERS
  return LETTERS.filter((entry) => entry.morse.length <= level + 1)
}

export function createBoardGame(options: BoardGameOptions): BoardGame {
  const { beep, play, progress } = options

  let state: BoardGameState = {
    phase: 'ready',
    target: null,
    outcome: null,
    round: 0,
    hits: 0,
    score: 0,
    points: 0,
    combo: 0,
    lives: START_LIVES,
    fuse: FUSE_SEGMENTS,
    isRecord: false,
  }
  let fuseTimer: ReturnType<typeof setInterval> | undefined
  let roundEnd: ReturnType<typeof setTimeout> | undefined
  const listeners = new Set<() => void>()

  const input = createMorseInput({
    autoCommitMs: () => (state.phase === 'playing' ? 0 : options.autoCommitMs()),
    onElement: beep,
    onWordGap: () => start(),
  })

  const gate = (): MorseInputGate =>
    state.phase === 'playing' && state.outcome !== null ? 'held' : 'open'

  const update = (patch: Partial<BoardGameState>) => {
    state = { ...state, ...patch }
    input.setGate(gate())
    for (const listener of listeners) listener()
  }

  const nextRound = (patch: Partial<BoardGameState> = {}) => {
    clearInterval(fuseTimer)
    const next = { ...state, ...patch }
    const level = levelOf(next.hits)
    fuseTimer = setInterval(burnFuse, roundMsOf(level) / FUSE_SEGMENTS)
    update({
      ...patch,
      target: pickTarget(poolOf(level), state.target ?? undefined),
      outcome: null,
      round: state.round + 1,
      fuse: FUSE_SEGMENTS,
    })
  }

  const endRound = () => {
    if (state.lives > 0) {
      nextRound()
      return
    }
    const { isRecord } = progress.recordBoardScore(state.score)
    update({ phase: 'over', outcome: null, isRecord })
  }

  const hit = () => {
    clearInterval(fuseTimer)
    const level = levelOf(state.hits)
    const points = 10 * level * multiplierOf(state.combo)
    roundEnd = setTimeout(endRound, HIT_END_MS)
    update({
      outcome: 'hit',
      hits: state.hits + 1,
      score: state.score + points,
      points,
      combo: state.combo + 1,
    })
  }

  const miss = (outcome: 'wrong' | 'timeout') => {
    clearInterval(fuseTimer)
    roundEnd = setTimeout(endRound, MISS_END_MS)
    update({ outcome, combo: 0, lives: state.lives - 1 })
    play(state.target!.morse)
  }

  const burnFuse = () => {
    if (state.fuse > 1) update({ fuse: state.fuse - 1 })
    else {
      update({ fuse: 0 })
      miss('timeout')
    }
  }

  input.subscribe(() => {
    const buffer = input.getBuffer()
    if (state.phase !== 'playing' || state.outcome !== null || buffer === '') return
    const code = state.target!.morse
    if (buffer === code) hit()
    else if (!code.startsWith(buffer)) miss('wrong')
  })

  const start = () => {
    if (state.phase === 'playing') return
    input.reset()
    nextRound({
      phase: 'playing',
      hits: 0,
      score: 0,
      points: 0,
      combo: 0,
      lives: START_LIVES,
      isRecord: false,
    })
  }

  return {
    input,
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    start,
    dispose() {
      clearInterval(fuseTimer)
      clearTimeout(roundEnd)
      input.dispose()
    },
  }
}
