import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MorseInput } from '../../src/input/morse-input'
import { createSessionRuntime } from '../../src/practice/session-runtime'

type State = { count: number; ready: boolean }

const setup = (gate: (state: State) => 'open' | 'held' = () => 'open') => {
  const input = {
    setGate: vi.fn(),
    dispose: vi.fn(),
  } as unknown as MorseInput
  const runtime = createSessionRuntime<State>({
    initialState: { count: 0, ready: true },
    input,
    gate,
  })
  return { runtime, input }
}

beforeEach(() => vi.useFakeTimers())

afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
})

describe('session runtime', () => {
  it('pushes the initial gate and re-pushes after each update', () => {
    const { runtime, input } = setup((state) => (state.ready ? 'open' : 'held'))
    expect(input.setGate).toHaveBeenCalledWith('open')

    runtime.update({ ready: false })
    expect(input.setGate).toHaveBeenLastCalledWith('held')
    expect(runtime.getState()).toEqual({ count: 0, ready: false })
  })

  it('merges patches and notifies subscribers', () => {
    const { runtime } = setup()
    const listener = vi.fn()
    const leave = runtime.subscribe(listener)

    runtime.update({ count: 1 })
    expect(runtime.getState()).toEqual({ count: 1, ready: true })
    expect(listener).toHaveBeenCalledOnce()

    leave()
    runtime.update({ count: 2 })
    expect(listener).toHaveBeenCalledOnce()
  })

  it('replaces the previous one-shot timer', () => {
    const { runtime } = setup()
    const first = vi.fn()
    const second = vi.fn()

    runtime.setAfter(10, first)
    runtime.setAfter(10, second)
    vi.advanceTimersByTime(10)

    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledOnce()

    runtime.clearAfter()
    vi.advanceTimersByTime(10)
    expect(second).toHaveBeenCalledOnce()
  })

  it('replaces the previous repeating timer', () => {
    const { runtime } = setup()
    const first = vi.fn()
    const second = vi.fn()

    runtime.setEvery(10, first)
    runtime.setEvery(10, second)
    vi.advanceTimersByTime(25)

    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(2)

    runtime.clearEvery()
    vi.advanceTimersByTime(10)
    expect(second).toHaveBeenCalledTimes(2)
  })

  it('clears timers and disposes the input on dispose', () => {
    const { runtime, input } = setup()
    const after = vi.fn()
    const every = vi.fn()

    runtime.setAfter(10, after)
    runtime.setEvery(10, every)
    runtime.dispose()
    vi.advanceTimersByTime(20)

    expect(after).not.toHaveBeenCalled()
    expect(every).not.toHaveBeenCalled()
    expect(input.dispose).toHaveBeenCalledOnce()
  })
})
