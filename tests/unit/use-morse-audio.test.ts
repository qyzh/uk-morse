/**
 * The app's shared audio, wired to the real settings store with a fake
 * AudioContext. Views are rendered on the server, so effects don't run here.
 */
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FakeAudioContext } from './fake-audio'

let contexts: FakeAudioContext[] = []

beforeEach(() => {
  globalThis.localStorage.clear()
  vi.resetModules()
  contexts = []
  vi.stubGlobal(
    'AudioContext',
    class extends FakeAudioContext {
      constructor() {
        super()
        contexts.push(this)
      }
    },
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

async function load() {
  const { useMorseAudio } = await import('../../src/hooks/useMorseAudio')
  const { useSettingsStore } = await import('../../src/store/settingsStore')
  const controlsOfOneView = () => {
    let controls: ReturnType<typeof useMorseAudio> | undefined
    const View = () => {
      controls = useMorseAudio()
      return null
    }
    renderToString(createElement(View))
    return controls!
  }
  return { controlsOfOneView, settings: useSettingsStore }
}

describe('useMorseAudio', () => {
  it('gives every view the same audio context', async () => {
    const { controlsOfOneView } = await load()
    controlsOfOneView().play('.-')
    controlsOfOneView().play('-.')
    expect(contexts).toHaveLength(1)
  })

  it('stops one view\'s playback when another view plays', async () => {
    const { controlsOfOneView } = await load()
    controlsOfOneView().play('...')
    const playing = contexts[0]!.oscillators.slice()
    controlsOfOneView().play('-')
    expect(playing.filter((osc) => osc.stoppedAt.includes(1.5))).toHaveLength(3)
  })

  it('plays with the current settings', async () => {
    const { controlsOfOneView, settings } = await load()
    settings.getState().setToneHz(800)
    controlsOfOneView().play('.')
    expect(contexts[0]!.oscillators[0]!.frequency.calls[0]!.value).toBe(800)
  })

  it('muting cuts what is playing', async () => {
    const { controlsOfOneView, settings } = await load()
    controlsOfOneView().play('...')
    settings.getState().setMuted(true)
    expect(contexts[0]!.oscillators.filter((osc) => osc.stoppedAt.includes(1.5))).toHaveLength(3)
  })

  it('makes no sound while muted', async () => {
    const { controlsOfOneView, settings } = await load()
    settings.getState().setMuted(true)
    const { play, beep } = controlsOfOneView()
    play('...')
    beep('dit')
    expect(contexts).toHaveLength(0)
  })
})
