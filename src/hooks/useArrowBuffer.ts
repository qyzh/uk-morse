import { useCallback, useEffect, useRef, useState } from 'react'
import { decodeSymbol } from '../core/decode'

export type MorseSymbol = '.' | '-'

export const TEXT_ENTRY_SELECTOR = [
  'input',
  'textarea',
  'select',
  '[contenteditable]:not([contenteditable="false"])',
].join(', ')

export const INTERACTIVE_SELECTOR = [
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

function closestMatches(target: EventTarget | null | undefined, selector: string): boolean {
  const el = target as { closest?: (selector: string) => unknown } | null | undefined
  if (!el || typeof el.closest !== 'function') return false
  return el.closest(selector) !== null
}

export function isTextEntryTarget(target: EventTarget | null | undefined): boolean {
  return closestMatches(target, TEXT_ENTRY_SELECTOR)
}

export function isInteractiveTarget(target: EventTarget | null | undefined): boolean {
  return closestMatches(target, INTERACTIVE_SELECTOR)
}

export type ArrowBufferOptions = {
  enabled?: boolean
  /** 0 disables auto-commit. */
  autoCommitMs?: number
  onBeep?: (kind: 'dit' | 'dah') => void
  onCommit?: (char: string, raw: string) => void
  onEnter?: (charFromBuffer: string | null) => void
  onBackspaceEmpty?: () => void
  onReset?: () => void
}

/**
 * Morse symbol buffer driven by the arrow keys (plan §3.1).
 *
 * The buffer has one source of truth (a ref) and every mutation is a plain
 * handler — no side effects inside setState updaters, so StrictMode's double
 * invocation can never double-commit. The same actions are returned so the
 * on-screen touch pad reuses the exact keyboard semantics.
 */
export function useArrowBuffer(opts: ArrowBufferOptions = {}) {
  const { enabled = true, autoCommitMs = 0 } = opts
  const [buffer, setBuffer] = useState('')
  const bufferRef = useRef('')
  const optsRef = useRef(opts)

  useEffect(() => {
    optsRef.current = opts
  })

  const sync = useCallback((next: string) => {
    bufferRef.current = next
    setBuffer(next)
  }, [])

  const push = useCallback(
    (symbol: MorseSymbol) => {
      if (optsRef.current.enabled === false) return
      sync(bufferRef.current + symbol)
      optsRef.current.onBeep?.(symbol === '.' ? 'dit' : 'dah')
    },
    [sync],
  )

  const commit = useCallback(() => {
    if (optsRef.current.enabled === false) return
    const raw = bufferRef.current
    if (raw.length === 0) return
    sync('')
    optsRef.current.onCommit?.(decodeSymbol(raw), raw)
  }, [sync])

  const enter = useCallback(() => {
    if (optsRef.current.enabled === false) return
    commit()
    optsRef.current.onEnter?.(null)
  }, [commit])

  const backspace = useCallback(() => {
    if (optsRef.current.enabled === false) return
    if (bufferRef.current.length > 0) sync(bufferRef.current.slice(0, -1))
    else optsRef.current.onBackspaceEmpty?.()
  }, [sync])

  const reset = useCallback(() => {
    sync('')
    optsRef.current.onReset?.()
  }, [sync])

  // auto-commit after a moment of inactivity
  useEffect(() => {
    if (!enabled || autoCommitMs <= 0 || buffer.length === 0) return
    const id = window.setTimeout(commit, autoCommitMs)
    return () => window.clearTimeout(id)
  }, [buffer, enabled, autoCommitMs, commit])

  // keyboard input — text fields keep every key; other interactive elements
  // keep Enter/Space so focused buttons and links still activate natively
  useEffect(() => {
    if (!enabled) return
    const handler = (e: KeyboardEvent) => {
      if (e.isComposing || e.defaultPrevented) return
      const target = e.target as HTMLElement | null
      if (isTextEntryTarget(target)) return
      if ((e.key === ' ' || e.key === 'Enter') && isInteractiveTarget(target)) return
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        push('.')
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        push('-')
      } else if (e.key === ' ') {
        e.preventDefault()
        commit()
      } else if (e.key === 'Enter') {
        e.preventDefault()
        enter()
      } else if (e.key === 'Backspace') {
        e.preventDefault()
        backspace()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        reset()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [enabled, push, commit, enter, backspace, reset])

  return { buffer, push, commit, enter, backspace, reset }
}
