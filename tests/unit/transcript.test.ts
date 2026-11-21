import { describe, expect, it, vi } from 'vitest'
import { decodeCode } from '../../src/core/decode'
import { createTranscript } from '../../src/core/transcript'

const a = decodeCode('.-')!
const b = decodeCode('-...')!
const sos = decodeCode('...---...')!

describe('transcript', () => {
  it('starts empty', () => {
    const transcript = createTranscript()
    expect(transcript.getState()).toEqual({ text: '', morse: '', empty: true })
  })

  it('reads as characters, with word gaps as spaces', () => {
    const transcript = createTranscript()
    transcript.append(a)
    transcript.append(b)
    transcript.wordGap()
    transcript.append(a)
    expect(transcript.getState().text).toBe('AB A')
  })

  it('sends codes separated by letter gaps, words by "/"', () => {
    const transcript = createTranscript()
    transcript.append(a)
    transcript.append(b)
    transcript.wordGap()
    transcript.append(a)
    expect(transcript.getState().morse).toBe('.- -... / .-')
  })

  it('keeps a prosign as one item', () => {
    const transcript = createTranscript()
    transcript.append(sos)
    expect(transcript.getState().text).toBe('SOS')
    expect(transcript.getState().morse).toBe('...---...')
  })

  it('ignores a word gap at the start', () => {
    const transcript = createTranscript()
    transcript.wordGap()
    expect(transcript.getState()).toEqual({ text: '', morse: '', empty: true })
  })

  it('collapses repeated word gaps', () => {
    const transcript = createTranscript()
    transcript.append(a)
    transcript.wordGap()
    transcript.wordGap()
    transcript.append(b)
    expect(transcript.getState().text).toBe('A B')
    expect(transcript.getState().morse).toBe('.- / -...')
  })

  it('removes the last entry or word gap', () => {
    const transcript = createTranscript()
    transcript.append(a)
    transcript.wordGap()
    transcript.append(b)

    transcript.backspace()
    expect(transcript.getState().text).toBe('A ')

    transcript.backspace()
    expect(transcript.getState().text).toBe('A')

    transcript.backspace()
    expect(transcript.getState().empty).toBe(true)

    transcript.backspace()
    expect(transcript.getState().empty).toBe(true)
  })

  it('clears everything and does nothing when already empty', () => {
    const transcript = createTranscript()
    transcript.append(a)
    const listener = vi.fn()
    transcript.subscribe(listener)

    transcript.clear()
    expect(transcript.getState()).toEqual({ text: '', morse: '', empty: true })
    expect(listener).toHaveBeenCalledOnce()

    transcript.clear()
    expect(listener).toHaveBeenCalledOnce()
  })

  it('notifies subscribers only when something changes', () => {
    const transcript = createTranscript()
    const listener = vi.fn()
    const unsubscribe = transcript.subscribe(listener)

    transcript.wordGap()
    transcript.backspace()
    transcript.clear()
    expect(listener).not.toHaveBeenCalled()

    transcript.append(a)
    expect(listener).toHaveBeenCalledTimes(1)

    transcript.wordGap()
    expect(listener).toHaveBeenCalledTimes(2)

    transcript.wordGap()
    expect(listener).toHaveBeenCalledTimes(2)

    transcript.backspace()
    expect(listener).toHaveBeenCalledTimes(3)

    unsubscribe()
    transcript.append(b)
    expect(listener).toHaveBeenCalledTimes(3)
  })

  it('returns the same state object until something changes', () => {
    const transcript = createTranscript()
    const first = transcript.getState()
    expect(transcript.getState()).toBe(first)

    transcript.append(a)
    const second = transcript.getState()
    expect(second).not.toBe(first)
    expect(transcript.getState()).toBe(second)
  })
})
