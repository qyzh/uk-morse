import { describe, expect, it } from 'vitest'
import {
  CHAR_MAP,
  MAX_MORSE_LENGTH,
  MORSE_LIST,
  MORSE_MAP,
  normalizeMorse,
} from '../../src/core/morse-data'

describe('morse-data', () => {
  it('has 60 entries: 26 letters, 10 numbers, 18 punctuation, 6 prosigns', () => {
    const byCat = (cat: string) => MORSE_LIST.filter((e) => e.category === cat).length
    expect(MORSE_LIST).toHaveLength(60)
    expect(byCat('letter')).toBe(26)
    expect(byCat('number')).toBe(10)
    expect(byCat('punctuation')).toBe(18)
    expect(byCat('prosign')).toBe(6)
  })

  it('keeps the maps reversible for every non-conflicting entry', () => {
    for (const [char, morse] of Object.entries(MORSE_MAP)) {
      expect(MORSE_MAP[char]).toBe(morse)
    }
    for (const [morse, char] of Object.entries(CHAR_MAP)) {
      expect(CHAR_MAP[morse]).toBeDefined()
      expect(MORSE_MAP[char]).toBe(morse)
    }
  })

  it('resolves the known collisions in favor of punctuation', () => {
    // 'AR' shares '.-.-.' with '+', 'BT' shares '-...-' with '=', 'KN' shares '-.--.' with '('
    expect(CHAR_MAP['.-.-.']).toBe('+')
    expect(CHAR_MAP['-...-']).toBe('=')
    expect(CHAR_MAP['-.--.']).toBe('(')
    // non-conflicting prosigns stay in the reverse map
    expect(CHAR_MAP['...---...']).toBe('SOS')
    expect(CHAR_MAP['...-.-']).toBe('SK')
    expect(CHAR_MAP['........']).toBe('HH')
  })

  it('contains no invalid symbols outside . - space /', () => {
    for (const morse of Object.values(MORSE_MAP)) {
      expect(morse).toMatch(/^[.\-\s/]*$/)
    }
  })

  it('normalizes unicode dit/dah variants', () => {
    expect(normalizeMorse('·•−')).toBe('..-')
    expect(normalizeMorse(' — ')).toBe('-')
    expect(normalizeMorse('·−·−·−')).toBe('.-.-.-')
  })

  it('bounds the longest-match window at the longest entry', () => {
    expect(MAX_MORSE_LENGTH).toBe(9) // '...---...' SOS
  })
})
