import { createContext, useContext } from 'react'
import type { AudioControls } from '../audio/audio-session'

export const AudioControlsContext = createContext<AudioControls | null>(null)

/** The app's three audio controls. Views use them without owning the engine. */
export function useMorseAudio(): AudioControls {
  const controls = useContext(AudioControlsContext)
  if (!controls) throw new Error('useMorseAudio must be used inside AudioProvider')
  return controls
}

/** Muting cuts anything already sounding. Pure so the app-level policy is testable. */
export function cutOnMute(controls: AudioControls, muted: boolean): void {
  if (muted) controls.stop()
}
