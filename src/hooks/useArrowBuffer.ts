import { useCallback, useEffect, useRef, useState } from 'react'
import { decodeSymbol } from '../core/decode'

export type ArrowBufferOptions = {
  enabled?: boolean
  /** 0 disables auto-commit (plan §3.1). */
  autoCommitMs?: number
  onBeep?: (kind: 'dit' | 'dah') => void
  onCommit?: (char: string, raw: string) => void
  onEnter?: (committedChar: string | null) => void
  onBackspaceEmpty?: () => void
  onReset?: () => void
}

export type ArrowBuffer = {
  buffer: string
  /** Imperative actions for on-screen buttons (plan §6 mobile fallback). */
  addSymbol: (kind: 'dit' | 'dah') => void
  commit: () => void
  word: () => void
  undo: () => void
  reset: () => void
}

export function useArrowBuffer(opts: ArrowBufferOptions = {}): ArrowBuffer {
  const [buffer, setBufferState] = useState('')
  const bufferRef = useRef('')
  const optsRef = useRef(opts)

  // Keep latest callbacks/handlers without resubscribing the key listener
  useEffect(() => {
    optsRef.current = opts
  })
  const enabled = opts.enabled ?? true
  const autoCommitMs = opts.autoCommitMs ?? 0

  const setBuffer = useCallback((value: string) => {
    bufferRef.current = value
    setBufferState(value)
  }, [])

  /** Decode and flush the buffer, reporting the decoded char (or '?'). */
  const commitBuffer = useCallback(
    (raw: string): string => {
      if (raw.length === 0) return ''
      const char = decodeSymbol(raw)
      optsRef.current.onCommit?.(char, raw)
      return char
    },
    [],
  )

  const addSymbol = useCallback(
    (kind: 'dit' | 'dah') => {
      setBuffer(bufferRef.current + (kind === 'dah' ? '-' : '.'))
      optsRef.current.onBeep?.(kind)
    },
    [setBuffer],
  )

  const commit = useCallback(() => {
    commitBuffer(bufferRef.current)
    setBuffer('')
  }, [commitBuffer, setBuffer])

  const word = useCallback(() => {
    const raw = bufferRef.current
    const char = commitBuffer(raw)
    setBuffer('')
    optsRef.current.onEnter?.(raw.length === 0 ? null : char)
  }, [commitBuffer, setBuffer])

  const undo = useCallback(() => {
    const raw = bufferRef.current
    if (raw.length > 0) setBuffer(raw.slice(0, -1))
    else optsRef.current.onBackspaceEmpty?.()
  }, [setBuffer])

  const reset = useCallback(() => {
    setBuffer('')
    optsRef.current.onReset?.()
  }, [setBuffer])

  // Auto-commit after inactivity (plan §3.1 — defaults off)
  useEffect(() => {
    if (!enabled || buffer.length === 0 || autoCommitMs <= 0) return
    const id = window.setTimeout(() => {
      setBuffer('')
      commitBuffer(bufferRef.current)
    }, autoCommitMs)
    return () => window.clearTimeout(id)
  }, [buffer, enabled, autoCommitMs, commitBuffer, setBuffer])

  // Global key handling per plan Appendix B
  useEffect(() => {
    if (!enabled) return
    const handler = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          addSymbol('dit')
          return
        case 'ArrowRight':
          e.preventDefault()
          addSymbol('dah')
          return
        case ' ':
        case 'Spacebar':
          e.preventDefault()
          commit()
          return
        case 'Enter':
          e.preventDefault()
          word()
          return
        case 'Backspace':
          e.preventDefault()
          undo()
          return
        case 'Escape':
          e.preventDefault()
          reset()
          return
        default:
          return
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [enabled, addSymbol, commit, word, undo, reset])

  return { buffer, addSymbol, commit, word, undo, reset }
}
