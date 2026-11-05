import { describe, expect, it } from 'vitest'
import { decodeCode } from '../../src/core/decode'
import { MORSE_LIST } from '../../src/core/morse-data'

describe('decodeCode', () => {
  it('finds letters, numbers and punctuation', () => {
    expect(decodeCode('.-')?.char).toBe('A')
    expect(decodeCode('-...')?.char).toBe('B')
    expect(decodeCode('-----')?.char).toBe('0')
    expect(decodeCode('.-.-.-')?.char).toBe('.')
    expect(decodeCode('.--.-.')?.char).toBe('@')
  })

  it('finds the question mark entry rather than reporting unknown input', () => {
    expect(decodeCode('..--..')).toMatchObject({
      char: '?',
      morse: '..--..',
      category: 'punctuation',
    })
  })

  it('keeps a prosign as one entry', () => {
    expect(decodeCode('...---...')).toMatchObject({ char: 'SOS', category: 'prosign' })
  })

  it('resolves prosign collisions toward the punctuation entry', () => {
    expect(decodeCode('.-.-.')?.char).toBe('+')
    expect(decodeCode('-...-')?.char).toBe('=')
  })

  it('accepts surrounding whitespace and unicode dit/dah', () => {
    expect(decodeCode(' .- ')?.char).toBe('A')
    expect(decodeCode('·−')?.char).toBe('A')
  })

  it('returns null for unknown input', () => {
    expect(decodeCode('.-.-')).toBeNull()
    expect(decodeCode('......')).toBeNull()
    expect(decodeCode('')).toBeNull()
  })

  it('reaches an entry for every code in the table', () => {
    for (const entry of MORSE_LIST) {
      expect(decodeCode(entry.morse)?.morse).toBe(entry.morse)
    }
  })
})
