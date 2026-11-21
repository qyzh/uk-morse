import { MorseAudio } from './morse-audio'
import type { AudioContextFactory } from './morse-audio'

export type AudioControls = {
  play: (morse: string) => void
  beep: (kind: 'dit' | 'dah') => void
  stop: () => void
}

export type AudioSettings = {
  wpm: number
  toneHz: number
  volume: number
  muted: boolean
}

/**
 * The app's one sound source, built explicitly so the app seam owns its
 * lifetime. No import-time engine and no subscription: settings are read at
 * each sound by MorseAudio itself.
 */
export function createAudioSession(
  settings: () => AudioSettings,
  createCtx?: AudioContextFactory,
): AudioControls {
  const audio = new MorseAudio(
    () => {
      const { wpm, toneHz, volume, muted } = settings()
      return { wpm, freq: toneHz, volume, muted }
    },
    createCtx,
  )
  return {
    play: (morse) => audio.play(morse),
    beep: (kind) => audio.beep(kind),
    stop: () => audio.stop(),
  }
}
