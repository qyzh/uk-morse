/**
 * Morse keying (plan §3.1): turns key presses and pad taps into elements, a
 * buffer and commits. Framework-free so all of it runs in tests; React connects
 * through useMorseKeyboard.
 */
import { decodeCode } from '../core/decode'
import type { MorseEntry } from '../core/morse-data'

const TEXT_ENTRY_SELECTOR = [
  'input',
  'textarea',
  'select',
  '[contenteditable]:not([contenteditable="false"])',
].join(', ')

const INTERACTIVE_SELECTOR = [
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
].join(', ')

function matches(target: EventTarget | null, selector: string): boolean {
  const el = target as { closest?: (selector: string) => unknown } | null
  return typeof el?.closest === 'function' && el.closest(selector) !== null
}

/**
 * - open: keying works.
 * - held: keys are swallowed and ignored, for a moment when input must wait.
 * - closed: input is off, and keys belong to the page.
 *
 * Moving off `open` drops the buffer, so nothing can commit later.
 */
export type MorseInputGate = 'open' | 'held' | 'closed'

export type MorseInputOptions = {
  /** Idle time before the buffer commits itself, read at each change. 0 turns it off. */
  autoCommitMs: () => number
  onElement?: (kind: 'dit' | 'dah') => void
  /** Called with the decoded entry, or null for unknown input. */
  onCommit?: (entry: MorseEntry | null) => void
  onWordGap?: () => void
  /** Backspace with nothing to remove, so the caller can edit its own text. */
  onBackspaceEmpty?: () => void
}

export type MorseKeyPress = Pick<KeyboardEvent, 'key' | 'target' | 'isComposing' | 'defaultPrevented'>

export type MorseInput = {
  dit: () => void
  dah: () => void
  commit: () => void
  wordGap: () => void
  backspace: () => void
  /** Throw the buffer away without committing. Works whatever the gate. */
  reset: () => void
  setGate: (gate: MorseInputGate) => void
  /** Returns true when the key was used, so the caller should prevent its default. */
  handleKey: (press: MorseKeyPress) => boolean
  getBuffer: () => string
  subscribe: (listener: () => void) => () => void
  /** Cancels a pending auto-commit. The input stays usable. */
  dispose: () => void
}

export function createMorseInput(options: MorseInputOptions): MorseInput {
  let buffer = ''
  let gate: MorseInputGate = 'open'
  let autoCommit: ReturnType<typeof setTimeout> | undefined
  const listeners = new Set<() => void>()

  const setBuffer = (next: string) => {
    if (next === buffer) return
    buffer = next
    clearTimeout(autoCommit)
    const delay = options.autoCommitMs()
    if (buffer.length > 0 && delay > 0) autoCommit = setTimeout(commit, delay)
    for (const listener of listeners) listener()
  }

  const commit = () => {
    if (gate !== 'open' || buffer.length === 0) return
    const code = buffer
    setBuffer('')
    options.onCommit?.(decodeCode(code))
  }

  const key = (element: '.' | '-') => {
    if (gate !== 'open') return
    setBuffer(buffer + element)
    options.onElement?.(element === '.' ? 'dit' : 'dah')
  }

  const dit = () => key('.')
  const dah = () => key('-')

  const wordGap = () => {
    if (gate !== 'open') return
    commit()
    options.onWordGap?.()
  }

  const backspace = () => {
    if (gate !== 'open') return
    if (buffer.length > 0) setBuffer(buffer.slice(0, -1))
    else options.onBackspaceEmpty?.()
  }

  const reset = () => setBuffer('')

  const KEY_ACTIONS = new Map<string, () => void>([
    ['ArrowLeft', dit],
    ['ArrowRight', dah],
    [' ', commit],
    ['Enter', wordGap],
    ['Backspace', backspace],
    ['Escape', reset],
  ])

  return {
    dit,
    dah,
    commit,
    wordGap,
    backspace,
    reset,
    setGate(next) {
      gate = next
      if (gate !== 'open') reset()
    },
    handleKey(press) {
      if (press.isComposing || press.defaultPrevented || gate === 'closed') return false
      const action = KEY_ACTIONS.get(press.key)
      if (!action || matches(press.target, TEXT_ENTRY_SELECTOR)) return false
      // Space and Enter activate a focused control, unless a letter is being keyed.
      const activates = press.key === ' ' || press.key === 'Enter'
      if (activates && buffer.length === 0 && matches(press.target, INTERACTIVE_SELECTOR)) return false
      if (gate === 'open') action()
      return true
    },
    getBuffer: () => buffer,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    dispose: () => clearTimeout(autoCommit),
  }
}
