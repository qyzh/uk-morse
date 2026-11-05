import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPracticeSession } from '../../src/practice/practice-session'
import type { PracticeSession } from '../../src/practice/practice-session'
import { useProgressStore } from '../../src/store/progressStore'

const ROUND_END_MS = 450
const UNKNOWN_CODE = '......'

const setup = ({ autoCommitMs = 0 } = {}) => {
  const stopAudio = vi.fn()
  const beep = vi.fn()
  const session = createPracticeSession({
    autoCommitMs: () => autoCommitMs,
    beep,
    stopAudio,
    progress: useProgressStore.getState(),
  })
  return { session, stopAudio, beep }
}

const keyCode = (session: PracticeSession, code: string) => {
  for (const element of code) {
    if (element === '.') session.input.dit()
    else session.input.dah()
  }
}

const key = (session: PracticeSession, code: string) => {
  keyCode(session, code)
  session.input.commit()
}

/** A code that isn't the current encode or speed target. */
const wrongCode = (targetCode: string) => (targetCode === '.' ? '-' : '.')

const answerEncode = (session: PracticeSession, correct: boolean) => {
  const code = session.getState().encode.target.morse
  key(session, correct ? code : wrongCode(code))
}

const answerDecode = (session: PracticeSession, correct: boolean) => {
  const { char } = session.getState().decode.target
  session.setDecodeAnswer(correct ? char : char === 'A' ? 'B' : 'A')
  session.submitDecodeAnswer()
}

const answerSpeed = (session: PracticeSession, correct: boolean) => {
  const code = session.getState().speed.target.morse
  key(session, correct ? code : wrongCode(code))
}

const keyPress = (key: string) => ({
  key,
  target: null,
  isComposing: false,
  defaultPrevented: false,
})

beforeEach(() => {
  vi.useFakeTimers()
  globalThis.localStorage.clear()
  useProgressStore.getState().reset()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('encode drill', () => {
  it('starts on encode with an empty score', () => {
    const { session } = setup()
    const { mode, encode } = session.getState()
    expect(mode).toBe('encode')
    expect(encode).toMatchObject({ score: 0, total: 0, outcome: null, round: 0 })
    expect(encode.target.category).toBe('letter')
  })

  it('scores a correct answer', () => {
    const { session } = setup()
    answerEncode(session, true)
    expect(session.getState().encode).toMatchObject({ score: 1, total: 1, outcome: 'correct' })
  })

  it('scores a wrong answer', () => {
    const { session } = setup()
    answerEncode(session, false)
    expect(session.getState().encode).toMatchObject({ score: 0, total: 1, outcome: 'wrong' })
  })

  it('counts unknown input as wrong', () => {
    const { session } = setup()
    key(session, UNKNOWN_CODE)
    expect(session.getState().encode).toMatchObject({ score: 0, total: 1, outcome: 'wrong' })
  })

  it('moves to a new target when the round ends', () => {
    const { session, stopAudio } = setup()
    const first = session.getState().encode.target
    answerEncode(session, true)
    vi.advanceTimersByTime(ROUND_END_MS - 1)
    expect(session.getState().encode.target).toBe(first)
    vi.advanceTimersByTime(1)
    const { target, outcome, round } = session.getState().encode
    expect(target).not.toBe(first)
    expect(outcome).toBeNull()
    expect(round).toBe(1)
    expect(stopAudio).toHaveBeenCalledOnce()
  })

  it('never repeats a target in the next round', () => {
    const { session } = setup()
    for (let i = 0; i < 100; i++) {
      const before = session.getState().encode.target
      answerEncode(session, true)
      vi.advanceTimersByTime(ROUND_END_MS)
      expect(session.getState().encode.target).not.toBe(before)
    }
  })

  it('swallows keys and ignores the pad until the round ends', () => {
    const { session } = setup()
    answerEncode(session, true)
    expect(session.input.handleKey(keyPress('ArrowLeft'))).toBe(true)
    session.input.dit()
    session.input.commit()
    expect(session.input.getBuffer()).toBe('')
    expect(session.getState().encode.total).toBe(1)
  })

  it('takes input again in the next round', () => {
    const { session } = setup()
    answerEncode(session, true)
    vi.advanceTimersByTime(ROUND_END_MS)
    answerEncode(session, true)
    expect(session.getState().encode.total).toBe(2)
  })

  it('answers through auto-commit', () => {
    const { session } = setup({ autoCommitMs: 700 })
    keyCode(session, session.getState().encode.target.morse)
    vi.advanceTimersByTime(700)
    expect(session.getState().encode.total).toBe(1)
  })

  it('beeps for each keyed element', () => {
    const { session, beep } = setup()
    session.input.dit()
    session.input.dah()
    expect(beep.mock.calls).toEqual([['dit'], ['dah']])
  })
})

describe('decode drill', () => {
  it('scores a correct answer', () => {
    const { session } = setup()
    session.setMode('decode')
    answerDecode(session, true)
    expect(session.getState().decode).toMatchObject({ score: 1, total: 1, outcome: 'correct' })
  })

  it('scores a wrong answer', () => {
    const { session } = setup()
    session.setMode('decode')
    answerDecode(session, false)
    expect(session.getState().decode).toMatchObject({ score: 0, total: 1, outcome: 'wrong' })
  })

  it('ignores case and surrounding spaces', () => {
    const { session } = setup()
    session.setMode('decode')
    session.setDecodeAnswer(`  ${session.getState().decode.target.char.toLowerCase()} `)
    session.submitDecodeAnswer()
    expect(session.getState().decode.score).toBe(1)
  })

  it('shows the answer in capitals', () => {
    const { session } = setup()
    session.setMode('decode')
    session.setDecodeAnswer('ab')
    expect(session.getState().decodeAnswer).toBe('AB')
  })

  it('ignores a blank answer', () => {
    const { session } = setup()
    session.setMode('decode')
    session.setDecodeAnswer('   ')
    session.submitDecodeAnswer()
    expect(session.getState().decode.total).toBe(0)
  })

  it('counts one answer per round', () => {
    const { session } = setup()
    session.setMode('decode')
    answerDecode(session, true)
    session.submitDecodeAnswer()
    expect(session.getState().decode.total).toBe(1)
  })

  it('clears the answer for the next round', () => {
    const { session } = setup()
    session.setMode('decode')
    const first = session.getState().decode.target
    answerDecode(session, true)
    vi.advanceTimersByTime(ROUND_END_MS)
    const { decode, decodeAnswer } = session.getState()
    expect(decodeAnswer).toBe('')
    expect(decode.target).not.toBe(first)
    expect(decode.round).toBe(1)
  })

  it('leaves the keyboard to the answer box', () => {
    const { session } = setup()
    session.setMode('decode')
    expect(session.input.handleKey(keyPress('ArrowLeft'))).toBe(false)
  })
})

describe('switching mode', () => {
  it('does nothing when the mode is already active', () => {
    const { session, stopAudio } = setup()
    session.setMode('encode')
    expect(stopAudio).not.toHaveBeenCalled()
  })

  it('stops audio', () => {
    const { session, stopAudio } = setup()
    session.setMode('decode')
    expect(stopAudio).toHaveBeenCalled()
  })

  it('throws away a half-keyed letter, so it never scores', () => {
    const { session } = setup({ autoCommitMs: 700 })
    session.input.dit()
    session.setMode('decode')
    session.setMode('encode')
    expect(session.input.getBuffer()).toBe('')
    vi.advanceTimersByTime(700)
    expect(session.getState().encode.total).toBe(0)
  })

  it('finishes a waiting round at once', () => {
    const { session } = setup()
    const first = session.getState().encode.target
    answerEncode(session, true)
    session.setMode('decode')
    const { encode } = session.getState()
    expect(encode.target).not.toBe(first)
    expect(encode.outcome).toBeNull()
  })

  it('leaves no timer behind to cut audio played afterwards', () => {
    const { session, stopAudio } = setup()
    answerEncode(session, true)
    session.setMode('decode')
    stopAudio.mockClear()
    vi.advanceTimersByTime(ROUND_END_MS)
    expect(stopAudio).not.toHaveBeenCalled()
  })

  it('keeps each drill\'s score', () => {
    const { session } = setup()
    answerEncode(session, true)
    session.setMode('decode')
    answerDecode(session, false)
    session.setMode('encode')
    expect(session.getState().encode).toMatchObject({ score: 1, total: 1 })
    expect(session.getState().decode).toMatchObject({ score: 0, total: 1 })
  })

  it('cancels a running speed test with no result', () => {
    const { session } = setup()
    session.setMode('speed')
    session.startSpeedTest()
    answerSpeed(session, true)
    session.setMode('encode')
    expect(session.getState().speed).toMatchObject({ phase: 'ready', result: null })
    expect(session.getState().speed.remainingS).toBe(30)
    expect(useProgressStore.getState().bestWpm[30]).toBe(0)
    vi.advanceTimersByTime(60_000)
    expect(session.getState().speed.phase).toBe('ready')
  })

  it('keeps a finished speed test result', () => {
    const { session } = setup()
    session.setMode('speed')
    session.startSpeedTest()
    vi.advanceTimersByTime(30_000)
    session.setMode('encode')
    session.setMode('speed')
    expect(session.getState().speed.phase).toBe('done')
  })

  it('does not carry a half-keyed letter between speed test and encode', () => {
    const { session } = setup()
    session.setMode('speed')
    session.startSpeedTest()
    session.input.dit()
    session.setMode('encode')
    expect(session.input.getBuffer()).toBe('')
  })
})

describe('speed test', () => {
  it('waits for the start, with the keyboard left to the page', () => {
    const { session } = setup()
    session.setMode('speed')
    expect(session.getState().speed).toMatchObject({ phase: 'ready', durationS: 30, remainingS: 30 })
    expect(session.input.handleKey(keyPress('ArrowLeft'))).toBe(false)
  })

  it('scores right and wrong answers without pausing between targets', () => {
    const { session } = setup()
    session.setMode('speed')
    session.startSpeedTest()
    answerSpeed(session, true)
    answerSpeed(session, false)
    answerSpeed(session, true)
    expect(session.getState().speed).toMatchObject({ score: 2, total: 3 })
  })

  it('never repeats a target straight away', () => {
    const { session } = setup()
    session.setMode('speed')
    session.startSpeedTest()
    for (let i = 0; i < 100; i++) {
      const before = session.getState().speed.target
      answerSpeed(session, true)
      expect(session.getState().speed.target).not.toBe(before)
    }
  })

  it('counts down one second at a time', () => {
    const { session } = setup()
    session.setMode('speed')
    session.startSpeedTest()
    vi.advanceTimersByTime(1000)
    expect(session.getState().speed.remainingS).toBe(29)
    vi.advanceTimersByTime(28_000)
    expect(session.getState().speed.remainingS).toBe(1)
    expect(session.getState().speed.phase).toBe('running')
  })

  it('finishes at zero on the same clock', () => {
    const { session } = setup()
    session.setMode('speed')
    session.startSpeedTest()
    vi.advanceTimersByTime(30_000)
    expect(session.getState().speed).toMatchObject({ phase: 'done', remainingS: 0 })
  })

  it('reports WPM from correct entries only', () => {
    const { session } = setup()
    session.setMode('speed')
    session.startSpeedTest()
    for (let i = 0; i < 10; i++) answerSpeed(session, true)
    answerSpeed(session, false)
    vi.advanceTimersByTime(30_000)
    expect(session.getState().speed.result).toMatchObject({ wpm: 4 })
  })

  it('throws away a half-keyed letter at the end', () => {
    const { session } = setup()
    session.setMode('speed')
    session.startSpeedTest()
    session.input.dit()
    vi.advanceTimersByTime(30_000)
    expect(session.input.getBuffer()).toBe('')
    expect(session.getState().speed.total).toBe(0)
  })

  it('leaves the keyboard to the page once finished', () => {
    const { session } = setup()
    session.setMode('speed')
    session.startSpeedTest()
    vi.advanceTimersByTime(30_000)
    expect(session.input.handleKey(keyPress('ArrowLeft'))).toBe(false)
  })

  it('starts over cleanly', () => {
    const { session } = setup()
    session.setMode('speed')
    session.startSpeedTest()
    answerSpeed(session, true)
    vi.advanceTimersByTime(30_000)
    session.startSpeedTest()
    expect(session.getState().speed).toMatchObject({
      phase: 'running',
      score: 0,
      total: 0,
      remainingS: 30,
      result: null,
    })
  })

  it('runs for the chosen duration', () => {
    const { session } = setup()
    session.setMode('speed')
    session.setSpeedDuration(60)
    expect(session.getState().speed).toMatchObject({ durationS: 60, remainingS: 60 })
    session.startSpeedTest()
    vi.advanceTimersByTime(59_000)
    expect(session.getState().speed.phase).toBe('running')
    vi.advanceTimersByTime(1000)
    expect(session.getState().speed.phase).toBe('done')
  })

  it('reads ready again after choosing a duration', () => {
    const { session } = setup()
    session.setMode('speed')
    session.startSpeedTest()
    vi.advanceTimersByTime(30_000)
    session.setSpeedDuration(120)
    expect(session.getState().speed).toMatchObject({ phase: 'ready', result: null, remainingS: 120 })
  })

  it('keeps its duration while running', () => {
    const { session } = setup()
    session.setMode('speed')
    session.startSpeedTest()
    session.setSpeedDuration(120)
    expect(session.getState().speed).toMatchObject({ durationS: 30, phase: 'running' })
  })
})

describe('progress', () => {
  it('tallies both drills, but not the speed test', () => {
    const { session } = setup()
    answerEncode(session, true)
    vi.advanceTimersByTime(ROUND_END_MS)
    session.setMode('decode')
    answerDecode(session, false)
    vi.advanceTimersByTime(ROUND_END_MS)
    session.setMode('speed')
    session.startSpeedTest()
    answerSpeed(session, true)
    const { drillsCorrect, drillsTotal } = useProgressStore.getState()
    expect({ drillsCorrect, drillsTotal }).toEqual({ drillsCorrect: 1, drillsTotal: 2 })
  })

  it('outlives the session', () => {
    const first = setup().session
    answerEncode(first, true)
    first.dispose()
    const second = setup().session
    expect(second.getState().encode.total).toBe(0)
    expect(useProgressStore.getState().drillsTotal).toBe(1)
  })

  it('counts a streak across both drills', () => {
    const { session } = setup()
    answerEncode(session, true)
    vi.advanceTimersByTime(ROUND_END_MS)
    session.setMode('decode')
    answerDecode(session, true)
    vi.advanceTimersByTime(ROUND_END_MS)
    session.setMode('encode')
    answerEncode(session, true)
    expect(useProgressStore.getState().bestStreak).toBe(3)
  })

  it('restarts the streak after a wrong answer but keeps the best', () => {
    const { session } = setup()
    for (const correct of [true, true, false, true]) {
      answerEncode(session, correct)
      vi.advanceTimersByTime(ROUND_END_MS)
    }
    expect(useProgressStore.getState().bestStreak).toBe(2)
  })

  it('marks a new best WPM', () => {
    const { session } = setup()
    session.setMode('speed')
    session.startSpeedTest()
    for (let i = 0; i < 5; i++) answerSpeed(session, true)
    vi.advanceTimersByTime(30_000)
    expect(session.getState().speed.result).toEqual({ wpm: 2, best: 2, isRecord: true })
    expect(useProgressStore.getState().bestWpm[30]).toBe(2)
  })

  it('does not mark a tie as a record', () => {
    useProgressStore.getState().recordSpeedTest(30, 5)
    const { session } = setup()
    session.setMode('speed')
    session.startSpeedTest()
    for (let i = 0; i < 5; i++) answerSpeed(session, true)
    vi.advanceTimersByTime(30_000)
    expect(session.getState().speed.result).toEqual({ wpm: 2, best: 2, isRecord: false })
  })

  it('keeps a best per duration', () => {
    const { session } = setup()
    session.setMode('speed')
    session.setSpeedDuration(60)
    session.startSpeedTest()
    for (let i = 0; i < 10; i++) answerSpeed(session, true)
    vi.advanceTimersByTime(60_000)
    expect(useProgressStore.getState().bestWpm).toEqual({ 30: 0, 60: 2, 120: 0 })
  })
})

describe('state', () => {
  it('keeps its identity until something changes', () => {
    const { session } = setup()
    const before = session.getState()
    expect(session.getState()).toBe(before)
    answerEncode(session, true)
    expect(session.getState()).not.toBe(before)
  })

  it('tells listeners about changes until they leave', () => {
    const { session } = setup()
    const listener = vi.fn()
    const leave = session.subscribe(listener)
    answerEncode(session, true)
    expect(listener).toHaveBeenCalled()
    listener.mockClear()
    leave()
    vi.advanceTimersByTime(ROUND_END_MS)
    expect(listener).not.toHaveBeenCalled()
  })

  it('stops all timers on dispose', () => {
    const { session, stopAudio } = setup()
    answerEncode(session, true)
    session.dispose()
    vi.advanceTimersByTime(ROUND_END_MS)
    expect(stopAudio).not.toHaveBeenCalled()

    const speed = setup().session
    speed.setMode('speed')
    speed.startSpeedTest()
    speed.dispose()
    vi.advanceTimersByTime(30_000)
    expect(speed.getState().speed.phase).toBe('running')
    expect(useProgressStore.getState().bestWpm[30]).toBe(0)
  })
})
