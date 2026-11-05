/** Drill + speed-test progress, persisted separately from settings (plan §3.5). */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { wpmOf } from '../core/drills'

const STORAGE_KEY = 'morse-app:progress:v1'

export const SPEED_DURATIONS = [30, 60, 120] as const

export type SpeedDuration = (typeof SPEED_DURATIONS)[number]

export type SpeedResult = {
  wpm: number
  /** Best WPM for this duration, including this run. */
  best: number
  isRecord: boolean
}

export type ProgressState = {
  /** best WPM achieved per speed-test duration (keyed by duration seconds) */
  bestWpm: Record<SpeedDuration, number>
  /** lifetime drill tally over encode/decode drills */
  drillsCorrect: number
  drillsTotal: number
  bestStreak: number
  bestBoardScore: number
  recordDrill: (correct: boolean) => void
  recordStreak: (streak: number) => void
  recordSpeedTest: (durationS: SpeedDuration, chars: number) => SpeedResult
  recordBoardScore: (score: number) => { isRecord: boolean }
  reset: () => void
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      bestWpm: { 30: 0, 60: 0, 120: 0 },
      drillsCorrect: 0,
      drillsTotal: 0,
      bestStreak: 0,
      bestBoardScore: 0,

      recordDrill: (correct) =>
        set((s) => ({
          drillsTotal: s.drillsTotal + 1,
          drillsCorrect: s.drillsCorrect + (correct ? 1 : 0),
        })),

      recordStreak: (streak) =>
        set((s) => ({ bestStreak: Math.max(s.bestStreak, streak) })),

      recordSpeedTest: (durationS, chars) => {
        const wpm = Math.round(wpmOf(chars, durationS))
        const previousBest = get().bestWpm[durationS]
        const isRecord = wpm > previousBest
        if (isRecord) set((s) => ({ bestWpm: { ...s.bestWpm, [durationS]: wpm } }))
        return { wpm, best: Math.max(wpm, previousBest), isRecord }
      },

      recordBoardScore: (score) => {
        const isRecord = score > get().bestBoardScore
        if (isRecord) set({ bestBoardScore: score })
        return { isRecord }
      },

      reset: () =>
        set({
          bestWpm: { 30: 0, 60: 0, 120: 0 },
          drillsCorrect: 0,
          drillsTotal: 0,
          bestStreak: 0,
          bestBoardScore: 0,
        }),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      partialize: ({ bestWpm, drillsCorrect, drillsTotal, bestStreak, bestBoardScore }) => ({
        bestWpm,
        drillsCorrect,
        drillsTotal,
        bestStreak,
        bestBoardScore,
      }),
    },
  ),
)
