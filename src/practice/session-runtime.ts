import type { MorseInput, MorseInputGate } from '../input/morse-input'

/** The lifecycle shared by the two practice sessions. Domains keep their rules. */
export type SessionRuntime<S extends object> = {
  input: MorseInput
  getState: () => S
  subscribe: (listener: () => void) => () => void
  /** Merge a patch, re-apply the gate, then notify. */
  update: (patch: Partial<S>) => void
  /** Schedule a one-shot, replacing any earlier one. */
  setAfter: (ms: number, fn: () => void) => void
  clearAfter: () => void
  /** Schedule a repeating timer, replacing any earlier one. */
  setEvery: (ms: number, fn: () => void) => void
  clearEvery: () => void
  /** Clear both timers and dispose the input. */
  dispose: () => void
}

export type SessionRuntimeOptions<S extends object> = {
  initialState: S
  input: MorseInput
  gate: (state: S) => MorseInputGate
}

export function createSessionRuntime<S extends object>(
  options: SessionRuntimeOptions<S>,
): SessionRuntime<S> {
  const { input, gate } = options
  let state = options.initialState
  const listeners = new Set<() => void>()
  let after: ReturnType<typeof setTimeout> | undefined
  let every: ReturnType<typeof setInterval> | undefined

  input.setGate(gate(state))

  return {
    input,
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    update(patch) {
      state = { ...state, ...patch }
      input.setGate(gate(state))
      for (const listener of listeners) listener()
    },
    setAfter(ms, fn) {
      clearTimeout(after)
      after = setTimeout(fn, ms)
    },
    clearAfter() {
      clearTimeout(after)
      after = undefined
    },
    setEvery(ms, fn) {
      clearInterval(every)
      every = setInterval(fn, ms)
    },
    clearEvery() {
      clearInterval(every)
      every = undefined
    },
    dispose() {
      clearTimeout(after)
      clearInterval(every)
      input.dispose()
    },
  }
}
