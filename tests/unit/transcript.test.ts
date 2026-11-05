import { describe, expect, it } from 'vitest'
import { decodeCode } from '../../src/core/decode'
import { WORD_GAP, transcriptMorse, transcriptText } from '../../src/core/transcript'
import type { Transcript } from '../../src/core/transcript'

const a = decodeCode('.-')!
const b = decodeCode('-...')!
const sos = decodeCode('...---...')!

describe('transcript', () => {
  it('is empty text and empty morse with no items', () => {
    expect(transcriptText([])).toBe('')
    expect(transcriptMorse([])).toBe('')
  })

  it('reads as characters, with word gaps as spaces', () => {
    expect(transcriptText([a, b, WORD_GAP, a])).toBe('AB A')
  })

  it('sends codes separated by letter gaps, words by "/"', () => {
    expect(transcriptMorse([a, b, WORD_GAP, a])).toBe('.- -... / .-')
  })

  it('sends a prosign as one unbroken code', () => {
    const letters: Transcript = [decodeCode('...')!, decodeCode('---')!, decodeCode('...')!]
    expect(transcriptText([sos])).toBe(transcriptText(letters))
    expect(transcriptMorse([sos])).toBe('...---...')
    expect(transcriptMorse(letters)).toBe('... --- ...')
  })

  it('removes a prosign as one item', () => {
    expect(transcriptText([a, sos].slice(0, -1))).toBe('A')
  })
})
