import { useCallback, useEffect, useRef, useState } from 'react'
import { decodeSymbol } from '../core/decode'

export type MorseSymbol = '.' | '-'

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
      sync(bufferRef.current + symbol)
      optsRef.current.onBeep?.(symbol === '.' ? 'dit' : 'dah')
    },
    [sync],
  )

  const commit = useCallback(() => {
    const raw = bufferRef.current
    if (raw.length === 0) return
    sync('')
    optsRef.current.onCommit?.(decodeSymbol(raw), raw)
  }, [sync])

  const enter = useCallback(() => {
    commit()
    optsRef.current.onEnter?.(null)
  }, [commit])

  const backspace = useCallback(() => {
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

  // keyboard input — ignored when the event starts in a form field
  useEffect(() => {
    if (!enabled) return
    const handler = (e: KeyboardEvent) => {
      if (e.isComposing || e.defaultPrevented) return
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return
      }
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
