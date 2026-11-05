import { vi } from 'vitest'

/** Stand-in for the Web Audio graph, recording what gets scheduled. */
export class FakeParam {
  calls: { fn: string; value: number; at: number }[] = []
  setValueAtTime(value: number, at: number): void {
    this.calls.push({ fn: 'setValue', value, at })
  }
  linearRampToValueAtTime(value: number, at: number): void {
    this.calls.push({ fn: 'ramp', value, at })
  }
}

export class FakeOscillator {
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

export class FakeGain {
  gain = new FakeParam()
  connect = vi.fn((node: unknown) => node)
}

export class FakeAudioContext {
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

export const asCtx = (fake: FakeAudioContext) => fake as unknown as AudioContext
