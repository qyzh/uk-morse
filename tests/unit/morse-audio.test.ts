import { describe, expect, it, vi } from 'vitest'
import {
  MorseAudio,
  morseToTimingEvents,
  scheduleBeep,
  scheduleMorse,
} from '../../src/audio/morse-audio'
import { morseDurationMs } from '../../src/core/timing'

class FakeParam {
  calls: { fn: string; value: number; at: number }[] = []
  setValueAtTime(value: number, at: number): void {
    this.calls.push({ fn: 'setValue', value, at })
  }
  linearRampToValueAtTime(value: number, at: number): void {
    this.calls.push({ fn: 'ramp', value, at })
  }
}

class FakeOscillator {
  type = ''
  frequency = new FakeParam()
  startedAt: number[] = []
  stoppedAt: number[] = []
  connect = vi.fn((node: unknown) => node)
  start(at?: number): void {
    this.startedAt.push(at ?? 0)
  }
  stop(at?: number): void {
    if (this.startedAt.length === 0) throw new Error('not started')
    this.stoppedAt.push(at ?? 0)
  }
}

class FakeGain {
  gain = new FakeParam()
  connect = vi.fn((node: unknown) => node)
}

class FakeAudioContext {
  currentTime = 1.5
  state = 'suspended'
  destination = { id: 'dest' }
  resumeCalls = 0
  oscillators: FakeOscillator[] = []
  gains: FakeGain[] = []
  resume(): Promise<void> {
    this.resumeCalls++
    this.state = 'running'
    return Promise.resolve()
  }
  createOscillator(): FakeOscillator {
    const osc = new FakeOscillator()
    this.oscillators.push(osc)
    return osc
  }
  createGain(): FakeGain {
    const gain = new FakeGain()
    this.gains.push(gain)
    return gain
  }
}

const asCtx = (fake: FakeAudioContext) => fake as unknown as AudioContext
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
  const makeEngine = () => {
    const fake = new FakeAudioContext()
    const factory = vi.fn(() => fake)
    return { fake, factory, engine: new MorseAudio(factory as unknown as () => AudioContext) }
  }

  it('creates the context lazily and resumes it when suspended', async () => {
    const { fake, factory, engine } = makeEngine()
    expect(factory).not.toHaveBeenCalled()
    expect(engine.isPlaying).toBe(false)
    await engine.playMorse('.-', opts)
    expect(factory).toHaveBeenCalledTimes(1)
    expect(fake.resumeCalls).toBe(1)
    expect(engine.isPlaying).toBe(true)
    // second play reuses the context, no second resume
    await engine.playMorse('.-', opts)
    expect(factory).toHaveBeenCalledTimes(1)
    expect(fake.resumeCalls).toBe(1)
  })

  it('returns the duration of the scheduled message', async () => {
    const { engine } = makeEngine()
    await expect(engine.playMorse('...---...', opts)).resolves.toBe(
      Math.round(morseDurationMs('...---...', 15)),
    )
    await expect(engine.playMorse('', opts)).resolves.toBe(0)
  })

  it('mutes by scheduling nothing but keeps the timeline', async () => {
    const { fake, engine } = makeEngine()
    await expect(engine.playMorse('...---...', { ...opts, muted: true })).resolves.toBe(
      Math.round(morseDurationMs('...---...', 15)),
    )
    expect(fake.oscillators).toHaveLength(0)
    expect(engine.isPlaying).toBe(false)
  })

  it('stop() cuts pending tones and clears isPlaying', async () => {
    const { fake, engine } = makeEngine()
    await engine.playMorse('...---...', opts)
    expect(fake.oscillators.length).toBeGreaterThan(0)
    engine.stop()
    // every scheduled oscillator is re-stopped at the current audio time
    const cut = fake.oscillators.filter((osc) => osc.stoppedAt.includes(1.5))
    expect(cut.length).toBe(fake.oscillators.length)
    expect(engine.isPlaying).toBe(false)
  })

  it('a second play stops the tones of the first', async () => {
    const { fake, engine } = makeEngine()
    await engine.playMorse('...---...', opts)
    const first = fake.oscillators.slice()
    await engine.playMorse('.-', opts)
    const cut = first.filter((osc) => osc.stoppedAt.includes(1.5))
    expect(cut.length).toBe(first.length)
  })

  it('playCharSeq encodes plain text and schedules it', async () => {
    const { fake, engine } = makeEngine()
    // 'E E' → '. / .' → one dit per letter, word gap in between
    await expect(engine.playCharSeq('E E', opts)).resolves.toBe(
      Math.round(morseDurationMs('. / .', 15)),
    )
    expect(fake.oscillators).toHaveLength(2)
    // 'sos' → '... --- ...' → 9 tones
    await expect(engine.playCharSeq('sos', opts)).resolves.toBe(
      Math.round(morseDurationMs('... --- ...', 15)),
    )
    expect(fake.oscillators).toHaveLength(2 + 9)
  })

  it('beepNow schedules a tone starting in the near future', async () => {
    const { fake, engine } = makeEngine()
    engine.beepNow('dit', opts)
    expect(fake.oscillators).toHaveLength(1)
    expect(fake.oscillators[0]!.startedAt[0]).toBeCloseTo(1.51, 10)
  })

  it('isPlaying is false before the first play', () => {
    const { engine } = makeEngine()
    expect(engine.isPlaying).toBe(false)
    engine.stop() // no-op without a context
    expect(engine.isPlaying).toBe(false)
  })
})
