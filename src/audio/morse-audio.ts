/** Web Audio morse scheduler (PLAN.md §3.4, §7.5). */
import { DAH_UNITS, ditMs, morseDurationMs, morseElements } from '../core/timing'
import { encodeText } from '../core/encode'

export type AudioContextFactory = () => AudioContext

/** Tone options: freq = oscillator Hz, volume = 0–1 linear gain. */
export type MorseAudioOptions = {
  wpm: number
  freq: number
  volume: number
  /** Compute/return the timeline but schedule no nodes. */
  muted?: boolean
}

export type TimingEvent = {
  kind: 'tone' | 'gap'
  /** Offset from playback start, ms. */
  startMs: number
  durationMs: number
}

/**
 * Pure timing walk of a morse string ('.'/'-' elements, ' ' letter gap,
 * '/' word gap) → alternating tone/gap events in ms. Gap events are only
 * emitted for real separator gaps; the implicit 1-dit element gap comes from
 * morseElements. No trailing gap after the last element.
 */
export function morseToTimingEvents(morse: string, wpm: number): TimingEvent[] {
  const dit = ditMs(wpm)
  const events: TimingEvent[] = []
  let cursor = 0
  for (const el of morseElements(morse)) {
    const gapMs = el.gapUnitsBefore * dit
    const toneMs = (el.kind === 'dah' ? DAH_UNITS : 1) * dit
    if (gapMs > 0) events.push({ kind: 'gap', startMs: cursor, durationMs: gapMs })
    events.push({ kind: 'tone', startMs: cursor + gapMs, durationMs: toneMs })
    cursor += gapMs + toneMs
  }
  return events
}

const ATTACK_S = 0.005
const RELEASE_S = 0.005
const TAIL_S = 0.01
const LEAD_IN_S = 0.01

export type ScheduledBeep = {
  osc: OscillatorNode
  gain: GainNode
  endS: number
}

export function scheduleBeep(
  ctx: AudioContext,
  { when, durationMs, freq, volume }: { when: number; durationMs: number; freq: number; volume: number },
): ScheduledBeep {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(freq, when)

  const dur = Math.max(durationMs, 1) / 1000
  const attack = Math.min(ATTACK_S, dur / 4)
  const release = Math.min(RELEASE_S, dur / 4)
  const endS = when + dur
  gain.gain.setValueAtTime(0, when)
  gain.gain.linearRampToValueAtTime(volume, when + attack)
  gain.gain.setValueAtTime(volume, endS - release)
  gain.gain.linearRampToValueAtTime(0, endS)

  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(when)
  osc.stop(endS + TAIL_S)
  return { osc, gain, endS }
}

export type ScheduleResult = {
  beeps: ScheduledBeep[]
  /** Absolute context time of the last tone's end, in seconds. */
  endS: number
}

export function scheduleMorse(
  ctx: AudioContext,
  morse: string,
  opts: MorseAudioOptions & { startAt: number },
): ScheduleResult {
  const events = morseToTimingEvents(morse, opts.wpm)
  const beeps: ScheduledBeep[] = []
  for (const ev of events) {
    if (ev.kind !== 'tone') continue
    beeps.push(
      scheduleBeep(ctx, {
        when: opts.startAt + ev.startMs / 1000,
        durationMs: ev.durationMs,
        freq: opts.freq,
        volume: opts.volume,
      }),
    )
  }
  const totalMs = events.reduce((acc, ev) => Math.max(acc, ev.startMs + ev.durationMs), 0)
  return { beeps, endS: opts.startAt + totalMs / 1000 }
}

export class MorseAudio {
  private createCtx: AudioContextFactory
  private ctx: AudioContext | null = null
  private scheduled: ScheduledBeep[] = []
  private endTimer: ReturnType<typeof setTimeout> | null = null
  isPlaying = false

  constructor(createCtx: AudioContextFactory = () => new AudioContext()) {
    this.createCtx = createCtx
  }

  get context(): AudioContext | null {
    return this.ctx
  }

  /** Lazy-create/resume the AudioContext; call within a user gesture (plan §11 autoplay). */
  start(): AudioContext {
    if (!this.ctx) this.ctx = this.createCtx()
    if (this.ctx.state === 'suspended') void this.ctx.resume()
    return this.ctx
  }

  /**
   * Schedule a morse string ('.- -... / word' form).
   * Returns the morse timeline duration in ms (tones + gaps), so callers can
   * sync visuals (plan §3.1). Muted playback returns the same duration but
   * schedules no nodes. Overlapping calls stop the previous playback first.
   */
  async play(morse: string, opts: MorseAudioOptions): Promise<number> {
    const timelineMs = Math.round(morseDurationMs(morse, opts.wpm))
    if (morseElements(morse).length === 0) return 0
    this.stop()
    if (opts.muted) return timelineMs
    const ctx = this.start()
    this.isPlaying = true
    const { beeps } = scheduleMorse(ctx, morse, { ...opts, startAt: ctx.currentTime + LEAD_IN_S })
    this.scheduled = this.scheduled.filter((b) => b.endS > ctx.currentTime).concat(beeps)
    this.endTimer = setTimeout(() => {
      this.isPlaying = false
      this.endTimer = null
    }, timelineMs + LEAD_IN_S * 1000)
    return timelineMs
  }

  /** Convenience: encode plain text ("hello world") then schedule it. */
  async playCharSeq(text: string, opts: MorseAudioOptions): Promise<number> {
    return this.play(encodeText(text), opts)
  }

  /** Play a single dit/dah — instant feedback for trainer input (plan §3.1). */
  beepNow(ditOrDah: 'dit' | 'dah', opts: MorseAudioOptions): void {
    const ctx = this.start()
    const now = ctx.currentTime
    this.scheduled = this.scheduled.filter((b) => b.endS > now)
    const dur = ditOrDah === 'dah' ? DAH_UNITS * ditMs(opts.wpm) : ditMs(opts.wpm)
    this.scheduled.push(
      scheduleBeep(ctx, {
        when: now + LEAD_IN_S,
        durationMs: dur,
        freq: opts.freq,
        volume: opts.volume,
      }),
    )
  }

  /** Alias matching the trainer/dictionary call-site and tests. */
  async playMorse(morse: string, opts: MorseAudioOptions): Promise<number> {
    return this.play(morse, opts)
  }

  stop(): void {
    if (this.endTimer !== null) {
      clearTimeout(this.endTimer)
      this.endTimer = null
    }
    if (!this.ctx) return
    const now = this.ctx.currentTime
    for (const beep of this.scheduled.splice(0)) {
      try {
        beep.osc.stop(now)
      } catch {
        // already stopped
      }
    }
    this.isPlaying = false
  }
}
