import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMorseInput } from '../../src/input/morse-input'
import type { MorseInputOptions } from '../../src/input/morse-input'

const setup = (options: Partial<MorseInputOptions> = {}) => {
  const onElement = vi.fn()
  const onCommit = vi.fn()
  const onWordGap = vi.fn()
  const onBackspaceEmpty = vi.fn()
  const input = createMorseInput({
    autoCommitMs: () => 0,
    onElement,
    onCommit,
    onWordGap,
    onBackspaceEmpty,
    ...options,
  })
  return { input, onElement, onCommit, onWordGap, onBackspaceEmpty }
}

/** A stand-in element that matches the selectors it lists. */
const element = (...selectors: string[]): EventTarget =>
  ({
    closest: (list: string) => (selectors.some((s) => list.split(', ').includes(s)) ? {} : null),
  }) as unknown as EventTarget

const press = (key: string, target: EventTarget | null = null, extra = {}) => ({
  key,
  target,
  isComposing: false,
  defaultPrevented: false,
  ...extra,
})

const page = element()
const button = element('button')

const TEXT_ENTRIES = ['input', 'textarea', 'select', '[contenteditable]:not([contenteditable="false"])']
const CONTROLS = [
  'a[href]',
  'button',
  'summary',
  '[role="button"]',
  '[role="link"]',
  '[role="menuitem"]',
  '[role="option"]',
  '[role="tab"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="switch"]',
  '[tabindex]:not([tabindex="-1"])',
]

describe('keying', () => {
  it('builds the buffer from arrow keys and reports each element', () => {
    const { input, onElement } = setup()
    expect(input.handleKey(press('ArrowLeft'))).toBe(true)
    expect(input.handleKey(press('ArrowRight'))).toBe(true)
    expect(input.getBuffer()).toBe('.-')
    expect(onElement.mock.calls).toEqual([['dit'], ['dah']])
  })

  it('gives the pad the same actions as the keyboard', () => {
    const { input, onCommit } = setup()
    input.dit()
    input.dah()
    expect(input.getBuffer()).toBe('.-')
    input.commit()
    expect(onCommit).toHaveBeenCalledWith(expect.objectContaining({ char: 'A' }))
  })

  it('leaves other keys alone', () => {
    const { input } = setup()
    expect(input.handleKey(press('a'))).toBe(false)
    expect(input.handleKey(press('Tab'))).toBe(false)
    expect(input.getBuffer()).toBe('')
  })

  it('ignores keys during IME composition or already handled', () => {
    const { input } = setup()
    expect(input.handleKey(press('ArrowLeft', page, { isComposing: true }))).toBe(false)
    expect(input.handleKey(press('ArrowLeft', page, { defaultPrevented: true }))).toBe(false)
    expect(input.getBuffer()).toBe('')
  })
})

describe('commit', () => {
  it('turns the buffer into an entry and empties it', () => {
    const { input, onCommit } = setup()
    input.handleKey(press('ArrowLeft'))
    input.handleKey(press('ArrowRight'))
    expect(input.handleKey(press(' '))).toBe(true)
    expect(onCommit).toHaveBeenCalledWith(expect.objectContaining({ char: 'A', morse: '.-' }))
    expect(input.getBuffer()).toBe('')
  })

  it('reports unknown input as null', () => {
    const { input, onCommit } = setup()
    for (let i = 0; i < 6; i++) input.dit()
    input.commit()
    expect(onCommit).toHaveBeenCalledWith(null)
  })

  it('reports `..--..` as the question mark entry', () => {
    const { input, onCommit } = setup()
    for (const key of ['ArrowLeft', 'ArrowLeft', 'ArrowRight', 'ArrowRight', 'ArrowLeft', 'ArrowLeft']) {
      input.handleKey(press(key))
    }
    input.commit()
    expect(onCommit).toHaveBeenCalledWith(expect.objectContaining({ char: '?' }))
  })

  it('does nothing with an empty buffer', () => {
    const { input, onCommit } = setup()
    input.commit()
    input.handleKey(press(' '))
    expect(onCommit).not.toHaveBeenCalled()
  })
})

describe('word gap', () => {
  it('commits the buffer first', () => {
    const { input, onCommit, onWordGap } = setup()
    input.dit()
    input.handleKey(press('Enter'))
    expect(onCommit).toHaveBeenCalledOnce()
    expect(onWordGap).toHaveBeenCalledOnce()
    expect(onCommit.mock.invocationCallOrder[0]!).toBeLessThan(onWordGap.mock.invocationCallOrder[0]!)
  })

  it('still happens with an empty buffer', () => {
    const { input, onCommit, onWordGap } = setup()
    input.wordGap()
    expect(onCommit).not.toHaveBeenCalled()
    expect(onWordGap).toHaveBeenCalledOnce()
  })
})

describe('backspace and escape', () => {
  it('removes the last element', () => {
    const { input, onBackspaceEmpty } = setup()
    input.dit()
    input.dah()
    expect(input.handleKey(press('Backspace'))).toBe(true)
    expect(input.getBuffer()).toBe('.')
    expect(onBackspaceEmpty).not.toHaveBeenCalled()
  })

  it('reports an empty buffer so the caller can edit its own text', () => {
    const { input, onBackspaceEmpty } = setup()
    input.backspace()
    expect(onBackspaceEmpty).toHaveBeenCalledOnce()
  })

  it('escape throws the buffer away without committing', () => {
    const { input, onCommit } = setup()
    input.dit()
    expect(input.handleKey(press('Escape'))).toBe(true)
    expect(input.getBuffer()).toBe('')
    expect(onCommit).not.toHaveBeenCalled()
  })
})

describe('focus', () => {
  it('leaves every key to text fields', () => {
    for (const selector of TEXT_ENTRIES) {
      const { input } = setup()
      input.dit()
      for (const key of ['ArrowLeft', 'ArrowRight', ' ', 'Enter', 'Backspace', 'Escape']) {
        expect(input.handleKey(press(key, element(selector)))).toBe(false)
      }
      expect(input.getBuffer()).toBe('.')
    }
  })

  it('leaves Space and Enter to focused controls when nothing is being keyed', () => {
    for (const selector of CONTROLS) {
      const { input } = setup()
      expect(input.handleKey(press(' ', element(selector)))).toBe(false)
      expect(input.handleKey(press('Enter', element(selector)))).toBe(false)
    }
  })

  it('takes Space from a focused control in the middle of a letter', () => {
    const { input, onCommit } = setup()
    input.handleKey(press('ArrowLeft', button))
    expect(input.handleKey(press(' ', button))).toBe(true)
    expect(onCommit).toHaveBeenCalledWith(expect.objectContaining({ char: 'E' }))
  })

  it('takes Enter from a focused control in the middle of a letter', () => {
    const { input, onCommit, onWordGap } = setup()
    input.handleKey(press('ArrowRight', button))
    expect(input.handleKey(press('Enter', button))).toBe(true)
    expect(onCommit).toHaveBeenCalledWith(expect.objectContaining({ char: 'T' }))
    expect(onWordGap).toHaveBeenCalledOnce()
  })

  it('keeps the arrows while a control has focus', () => {
    const { input } = setup()
    expect(input.handleKey(press('ArrowLeft', button))).toBe(true)
    expect(input.getBuffer()).toBe('.')
  })

  it('treats a page element with tabindex -1 as the page', () => {
    // Skip-link focus lands on <main tabindex="-1">, which matches no selector.
    const { input, onCommit } = setup()
    input.dit()
    expect(input.handleKey(press(' ', page))).toBe(true)
    expect(onCommit).toHaveBeenCalledOnce()
  })
})

describe('gate', () => {
  it('held swallows keys and does nothing with them', () => {
    const { input, onElement, onCommit, onWordGap, onBackspaceEmpty } = setup()
    input.setGate('held')
    for (const key of ['ArrowLeft', 'ArrowRight', ' ', 'Enter', 'Backspace', 'Escape']) {
      expect(input.handleKey(press(key, page))).toBe(true)
    }
    expect(input.getBuffer()).toBe('')
    expect(onElement).not.toHaveBeenCalled()
    expect(onCommit).not.toHaveBeenCalled()
    expect(onWordGap).not.toHaveBeenCalled()
    expect(onBackspaceEmpty).not.toHaveBeenCalled()
  })

  it('held still lets a focused control activate', () => {
    const { input } = setup()
    input.setGate('held')
    expect(input.handleKey(press(' ', button))).toBe(false)
  })

  it('closed leaves keys to the page', () => {
    const { input } = setup()
    input.setGate('closed')
    for (const key of ['ArrowLeft', 'ArrowRight', ' ', 'Enter', 'Backspace', 'Escape']) {
      expect(input.handleKey(press(key, page))).toBe(false)
    }
    expect(input.getBuffer()).toBe('')
  })

  it('stops the pad too', () => {
    for (const gate of ['held', 'closed'] as const) {
      const { input, onCommit, onWordGap, onBackspaceEmpty } = setup()
      input.setGate(gate)
      input.dit()
      input.dah()
      input.commit()
      input.wordGap()
      input.backspace()
      expect(input.getBuffer()).toBe('')
      expect(onCommit).not.toHaveBeenCalled()
      expect(onWordGap).not.toHaveBeenCalled()
      expect(onBackspaceEmpty).not.toHaveBeenCalled()
    }
  })

  it('reopening picks up where a held input left off', () => {
    const { input } = setup()
    input.setGate('held')
    input.setGate('open')
    input.dit()
    expect(input.getBuffer()).toBe('.')
  })
})

describe('auto-commit', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('commits after the idle time', () => {
    const { input, onCommit } = setup({ autoCommitMs: () => 700 })
    input.dit()
    vi.advanceTimersByTime(699)
    expect(onCommit).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(onCommit).toHaveBeenCalledOnce()
    expect(input.getBuffer()).toBe('')
  })

  it('restarts the wait with each element', () => {
    const { input, onCommit } = setup({ autoCommitMs: () => 700 })
    input.dit()
    vi.advanceTimersByTime(600)
    input.dah()
    vi.advanceTimersByTime(600)
    expect(onCommit).not.toHaveBeenCalled()
    vi.advanceTimersByTime(100)
    expect(onCommit).toHaveBeenCalledWith(expect.objectContaining({ char: 'A' }))
  })

  it('is off at 0', () => {
    const { input, onCommit } = setup({ autoCommitMs: () => 0 })
    input.dit()
    vi.advanceTimersByTime(60_000)
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('uses the setting current at each element', () => {
    let delay = 700
    const { input, onCommit } = setup({ autoCommitMs: () => delay })
    delay = 100
    input.dit()
    vi.advanceTimersByTime(100)
    expect(onCommit).toHaveBeenCalledOnce()
  })

  it('does not commit twice after a manual commit', () => {
    const { input, onCommit } = setup({ autoCommitMs: () => 700 })
    input.dit()
    input.commit()
    vi.advanceTimersByTime(700)
    expect(onCommit).toHaveBeenCalledOnce()
  })

  it('is cancelled by emptying the buffer', () => {
    const { input, onCommit } = setup({ autoCommitMs: () => 700 })
    input.dit()
    input.backspace()
    vi.advanceTimersByTime(700)
    input.dit()
    input.reset()
    vi.advanceTimersByTime(700)
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('drops the buffer when the gate shuts, so nothing commits later', () => {
    for (const gate of ['held', 'closed'] as const) {
      const { input, onCommit } = setup({ autoCommitMs: () => 700 })
      input.dit()
      input.setGate(gate)
      expect(input.getBuffer()).toBe('')
      input.setGate('open')
      vi.advanceTimersByTime(700)
      expect(onCommit).not.toHaveBeenCalled()
    }
  })

  it('is cancelled by dispose', () => {
    const { input, onCommit } = setup({ autoCommitMs: () => 700 })
    input.dit()
    input.dispose()
    vi.advanceTimersByTime(700)
    expect(onCommit).not.toHaveBeenCalled()
  })
})

describe('subscribe', () => {
  it('tells listeners when the buffer changes, until they leave', () => {
    const { input } = setup()
    const listener = vi.fn()
    const leave = input.subscribe(listener)
    input.dit()
    input.dah()
    expect(listener).toHaveBeenCalledTimes(2)
    leave()
    input.reset()
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('stays quiet when nothing changed', () => {
    const { input } = setup()
    const listener = vi.fn()
    input.subscribe(listener)
    input.reset()
    input.commit()
    expect(listener).not.toHaveBeenCalled()
  })
})
