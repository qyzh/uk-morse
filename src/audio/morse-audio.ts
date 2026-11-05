/** Web Audio morse scheduler (PLAN.md §3.4, §7.5). */
import { DAH_UNITS, ditMs, morseElements } from '../core/timing'

export type AudioContextFactory = () => AudioContext

/** Tone options: freq = oscillator Hz, volume = 0–1 linear gain. */
export type MorseAudioOptions = {
  wpm: number
  freq: number
  volume: number
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

/**
 * The app's sound source. New playback replaces whatever is sounding, and a
 * beep cuts playback because the user's input wins. Settings are read at each
 * sound, so nothing is cached between them. The context is created on the
 * first sound, which must come from a user gesture (plan §11 autoplay).
 */
export class MorseAudio {
  private options: () => MorseAudioOptions
  private createCtx: AudioContextFactory
  private ctx: AudioContext | null = null
  private playback: ScheduledBeep[] = []
  private beeps: ScheduledBeep[] = []

  constructor(
    options: () => MorseAudioOptions,
    createCtx: AudioContextFactory = () => new AudioContext(),
  ) {
    this.options = options
    this.createCtx = createCtx
  }

  /** Play a morse string ('.- -... / -.-.' form). Blank input changes nothing. */
  play(morse: string): void {
    if (morseElements(morse).length === 0) return
    this.stop()
    const opts = this.options()
    if (opts.muted) return
    const ctx = this.context()
    this.playback = scheduleMorse(ctx, morse, { ...opts, startAt: ctx.currentTime + LEAD_IN_S }).beeps
  }

  /** Sound one element straight away, as feedback for keying it. */
  beep(kind: 'dit' | 'dah'): void {
    const opts = this.options()
    if (opts.muted) return
    const ctx = this.context()
    const now = ctx.currentTime
    this.cut(this.playback.splice(0))
    this.beeps = this.beeps.filter((beep) => beep.endS > now)
    this.beeps.push(
      scheduleBeep(ctx, {
        when: now + LEAD_IN_S,
        durationMs: (kind === 'dah' ? DAH_UNITS : 1) * ditMs(opts.wpm),
        freq: opts.freq,
        volume: opts.volume,
      }),
    )
  }

  stop(): void {
    this.cut(this.playback.splice(0))
    this.cut(this.beeps.splice(0))
  }

  private context(): AudioContext {
    if (!this.ctx) this.ctx = this.createCtx()
    if (this.ctx.state === 'suspended') void this.ctx.resume()
    return this.ctx
  }

  private cut(beeps: ScheduledBeep[]): void {
    if (!this.ctx) return
    const now = this.ctx.currentTime
    for (const beep of beeps) {
      try {
        beep.osc.stop(now)
      } catch {
        // already stopped
      }
    }
  }
}
