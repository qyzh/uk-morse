import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { createAudioSession } from '../audio/audio-session'
import { useSettingsStore } from '../store/settingsStore'
import { AudioControlsContext, cutOnMute } from './useMorseAudio'

/** Creates the app's one audio session and owns its app-level policies. */
export function AudioProvider({ children }: { children: ReactNode }) {
  const [controls] = useState(() =>
    createAudioSession(() => {
      const { wpm, toneHz, volume, muted } = useSettingsStore.getState()
      return { wpm, toneHz, volume, muted }
    }),
  )

  useEffect(
    () => useSettingsStore.subscribe((settings) => cutOnMute(controls, settings.muted)),
    [controls],
  )

  return <AudioControlsContext.Provider value={controls}>{children}</AudioControlsContext.Provider>
}
