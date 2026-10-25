import { describe, expect, it } from 'vitest'
import {
  INTERACTIVE_SELECTOR,
  TEXT_ENTRY_SELECTOR,
  isInteractiveTarget,
  isTextEntryTarget,
} from '../../src/hooks/useArrowBuffer'

const target = (matched: boolean): EventTarget =>
  ({ closest: () => (matched ? {} : null) }) as unknown as EventTarget

describe('isTextEntryTarget', () => {
  it('returns false for events without a closest() (window, document, null)', () => {
    expect(isTextEntryTarget(null)).toBe(false)
    expect(isTextEntryTarget(undefined)).toBe(false)
    expect(isTextEntryTarget({} as EventTarget)).toBe(false)
    expect(isTextEntryTarget(target(false))).toBe(false)
  })

  it('returns true when the event landed inside a text-entry element', () => {
    expect(isTextEntryTarget(target(true))).toBe(true)
  })

  it('covers inputs, textareas, selects and contenteditable', () => {
    for (const token of ['input', 'textarea', 'select', '[contenteditable]']) {
      expect(TEXT_ENTRY_SELECTOR).toContain(token)
    }
  })
})

describe('isInteractiveTarget', () => {
  it('returns false for events without a closest()', () => {
    expect(isInteractiveTarget(null)).toBe(false)
    expect(isInteractiveTarget(undefined)).toBe(false)
    expect(isInteractiveTarget({} as EventTarget)).toBe(false)
    expect(isInteractiveTarget(target(false))).toBe(false)
  })

  it('returns true when the event landed on an activation-capable element', () => {
    expect(isInteractiveTarget(target(true))).toBe(true)
  })

  it('queries closest() with the interactive selector', () => {
    let seen = ''
    const spy = {
      closest: (selector: string) => {
        seen = selector
        return null
      },
    } as unknown as EventTarget
    isInteractiveTarget(spy)
    expect(seen).toBe(INTERACTIVE_SELECTOR)
  })

  it('covers native and ARIA controls', () => {
    for (const token of [
      'a[href]',
      'button',
      'summary',
      '[role="button"]',
      '[role="link"]',
      '[role="tab"]',
      '[tabindex]:not([tabindex="-1"])',
    ]) {
      expect(INTERACTIVE_SELECTOR).toContain(token)
    }
  })

  it('only matches tabindex values that are natively focusable', () => {
    const withoutGuard = INTERACTIVE_SELECTOR.replace('[tabindex]:not([tabindex="-1"])', '')
    expect(withoutGuard).not.toContain('tabindex')
  })
})
