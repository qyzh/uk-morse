import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { decodeCode } from '../../src/core/decode'
import {
  FUSE_SEGMENTS,
  START_LIVES,
  boardViewOf,
  createBoardGame,
  hasHint,
  levelOf,
  multiplierOf,
  roundMsOf,
} from '../../src/practice/board-game'
import type { BoardGame, BoardGameState } from '../../src/practice/board-game'
import type { BoardProgress } from '../../src/practice/progress'

const HIT_END_MS = 350
const MISS_END_MS = 1400

const fakeBoardProgress = () => {
  let best = 0
  const progress: BoardProgress = {
    recordBoardScore: (score) => {
      const isRecord = score > best
      if (isRecord) best = score
      return { isRecord }
    },
  }
  return { progress, best: () => best }
}

const setup = ({ autoCommitMs = 0, progress }: { autoCommitMs?: number; progress?: BoardProgress } = {}) => {
  const play = vi.fn()
  const beep = vi.fn()
  const fake = fakeBoardProgress()
  const game = createBoardGame({
    autoCommitMs: () => autoCommitMs,
    beep,
    play,
    progress: progress ?? fake.progress,
  })
  return { game, play, beep, best: fake.best }
}

const key = (game: BoardGame, code: string) => {
  for (const element of code) {
    if (element === '.') game.input.dit()
    else game.input.dah()
  }
}

const targetCode = (game: BoardGame) => game.getState().target!.morse
const wrongTurn = (game: BoardGame) => (targetCode(game)[0] === '.' ? '-' : '.')

const hit = (game: BoardGame) => {
  key(game, targetCode(game))
  vi.advanceTimersByTime(HIT_END_MS)
}

const miss = (game: BoardGame) => {
  key(game, wrongTurn(game))
  vi.advanceTimersByTime(MISS_END_MS)
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('board game rules', () => {
  it('moves up a level every eight hits', () => {
    expect([0, 7, 8, 16].map(levelOf)).toEqual([1, 1, 2, 3])
  })

  it('marks the target only on the first two levels', () => {
    expect([1, 2, 3].map(hasHint)).toEqual([true, true, false])
  })

  it('raises the multiplier every four hits, up to five', () => {
    expect([0, 3, 4, 16, 40].map(multiplierOf)).toEqual([1, 1, 2, 5, 5])
  })

  it('shortens rounds with each level, down to a floor', () => {
    expect(roundMsOf(1)).toBeGreaterThan(roundMsOf(2))
    expect(roundMsOf(50)).toBe(2000)
  })
})

describe('board game', () => {
  it('waits for a start, with no target', () => {
    const { game } = setup()
    expect(game.getState()).toMatchObject({ phase: 'ready', target: null, lives: START_LIVES })
  })

  it('starts with short codes only', () => {
    const { game } = setup()
    game.start()
    expect(game.getState().phase).toBe('playing')
    expect(targetCode(game).length).toBeLessThanOrEqual(2)
  })

  it('scores a target as soon as its code is complete, without a commit', () => {
    const { game } = setup()
    game.start()
    key(game, targetCode(game))
    expect(game.getState()).toMatchObject({ outcome: 'hit', score: 10, points: 10, combo: 1 })
  })

  it('takes a life on the first wrong turn and sounds the right code', () => {
    const { game, play } = setup()
    game.start()
    const code = targetCode(game)
    key(game, wrongTurn(game))
    expect(game.getState()).toMatchObject({ outcome: 'wrong', lives: START_LIVES - 1, combo: 0 })
    expect(play).toHaveBeenCalledWith(code)
  })

  it('ignores keys until the next round', () => {
    const { game, beep } = setup()
    game.start()
    key(game, targetCode(game))
    beep.mockClear()
    game.input.dit()
    expect(beep).not.toHaveBeenCalled()
    expect(game.getState().score).toBe(10)
  })

  it('starts the next round after a hit', () => {
    const { game } = setup()
    game.start()
    const { target, round } = game.getState()
    hit(game)
    const next = game.getState()
    expect(next.outcome).toBeNull()
    expect(next.round).toBe(round + 1)
    expect(next.target).not.toBe(target)
    expect(next.fuse).toBe(FUSE_SEGMENTS)
  })

  it('burns the fuse and takes a life when it runs out', () => {
    const { game, play } = setup()
    game.start()
    vi.advanceTimersByTime(roundMsOf(1) / FUSE_SEGMENTS)
    expect(game.getState().fuse).toBe(FUSE_SEGMENTS - 1)
    vi.advanceTimersByTime(roundMsOf(1))
    expect(game.getState()).toMatchObject({ outcome: 'timeout', fuse: 0, lives: START_LIVES - 1 })
    expect(play).toHaveBeenCalledOnce()
  })

  it('does not burn the fuse once a round is decided', () => {
    const { game } = setup()
    game.start()
    key(game, targetCode(game))
    const { fuse } = game.getState()
    vi.advanceTimersByTime(HIT_END_MS - 1)
    expect(game.getState().fuse).toBe(fuse)
  })

  it('multiplies points by level and combo', () => {
    const { game } = setup()
    game.start()
    for (let i = 0; i < 8; i++) hit(game)
    expect(levelOf(game.getState().hits)).toBe(2)
    key(game, targetCode(game))
    expect(game.getState().points).toBe(10 * 2 * multiplierOf(8))
  })

  it('opens longer codes on later levels', () => {
    const { game } = setup()
    game.start()
    for (let i = 0; i < 8; i++) hit(game)
    expect(targetCode(game).length).toBeLessThanOrEqual(3)
  })

  it('ends the run with the last life and records the score', () => {
    const { game, best } = setup()
    game.start()
    hit(game)
    for (let i = 0; i < START_LIVES; i++) miss(game)
    expect(game.getState()).toMatchObject({ phase: 'over', outcome: null, lives: 0, score: 10, isRecord: true })
    expect(best()).toBe(10)
  })

  it('does not call a lower score a record', () => {
    const shared = fakeBoardProgress()
    shared.progress.recordBoardScore(500)
    const { game } = setup({ progress: shared.progress })
    game.start()
    for (let i = 0; i < START_LIVES; i++) miss(game)
    expect(game.getState()).toMatchObject({ phase: 'over', isRecord: false })
    expect(shared.best()).toBe(500)
  })

  it('starts a fresh run after one ends', () => {
    const { game } = setup()
    game.start()
    hit(game)
    for (let i = 0; i < START_LIVES; i++) miss(game)
    game.start()
    expect(game.getState()).toMatchObject({
      phase: 'playing',
      score: 0,
      hits: 0,
      combo: 0,
      lives: START_LIVES,
      isRecord: false,
    })
  })

  it('keeps one run going when started twice', () => {
    const { game } = setup()
    game.start()
    const { round } = game.getState()
    game.start()
    expect(game.getState().round).toBe(round)
  })

  it('keys freely between runs, committing on the user\'s wait', () => {
    const { game } = setup({ autoCommitMs: 700 })
    key(game, '-.-')
    expect(game.input.getBuffer()).toBe('-.-')
    vi.advanceTimersByTime(700)
    expect(game.input.getBuffer()).toBe('')
    expect(game.getState().score).toBe(0)
  })

  it('starts a run with Enter', () => {
    const { game } = setup()
    game.input.wordGap()
    expect(game.getState().phase).toBe('playing')
  })

  it('stops everything on dispose', () => {
    const { game } = setup()
    game.start()
    game.dispose()
    const before = game.getState()
    vi.advanceTimersByTime(60_000)
    expect(game.getState()).toBe(before)
  })
})

describe('board view', () => {
  const stateOf = (patch: Partial<BoardGameState> = {}): BoardGameState => ({
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
    ...patch,
  })

  const a = decodeCode('.-')!
  const b = decodeCode('-...')!
  const silent = () => {}

  it('is empty while waiting, with the maxima and no sound', () => {
    expect(boardViewOf(stateOf(), '', 0, silent)).toMatchObject({
      route: '',
      displayChar: null,
      markedChar: null,
      score: 0,
      best: 0,
      level: 1,
      multiplier: 1,
      lives: START_LIVES,
      maxLives: START_LIVES,
      fuse: FUSE_SEGMENTS,
      fuseSegments: FUSE_SEGMENTS,
      sound: null,
    })
  })

  it('lights and decodes the buffer while keying', () => {
    const view = boardViewOf(stateOf({ phase: 'playing', target: a }), '.-', 0, silent)
    expect(view.route).toBe('.-')
    expect(view.displayChar).toBe('A')
    expect(view.markedChar).toBe('A')
  })

  it('lights the decided target instead of the buffer', () => {
    const view = boardViewOf(
      stateOf({ phase: 'playing', target: b, outcome: 'wrong' }),
      '.-',
      0,
      silent,
    )
    expect(view.route).toBe('-...')
    expect(view.displayChar).toBe('B')
  })

  it('marks the target only while hints last', () => {
    const shown = boardViewOf(stateOf({ phase: 'playing', target: a, hits: 0 }), '', 0, silent)
    const hidden = boardViewOf(stateOf({ phase: 'playing', target: a, hits: 16 }), '', 0, silent)
    expect(shown.markedChar).toBe('A')
    expect(hidden.markedChar).toBeNull()
  })

  it('shows the better of the stored and current score', () => {
    expect(boardViewOf(stateOf({ score: 30 }), '', 10, silent).best).toBe(30)
    expect(boardViewOf(stateOf({ score: 10 }), '', 30, silent).best).toBe(30)
  })

  it('sounds only a live target', () => {
    const play = vi.fn()
    expect(boardViewOf(stateOf({ phase: 'ready' }), '', 0, play).sound).toBeNull()
    const view = boardViewOf(stateOf({ phase: 'playing', target: a }), '', 0, play)
    view.sound!()
    expect(play).toHaveBeenCalledWith('.-')
  })
})
