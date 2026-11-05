import { describe, expect, it, vi } from 'vitest'
import {
  MorseAudio,
  type MorseAudioOptions,
  morseToTimingEvents,
  scheduleBeep,
  scheduleMorse,
} from '../../src/audio/morse-audio'
import { morseDurationMs } from '../../src/core/timing'
import { FakeAudioContext, asCtx } from './fake-audio'

const opts = { wpm: 15, freq: 600, volume: 0.6 } // dit = 80 ms = 0.08 s

describe('morseToTimingEvents (pure timeline)', () => {
  it('walks dits/dahs with implicit element gaps', () => {
    // wpm 12 → dit = 100 ms
    expect(morseToTimingEvents('.-', 12)).toEqual([
      { kind: 'tone', startMs: 0, durationMs: 100 },
      { kind: 'gap', startMs: 100, durationMs: 100 },
      { kind: 'tone', startMs: 200, durationMs: 300 },
    ])
  })

  it('honors letter (3×dit) and word (7×dit) gaps', () => {
    const events = morseToTimingEvents('.. ---', 12)
    expect(events.find((e) => e.kind === 'gap' && e.durationMs === 300)).toBeDefined()
    const wordEvents = morseToTimingEvents('. / .', 12)
    expect(wordEvents[1]).toEqual({ kind: 'gap', startMs: 100, durationMs: 700 })
    expect(wordEvents[2]).toEqual({ kind: 'tone', startMs: 800, durationMs: 100 })
  })

  it('is empty for blank input and has no trailing gap', () => {
    expect(morseToTimingEvents('   ', 20)).toEqual([])
    expect(morseToTimingEvents('', 20)).toEqual([])
    const events = morseToTimingEvents('.-', 12)
    const last = events[events.length - 1]!
    expect(last.startMs + last.durationMs).toBe(morseDurationMs('.-', 12))
  })
})

describe('scheduleBeep', () => {
  it('creates one sine oscillator with an enveloped gain curve', () => {
    const fake = new FakeAudioContext()
    scheduleBeep(asCtx(fake), {
      when: 2,
      durationMs: 80,
      freq: 600,
      volume: 0.5,
    })
    expect(fake.oscillators).toHaveLength(1)
    expect(fake.gains).toHaveLength(1)
    const osc = fake.oscillators[0]!
    const gain = fake.gains[0]!
    expect(osc.type).toBe('sine')
    expect(osc.frequency.calls.filter((c) => c.fn === 'setValue')).toEqual([
      { fn: 'setValue', value: 600, at: 2 },
    ])
    // connection chain: osc → gain → destination
    expect(osc.connect).toHaveBeenCalledWith(gain)
    expect(gain.connect).toHaveBeenCalledWith(fake.destination)
    // envelope: 0 → volume → release → 0, starting exactly at `when`
    const env = gain.gain.calls
    expect(env[0]).toEqual({ fn: 'setValue', value: 0, at: 2 })
    expect(env[1]!.value).toBe(0.5)
    expect(env[1]!.at).toBeCloseTo(2.005, 10)
    expect(env[2]!.value).toBe(0.5)
    expect(env[3]!.value).toBe(0)
    expect(env[3]!.at).toBeCloseTo(2.08, 10)
    expect(osc.startedAt[0]).toBe(2)
    expect(osc.stoppedAt[0]).toBeCloseTo(2.09, 10) // end + 10 ms tail
  })

  it('keeps the envelope sane for very short beeps', () => {
    const fake = new FakeAudioContext()
    scheduleBeep(asCtx(fake), { when: 0, durationMs: 1, freq: 600, volume: 1 })
    const env = fake.gains[0]!.gain.calls
    expect(env[1]!.at).toBeLessThanOrEqual(env[2]!.at)
    expect(env[2]!.at).toBeLessThanOrEqual(env[3]!.at)
  })
})

describe('scheduleMorse', () => {
  it('schedules per element with implicit gaps, matching PARIS timing', () => {
    const fake = new FakeAudioContext()
    const { beeps, endS } = scheduleMorse(asCtx(fake), '.-', { ...opts, startAt: 10 })
    expect(beeps).toHaveLength(2)
    expect(beeps[0]!.osc.startedAt[0]).toBe(10)
    // second element: gap 1 dit (0.08) after the first dit ends (10.08)
    expect(beeps[1]!.osc.startedAt[0]).toBeCloseTo(10.16, 10)
    // dah lasts 3 dits → message ends at 10.16 + 0.24 = 10.40
    expect(endS).toBeCloseTo(10.4, 10)
    // full audible duration == the timing-module value
    expect((endS - 10) * 1000).toBeCloseTo(morseDurationMs('.-', 15), 6)
  })

  it('honors letter (3×) and word (7×) gaps', () => {
    const fake = new FakeAudioContext()
    const { beeps, endS } = scheduleMorse(asCtx(fake), '. / .', { ...opts, startAt: 0 })
    // dit (0.08) + word gap 7 dits (0.56) → second beep at 0.64
    expect(beeps[1]!.osc.startedAt[0]).toBeCloseTo(0.64, 10)
    expect(endS).toBeCloseTo(0.72, 10)
  })

  it('schedules 9 beeps for SOS and 0 for empty input', () => {
    const fake = new FakeAudioContext()
    expect(scheduleMorse(asCtx(fake), '...---...', { ...opts, startAt: 0 }).beeps).toHaveLength(9)
    const empty = scheduleMorse(asCtx(fake), '', { ...opts, startAt: 0 })
    expect(empty.beeps).toHaveLength(0)
    expect(empty.endS).toBe(0)
  })
})

describe('MorseAudio', () => {
  const makeEngine = (overrides: Partial<MorseAudioOptions> = {}) => {
    const fake = new FakeAudioContext()
    const factory = vi.fn(() => asCtx(fake))
    const options: MorseAudioOptions = { ...opts, muted: false, ...overrides }
    return { fake, factory, options, engine: new MorseAudio(() => options, factory) }
  }

  it('creates one context on the first sound and resumes it when suspended', () => {
    const { fake, factory, engine } = makeEngine()
    expect(factory).not.toHaveBeenCalled()
    engine.play('.-')
    expect(factory).toHaveBeenCalledTimes(1)
    expect(fake.resumeCalls).toBe(1)
    engine.play('.-')
    engine.beep('dit')
    expect(factory).toHaveBeenCalledTimes(1)
    expect(fake.resumeCalls).toBe(1)
  })

  it('schedules one tone per element', () => {
    const { fake, engine } = makeEngine()
    engine.play('...---...')
    expect(fake.oscillators).toHaveLength(9)
  })

  it('reads settings at each sound', () => {
    const { fake, options, engine } = makeEngine({ wpm: 12 })
    engine.play('..')
    const slow = fake.oscillators[1]!.startedAt[0]! - fake.oscillators[0]!.startedAt[0]!
    options.wpm = 24
    engine.play('..')
    const fast = fake.oscillators[3]!.startedAt[0]! - fake.oscillators[2]!.startedAt[0]!
    expect(fast).toBeCloseTo(slow / 2, 10)
  })

  it('makes no sound while muted, and creates no context', () => {
    const { fake, factory, engine } = makeEngine({ muted: true })
    engine.play('...---...')
    engine.beep('dah')
    expect(fake.oscillators).toHaveLength(0)
    expect(factory).not.toHaveBeenCalled()
  })

  it('stop() cuts every pending tone', () => {
    const { fake, engine } = makeEngine()
    engine.play('...---...')
    engine.stop()
    expect(fake.oscillators.filter((osc) => osc.stoppedAt.includes(1.5))).toHaveLength(9)
  })

  it('stop() before any sound does nothing', () => {
    const { factory, engine } = makeEngine()
    engine.stop()
    expect(factory).not.toHaveBeenCalled()
  })

  it('new playback replaces what is playing', () => {
    const { fake, engine } = makeEngine()
    engine.play('...---...')
    const first = fake.oscillators.slice()
    engine.play('.-')
    expect(first.filter((osc) => osc.stoppedAt.includes(1.5))).toHaveLength(first.length)
  })

  it('blank input leaves current playback alone', () => {
    const { fake, engine } = makeEngine()
    engine.play('.-')
    engine.play('   ')
    expect(fake.oscillators.filter((osc) => osc.stoppedAt.includes(1.5))).toHaveLength(0)
  })

  it('a beep starts in the near future', () => {
    const { fake, engine } = makeEngine()
    engine.beep('dit')
    expect(fake.oscillators).toHaveLength(1)
    expect(fake.oscillators[0]!.startedAt[0]).toBeCloseTo(1.51, 10)
  })

  it('a beep cuts playback, because the user\'s input wins', () => {
    const { fake, engine } = makeEngine()
    engine.play('...---...')
    const playback = fake.oscillators.slice()
    engine.beep('dit')
    expect(playback.filter((osc) => osc.stoppedAt.includes(1.5))).toHaveLength(playback.length)
  })

  it('a beep leaves earlier beeps ringing out', () => {
    const { fake, engine } = makeEngine()
    engine.beep('dah')
    engine.beep('dit')
    expect(fake.oscillators[0]!.stoppedAt).not.toContain(1.5)
  })

  it('stop() cuts rapid overlapping beeps', () => {
    const { fake, engine } = makeEngine()
    engine.beep('dit')
    engine.beep('dah')
    engine.beep('dit')
    engine.stop()
    expect(fake.oscillators.filter((osc) => osc.stoppedAt.includes(1.5))).toHaveLength(3)
  })

  it('new playback stops live beeps', () => {
    const { fake, engine } = makeEngine()
    engine.beep('dah')
    const beep = fake.oscillators[0]!
    engine.play('.-')
    expect(beep.stoppedAt).toContain(1.5)
  })
})
