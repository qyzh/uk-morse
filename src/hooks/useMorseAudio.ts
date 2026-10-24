import { useCallback, useEffect, useMemo, useRef } from 'react'
import { MorseAudio, type MorseAudioOptions } from '../audio/morse-audio'
import { useSettingsStore } from '../store/settingsStore'

/**
 * Bridges the MorseAudio engine with the settings store.
 * The context is only created/resumed on the first play (autoplay policy),
 * and playback is driven by the PARIS timing derived from the wpm setting.
 */
export function useMorseAudio() {
  const morseRef = useRef<MorseAudio | null>(null)
  const muted = useSettingsStore((s) => s.muted)
  const wpm = useSettingsStore((s) => s.wpm)
  const freq = useSettingsStore((s) => s.toneHz)
  const volume = useSettingsStore((s) => s.volume)

  const options = useMemo<MorseAudioOptions>(
    () => ({ wpm, freq, volume, muted }),
    [wpm, freq, volume, muted],
  )

  const getEngine = useCallback(() => {
    if (morseRef.current === null) morseRef.current = new MorseAudio()
    return morseRef.current
  }, [])

  /** Schedule a morse string; returns the timeline duration in ms. */
  const play = useCallback(
    (morse: string) => getEngine().playMorse(morse, { ...options, muted: muted || morse.length === 0 }),
    [muted, options, getEngine],
  )

  /** Encode plain text ("hello world") and schedule it. */
  const playChars = useCallback(
    (text: string) => getEngine().playCharSeq(text, { ...options, muted: muted || text.length === 0 }),
    [muted, options, getEngine],
  )

  /** Instant dit/dah feedback for trainer input. */
  const beep = useCallback(
    (ditOrDah: 'dit' | 'dah') => {
      if (muted) return
      getEngine().beepNow(ditOrDah, options)
    },
    [muted, options, getEngine],
  )

  const stop = useCallback(() => {
    morseRef.current?.stop()
  }, [])

  useEffect(() => {
    if (muted) morseRef.current?.stop()
  }, [muted])

  useEffect(() => () => morseRef.current?.stop(), [])

  return { play, playChars, beep, stop, isPlaying: () => morseRef.current?.isPlaying ?? false }
}
