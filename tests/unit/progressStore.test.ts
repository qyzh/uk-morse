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

  it('keeps only the best streak', () => {
    const s = useProgressStore.getState()
    s.recordStreak(5)
    s.recordStreak(3)
    s.recordStreak(9)
    expect(useProgressStore.getState().bestStreak).toBe(9)
  })

  it('records speed tests and updates per-duration best WPM', () => {
    const s = useProgressStore.getState()
    // 20 correct chars in 30s = 4 WPM... wait (20/5)/(0.5)=8
    expect(s.recordSpeedTest(30, 20)).toBe(8)
    expect(useProgressStore.getState().bestWpm[30]).toBe(8)
    // slower run does not lower the best
    expect(s.recordSpeedTest(30, 10)).toBe(4)
    expect(useProgressStore.getState().bestWpm[30]).toBe(8)
    // durations are independent; 120 chars in 120s = (120/5)/2 = 12 WPM
    expect(s.recordSpeedTest(60, 50)).toBe(10)
    expect(useProgressStore.getState().bestWpm[60]).toBe(10)
    expect(useProgressStore.getState().bestWpm[30]).toBe(8)
    expect(s.recordSpeedTest(120, 120)).toBe(12)
    expect(useProgressStore.getState().bestWpm[120]).toBe(12)
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
