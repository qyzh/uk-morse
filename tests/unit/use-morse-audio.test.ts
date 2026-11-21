/**
 * The app's shared audio, constructed directly so every test gets its own
 * engine and fake AudioContext. The app-level mute policy is tested through
 * the same helper the provider uses.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createAudioSession } from '../../src/audio/audio-session'
import { cutOnMute } from '../../src/hooks/useMorseAudio'
import { FakeAudioContext } from './fake-audio'

let contexts: FakeAudioContext[] = []
let settings = { wpm: 20, toneHz: 600, volume: 0.5, muted: false }

beforeEach(() => {
  contexts = []
  settings = { wpm: 20, toneHz: 600, volume: 0.5, muted: false }
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

afterEach(() => vi.unstubAllGlobals())

const setup = () => createAudioSession(() => settings)

describe('audio session', () => {
  it('uses one context for every sound', () => {
    const audio = setup()
    audio.play('.-')
    audio.beep('dit')
    expect(contexts).toHaveLength(1)
  })

  it('cuts the previous playback when something new plays', () => {
    const audio = setup()
    audio.play('...')
    const playing = contexts[0]!.oscillators.slice()
    audio.play('-')
    expect(playing.filter((osc) => osc.stoppedAt.includes(1.5))).toHaveLength(3)
  })

  it('plays with the current settings', () => {
    const audio = setup()
    settings.toneHz = 800
    audio.play('.')
    expect(contexts[0]!.oscillators[0]!.frequency.calls[0]!.value).toBe(800)
  })

  it('makes no sound while muted', () => {
    settings.muted = true
    const audio = setup()
    audio.play('...')
    audio.beep('dit')
    expect(contexts).toHaveLength(0)
  })

  it('cuts playback when muted', () => {
    const audio = setup()
    audio.play('...')
    cutOnMute(audio, true)
    expect(contexts[0]!.oscillators.filter((osc) => osc.stoppedAt.includes(1.5))).toHaveLength(3)
  })

  it('leaves playback alone when not muted', () => {
    const audio = setup()
    audio.play('...')
    cutOnMute(audio, false)
    expect(contexts[0]!.oscillators.filter((osc) => osc.stoppedAt.includes(1.5))).toHaveLength(0)
  })
})
