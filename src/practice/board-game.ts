/**
 * The board game on the home view: walk the Morse tree to each target before
 * the fuse runs out. A run lasts until the lives are gone. Every element is
 * judged as it's keyed, so a right code needs no commit and a wrong turn costs
 * a life at once. Between runs the board is free to key on. Views only render
 * this state; keying goes through `input`.
 */
import { decodeCode } from '../core/decode'
import { LETTERS, pickTarget } from '../core/drills'
import type { MorseEntry } from '../core/morse-data'
import { createMorseInput } from '../input/morse-input'
import type { MorseInput } from '../input/morse-input'
import { createSessionRuntime } from './session-runtime'
import type { BoardProgress } from './progress'

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
  progress: BoardProgress
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

/** Everything MorseBoard draws, derived from a run and its view-side inputs. */
export type BoardView = {
  /** The code to light, element by element from the antenna. */
  route: string
  displayChar: string | null
  /** A target to mark on the tree, when the level gives that hint. */
  markedChar: string | null
  score: number
  best: number
  level: number
  multiplier: number
  lives: number
  maxLives: number
  fuse: number
  fuseSegments: number
  /** Sounds the target. Null when there is no live target. */
  sound: (() => void) | null
}

/** The run-to-board mapping, testable without React or SVG. */
export function boardViewOf(
  state: BoardGameState,
  buffer: string,
  best: number,
  play: (morse: string) => void,
): BoardView {
  const { phase, target, outcome, score, combo, lives, fuse, hits } = state
  const playing = phase === 'playing'
  const level = levelOf(hits)
  const liveTarget = playing ? target : null
  return {
    route: outcome === null ? buffer : (target?.morse ?? ''),
    displayChar: liveTarget?.char ?? (buffer ? (decodeCode(buffer)?.char ?? null) : null),
    markedChar: liveTarget && hasHint(level) ? liveTarget.char : null,
    score,
    best: Math.max(best, score),
    level,
    multiplier: multiplierOf(combo),
    lives,
    maxLives: START_LIVES,
    fuse,
    fuseSegments: FUSE_SEGMENTS,
    sound: liveTarget ? () => play(liveTarget.morse) : null,
  }
}

export function createBoardGame(options: BoardGameOptions): BoardGame {
  const { beep, play, progress } = options

  const input = createMorseInput({
    autoCommitMs: () => (runtime.getState().phase === 'playing' ? 0 : options.autoCommitMs()),
    onElement: beep,
    onWordGap: () => start(),
  })

  const runtime = createSessionRuntime<BoardGameState>({
    initialState: {
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
    },
    input,
    gate: (state) => (state.phase === 'playing' && state.outcome !== null ? 'held' : 'open'),
  })

  const { getState, subscribe, update, setAfter, setEvery, clearEvery, dispose } = runtime

  const nextRound = (patch: Partial<BoardGameState> = {}) => {
    const state = getState()
    const next = { ...state, ...patch }
    const level = levelOf(next.hits)
    setEvery(roundMsOf(level) / FUSE_SEGMENTS, burnFuse)
    update({
      ...patch,
      target: pickTarget(poolOf(level), state.target ?? undefined),
      outcome: null,
      round: state.round + 1,
      fuse: FUSE_SEGMENTS,
    })
  }

  const endRound = () => {
    if (getState().lives > 0) {
      nextRound()
      return
    }
    const { isRecord } = progress.recordBoardScore(getState().score)
    update({ phase: 'over', outcome: null, isRecord })
  }

  const hit = () => {
    clearEvery()
    const { hits, combo, score } = getState()
    const level = levelOf(hits)
    const points = 10 * level * multiplierOf(combo)
    setAfter(HIT_END_MS, endRound)
    update({
      outcome: 'hit',
      hits: hits + 1,
      score: score + points,
      points,
      combo: combo + 1,
    })
  }

  const miss = (outcome: 'wrong' | 'timeout') => {
    clearEvery()
    setAfter(MISS_END_MS, endRound)
    const { lives, target } = getState()
    update({ outcome, combo: 0, lives: lives - 1 })
    play(target!.morse)
  }

  const burnFuse = () => {
    const { fuse } = getState()
    if (fuse > 1) update({ fuse: fuse - 1 })
    else {
      update({ fuse: 0 })
      miss('timeout')
    }
  }

  input.subscribe(() => {
    const buffer = input.getBuffer()
    const state = getState()
    if (state.phase !== 'playing' || state.outcome !== null || buffer === '') return
    const code = state.target!.morse
    if (buffer === code) hit()
    else if (!code.startsWith(buffer)) miss('wrong')
  })

  const start = () => {
    if (getState().phase === 'playing') return
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
    getState,
    subscribe,
    start,
    dispose,
  }
}
