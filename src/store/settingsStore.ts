/** Audio/UX settings (plan §3.5). Persisted to localStorage under 'morse-app:v1'. */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const WPM_MIN = 6
export const WPM_MAX = 45
export const FREQUENCY_MIN_HZ = 400
export const FREQUENCY_MAX_HZ = 1000
export const AUTO_COMMIT_MAX_MS = 3000
export const STORAGE_KEY = 'morse-app:v1'

export type Theme = 'dark' | 'light'

export type SettingsState = {
  wpm: number
  toneHz: number
  volume: number
  muted: boolean
  /** 0 disables auto-commit. */
  autoCommitMs: number
  theme: Theme
}

export const DEFAULT_SETTINGS: SettingsState = {
  wpm: 15,
  toneHz: 600,
  volume: 0.6,
  muted: false,
  autoCommitMs: 700,
  theme: 'dark',
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}

type SettingsActions = {
  setWpm: (wpm: number) => void
  setToneHz: (hz: number) => void
  setVolume: (volume: number) => void
  setMuted: (muted: boolean) => void
  toggleMute: () => void
  setTheme: (theme: Theme) => void
  setAutoCommitMs: (ms: number) => void
  reset: () => void
}

export const useSettingsStore = create<SettingsState & SettingsActions>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      setWpm: (wpm) => set({ wpm: clamp(Math.round(wpm), WPM_MIN, WPM_MAX) }),
      setToneHz: (hz) => set({ toneHz: clamp(Math.round(hz), FREQUENCY_MIN_HZ, FREQUENCY_MAX_HZ) }),
      setVolume: (volume) => set({ volume: clamp(volume, 0, 1) }),
      setMuted: (muted) => set({ muted }),
      toggleMute: () => set((s) => ({ muted: !s.muted })),
      setTheme: (theme) => set({ theme }),
      setAutoCommitMs: (ms) =>
        set({ autoCommitMs: clamp(Math.round(ms), 0, AUTO_COMMIT_MAX_MS) }),
      reset: () => set({ ...DEFAULT_SETTINGS }),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      // Persist only data — never the actions — so stale keys rehydrate cleanly
      partialize: ({ wpm, toneHz, volume, muted, autoCommitMs, theme }) => ({
        wpm,
        toneHz,
        volume,
        muted,
        autoCommitMs,
        theme,
      }),
    },
  ),
)

export const useSettings = useSettingsStore
