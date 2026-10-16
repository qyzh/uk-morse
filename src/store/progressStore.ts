/** Drill + speed-test progress, persisted separately from settings (plan §3.5). */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { accuracy, wpmOf } from '../core/drills'

const STORAGE_KEY = 'morse-app:progress:v1'

export type SpeedDuration = 30 | 60 | 120

export type ProgressState = {
  /** best WPM achieved per speed-test duration (keyed by duration seconds) */
  bestWpm: Record<SpeedDuration, number>
  /** lifetime drill tally over encode/decode drills */
  drillsCorrect: number
  drillsTotal: number
  bestStreak: number
  recordDrill: (correct: boolean) => void
  recordStreak: (streak: number) => void
  recordSpeedTest: (durationS: SpeedDuration, chars: number) => number
  reset: () => void
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set) => ({
      bestWpm: { 30: 0, 60: 0, 120: 0 },
      drillsCorrect: 0,
      drillsTotal: 0,
      bestStreak: 0,

      recordDrill: (correct) =>
        set((s) => ({
          drillsTotal: s.drillsTotal + 1,
          drillsCorrect: s.drillsCorrect + (correct ? 1 : 0),
        })),

      recordStreak: (streak) =>
        set((s) => ({ bestStreak: Math.max(s.bestStreak, streak) })),

      recordSpeedTest: (durationS, chars) => {
        const wpm = Math.round(wpmOf(chars, durationS))
        set((s) => {
          const current = s.bestWpm[durationS] ?? 0
          if (wpm > current) return { bestWpm: { ...s.bestWpm, [durationS]: wpm } }
          return s
        })
        return wpm
      },

      reset: () =>
        set({ bestWpm: { 30: 0, 60: 0, 120: 0 }, drillsCorrect: 0, drillsTotal: 0, bestStreak: 0 }),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      partialize: ({ bestWpm, drillsCorrect, drillsTotal, bestStreak }) => ({
        bestWpm,
        drillsCorrect,
        drillsTotal,
        bestStreak,
      }),
    },
  ),
)

export function accuracyPercent(state: { drillsCorrect: number; drillsTotal: number }): number {
  return accuracy(state.drillsCorrect, state.drillsTotal)
}
