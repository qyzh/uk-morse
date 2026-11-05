import { beforeEach, describe, expect, it } from 'vitest'
import { useProgressStore } from '../../src/store/progressStore'

const persisted = (): { state: Record<string, unknown> } =>
  JSON.parse(globalThis.localStorage.getItem('morse-app:progress:v1')!) as {
    state: Record<string, unknown>
  }

beforeEach(() => {
  globalThis.localStorage.clear()
  useProgressStore.getState().reset()
})

describe('progress store', () => {
  it('starts empty', () => {
    const s = useProgressStore.getState()
    expect(s.drillsTotal).toBe(0)
    expect(s.drillsCorrect).toBe(0)
    expect(s.bestStreak).toBe(0)
    expect(s.bestWpm).toEqual({ 30: 0, 60: 0, 120: 0 })
  })

  it('records drill answers and computes accuracy', () => {
    const s = useProgressStore.getState()
    s.recordDrill(true)
    s.recordDrill(true)
    s.recordDrill(false)
    const now = useProgressStore.getState()
    expect(now.drillsTotal).toBe(3)
    expect(now.drillsCorrect).toBe(2)
  })

  it('keeps only the best board score and says when it was beaten', () => {
    const s = useProgressStore.getState()
    expect(s.recordBoardScore(40)).toEqual({ isRecord: true })
    expect(s.recordBoardScore(40)).toEqual({ isRecord: false })
    expect(s.recordBoardScore(10)).toEqual({ isRecord: false })
    expect(useProgressStore.getState().bestBoardScore).toBe(40)
    expect(persisted().state.bestBoardScore).toBe(40)
  })

  it('keeps only the best streak', () => {
    const s = useProgressStore.getState()
    s.recordStreak(5)
    s.recordStreak(3)
    s.recordStreak(9)
    expect(useProgressStore.getState().bestStreak).toBe(9)
  })

  it('records speed tests and updates per-duration best WPM', () => {
    const s = useProgressStore.getState()
    // (20 / 5) / 0.5 minutes = 8 WPM
    expect(s.recordSpeedTest(30, 20)).toEqual({ wpm: 8, best: 8, isRecord: true })
    expect(useProgressStore.getState().bestWpm[30]).toBe(8)
    // slower run does not lower the best
    expect(s.recordSpeedTest(30, 10)).toEqual({ wpm: 4, best: 8, isRecord: false })
    expect(useProgressStore.getState().bestWpm[30]).toBe(8)
    // durations are independent
    expect(s.recordSpeedTest(60, 50).wpm).toBe(10)
    expect(useProgressStore.getState().bestWpm[60]).toBe(10)
    expect(useProgressStore.getState().bestWpm[30]).toBe(8)
    expect(s.recordSpeedTest(120, 120).wpm).toBe(12)
    expect(useProgressStore.getState().bestWpm[120]).toBe(12)
  })

  it('does not count equalling the best as a record', () => {
    const s = useProgressStore.getState()
    s.recordSpeedTest(30, 20)
    expect(s.recordSpeedTest(30, 20)).toEqual({ wpm: 8, best: 8, isRecord: false })
  })

  it('does not count an empty run as a record', () => {
    expect(useProgressStore.getState().recordSpeedTest(30, 0)).toEqual({
      wpm: 0,
      best: 0,
      isRecord: false,
    })
  })

  it('persists to localStorage without actions', () => {
    useProgressStore.getState().recordDrill(true)
    useProgressStore.getState().recordSpeedTest(120, 240)
    const state = persisted().state
    expect(state.drillsTotal).toBe(1)
    expect(state.bestWpm).toEqual({ 30: 0, 60: 0, 120: 24 })
    expect(state.recordDrill).toBeUndefined()
  })

  it('reset clears everything', () => {
    const s = useProgressStore.getState()
    s.recordDrill(false)
    s.recordStreak(4)
    s.recordSpeedTest(30, 25)
    useProgressStore.getState().reset()
    expect(useProgressStore.getState().drillsTotal).toBe(0)
    expect(useProgressStore.getState().bestWpm[30]).toBe(0)
    expect(useProgressStore.getState().bestStreak).toBe(0)
  })
})
