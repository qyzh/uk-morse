import { useEffect } from 'react'
import { MorseAudio } from '../audio/morse-audio'
import { useSettingsStore } from '../store/settingsStore'

const morseAudio = new MorseAudio(() => {
  const { wpm, toneHz, volume, muted } = useSettingsStore.getState()
  return { wpm, freq: toneHz, volume, muted }
})

useSettingsStore.subscribe((settings) => {
  if (settings.muted) morseAudio.stop()
})

const controls = {
  play: (morse: string) => morseAudio.play(morse),
  beep: (kind: 'dit' | 'dah') => morseAudio.beep(kind),
  stop: () => morseAudio.stop(),
}

/**
 * The app's one MorseAudio, so no two sounds can overlap. The controls never
 * change identity, and leaving a view stops its audio.
 */
export function useMorseAudio() {
  useEffect(() => controls.stop, [])
  return controls
}
