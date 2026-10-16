import { describe, expect, it } from 'vitest'
import { encodeChar, encodeWord, encodeText, UNKNOWN } from '../../src/core/encode'

describe('encodeChar', () => {
  it('encodes letters case-insensitively', () => {
    expect(encodeChar('A')).toBe('.-')
    expect(encodeChar('a')).toBe('.-')
  })

  it('encodes numbers and punctuation', () => {
    expect(encodeChar('1')).toBe('.----')
    expect(encodeChar('.')).toBe('.-.-.-')
    expect(encodeChar('?')).toBe('..--..')
  })

  it('maps a space to the word separator', () => {
    expect(encodeChar(' ')).toBe('/')
  })

  it('encodes prosigns as single tokens', () => {
    expect(encodeChar('SOS')).toBe('...---...')
  })

  it('is null for unmapped chars', () => {
    expect(encodeChar('#')).toBeNull()
    expect(encodeChar('ñ')).toBeNull()
  })
})

describe('encodeWord', () => {
  it('joins letters with single spaces', () => {
    expect(encodeWord('HI')).toBe('.... ..')
    expect(encodeWord('hi')).toBe('.... ..')
    expect(encodeWord('SOS')).toBe('... --- ...')
  })

  it('replaces unknown chars with ?', () => {
    expect(encodeWord('a#b')).toBe('.- ? -...')
    expect(UNKNOWN).toBe('?')
  })
})

describe('encodeText', () => {
  it('uses " / " between words, collapsing whitespace runs', () => {
    expect(encodeText('HI THERE')).toBe('.... .. / - .... . .-. .')
    expect(encodeText('A  B\n\tC')).toBe('.- / -... / -.-.')
  })

  it('replaces unknown chars with ? in place', () => {
    expect(encodeText("don't #")).toBe(
      '-.. --- -. .----. - / ?',
    )
  })

  it('passes punctuation through unchanged', () => {
    expect(encodeText('hi!')).toBe('.... .. -.-.--')
    expect(encodeText('123.')).toBe('.---- ..--- ...-- .-.-.-')
  })

  it('returns empty string for empty/whitespace-only input', () => {
    expect(encodeText('')).toBe('')
    expect(encodeText('   ')).toBe('')
  })
})

describe('UNKNOWN marker', () => {
  it('is ? (plan spec), shared with the question-mark char by design', () => {
    expect(UNKNOWN).toBe('?')
  })
})
