/** Progress recorder interfaces, owned by the practice domain, not the store. */
export const SPEED_DURATIONS = [30, 60, 120] as const

export type SpeedDuration = (typeof SPEED_DURATIONS)[number]

export type SpeedResult = {
  wpm: number
  /** Best WPM for this duration, including this run. */
  best: number
  isRecord: boolean
}

export type PracticeProgress = {
  recordDrill: (correct: boolean) => void
  recordStreak: (streak: number) => void
  recordSpeedTest: (durationS: SpeedDuration, wpm: number) => SpeedResult
}

export type BoardProgress = {
  recordBoardScore: (score: number) => { isRecord: boolean }
}
