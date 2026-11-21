/**
 * A practice session (plan §3.3): the two drills and the speed test, from
 * entering the Latihan view until leaving it. It owns every rule and timer, so
 * views only render its state. Keying goes through `input`.
 */
import { LETTERS, pickTarget, wpmOf } from '../core/drills'
import type { MorseEntry } from '../core/morse-data'
import { createMorseInput } from '../input/morse-input'
import type { MorseInput } from '../input/morse-input'
import { createSessionRuntime } from './session-runtime'
import type { PracticeProgress, SpeedDuration, SpeedResult } from './progress'

/** How long a round's outcome stays up before the next target. */
const ROUND_END_MS = 450

export type PracticeMode = 'encode' | 'decode' | 'speed'

type DrillName = Exclude<PracticeMode, 'speed'>

export type Drill = {
  target: MorseEntry
  score: number
  total: number
  /** Set once the target is answered. Further answers wait for the next round. */
  outcome: 'correct' | 'wrong' | null
  /** Counts up with each new target. */
  round: number
}

export type SpeedTest = {
  phase: 'ready' | 'running' | 'done'
  durationS: SpeedDuration
  remainingS: number
  target: MorseEntry
  score: number
  total: number
  result: SpeedResult | null
}

export type PracticeState = {
  mode: PracticeMode
  encode: Drill
  decode: Drill
  decodeAnswer: string
  speed: SpeedTest
}

export type PracticeSessionOptions = {
  autoCommitMs: () => number
  beep: (kind: 'dit' | 'dah') => void
  stopAudio: () => void
  progress: PracticeProgress
}

export type PracticeSession = {
  input: MorseInput
  getState: () => PracticeState
  subscribe: (listener: () => void) => () => void
  setMode: (mode: PracticeMode) => void
  setDecodeAnswer: (text: string) => void
  submitDecodeAnswer: () => void
  /** Ignored while a speed test is running. */
  setSpeedDuration: (durationS: SpeedDuration) => void
  startSpeedTest: () => void
  /** Stops all timers. Progress already recorded stays. */
  dispose: () => void
}

export function createPracticeSession(options: PracticeSessionOptions): PracticeSession {
  const { beep, stopAudio, progress } = options

  const newDrill = (): Drill => ({
    target: pickTarget(LETTERS),
    score: 0,
    total: 0,
    outcome: null,
    round: 0,
  })

  let streak = 0
  let waitingDrill: DrillName | null = null
  let endsAt = 0

  const input = createMorseInput({
    autoCommitMs: options.autoCommitMs,
    onElement: beep,
    onCommit: (entry) => {
      if (runtime.getState().mode === 'encode') answerDrill('encode', entry?.char)
      else if (runtime.getState().mode === 'speed') answerSpeedTest(entry)
    },
  })

  const runtime = createSessionRuntime<PracticeState>({
    initialState: {
      mode: 'encode',
      encode: newDrill(),
      decode: newDrill(),
      decodeAnswer: '',
      speed: {
        phase: 'ready',
        durationS: 30,
        remainingS: 30,
        target: pickTarget(LETTERS),
        score: 0,
        total: 0,
        result: null,
      },
    },
    input,
    gate: (state) => {
      if (state.mode === 'encode') return state.encode.outcome === null ? 'open' : 'held'
      if (state.mode === 'speed' && state.speed.phase === 'running') return 'open'
      return 'closed'
    },
  })

  const { getState, subscribe, update, setAfter, clearAfter, setEvery, clearEvery } = runtime

  const drillPatch = (name: DrillName, drill: Drill): Partial<PracticeState> =>
    name === 'encode' ? { encode: drill } : { decode: drill }

  const answerDrill = (name: DrillName, char: string | undefined) => {
    const drill = getState()[name]
    if (drill.outcome !== null) return
    const correct = char === drill.target.char
    streak = correct ? streak + 1 : 0
    progress.recordDrill(correct)
    progress.recordStreak(streak)
    waitingDrill = name
    setAfter(ROUND_END_MS, endRound)
    update(
      drillPatch(name, {
        ...drill,
        score: drill.score + (correct ? 1 : 0),
        total: drill.total + 1,
        outcome: correct ? 'correct' : 'wrong',
      }),
    )
  }

  const endRound = () => {
    if (waitingDrill === null) return
    const name = waitingDrill
    waitingDrill = null
    clearAfter()
    stopAudio()
    const drill = getState()[name]
    update({
      ...drillPatch(name, {
        ...drill,
        target: pickTarget(LETTERS, drill.target),
        outcome: null,
        round: drill.round + 1,
      }),
      ...(name === 'decode' ? { decodeAnswer: '' } : {}),
    })
  }

  const answerSpeedTest = (entry: MorseEntry | null) => {
    const { speed } = getState()
    update({
      speed: {
        ...speed,
        target: pickTarget(LETTERS, speed.target),
        score: speed.score + (entry?.char === speed.target.char ? 1 : 0),
        total: speed.total + 1,
      },
    })
  }

  const finishSpeedTest = () => {
    clearEvery()
    const { speed } = getState()
    update({
      speed: {
        ...speed,
        phase: 'done',
        remainingS: 0,
        result: progress.recordSpeedTest(speed.durationS, wpmOf(speed.score, speed.durationS)),
      },
    })
  }

  const tick = () => {
    const remainingS = Math.ceil((endsAt - Date.now()) / 1000)
    if (remainingS <= 0) finishSpeedTest()
    else update({ speed: { ...getState().speed, remainingS } })
  }

  return {
    input,
    getState,
    subscribe,
    setMode(mode) {
      if (mode === getState().mode) return
      stopAudio()
      endRound()
      input.reset()
      clearEvery()
      const { speed } = getState()
      update({
        mode,
        speed: speed.phase === 'running' ? { ...speed, phase: 'ready', remainingS: speed.durationS } : speed,
      })
    },
    setDecodeAnswer(text) {
      update({ decodeAnswer: text.toUpperCase() })
    },
    submitDecodeAnswer() {
      const guess = getState().decodeAnswer.trim()
      if (guess) answerDrill('decode', guess)
    },
    setSpeedDuration(durationS) {
      const { speed } = getState()
      if (speed.phase === 'running') return
      update({ speed: { ...speed, phase: 'ready', durationS, remainingS: durationS, result: null } })
    },
    startSpeedTest() {
      stopAudio()
      input.reset()
      clearEvery()
      const { speed } = getState()
      endsAt = Date.now() + speed.durationS * 1000
      setEvery(1000, tick)
      update({
        speed: {
          ...speed,
          phase: 'running',
          remainingS: speed.durationS,
          target: pickTarget(LETTERS, speed.target),
          score: 0,
          total: 0,
          result: null,
        },
      })
    },
    dispose: runtime.dispose,
  }
}
