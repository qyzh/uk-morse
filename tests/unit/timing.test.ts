import { describe, expect, it } from 'vitest'
import {
  DAH_UNITS,
  ELEMENT_GAP_UNITS,
  LETTER_GAP_UNITS,
  WORD_GAP_UNITS,
  ditMs,
  dahMs,
  letterGapMs,
  wordGapMs,
  morseElements,
  morseDurationMs,
} from '../../src/core/timing'

describe('WPM timing (PARIS standard)', () => {
  it('dit = 1200/WPM, dah/gaps are fixed multiples', () => {
    expect(DAH_UNITS).toBe(3)
    expect(ELEMENT_GAP_UNITS).toBe(1)
    expect(LETTER_GAP_UNITS).toBe(3)
    expect(WORD_GAP_UNITS).toBe(7)
  })

  it('derives ms from WPM', () => {
    expect(ditMs(12)).toBe(100)
    expect(dahMs(12)).toBe(300)
    expect(letterGapMs(24)).toBe(150)
    expect(wordGapMs(24)).toBe(350)
  })
})

describe('morseElements', () => {
  it('walks elements with implicit element gaps', () => {
    expect(morseElements('.-')).toEqual([
      { kind: 'dit', gapUnitsBefore: 0 },
      { kind: 'dah', gapUnitsBefore: 1 },
    ])
  })

  it('uses letter gaps (3:1) from spaces', () => {
    expect(morseElements('.- -...')[2]?.gapUnitsBefore).toBe(3)
  })

  it('uses word gaps (7:1) from /, longest separator wins', () => {
    expect(morseElements('.- / -')[2]?.gapUnitsBefore).toBe(7)
    expect(morseElements('. ..  / -')[1]?.gapUnitsBefore).toBe(3)
  })

  it('first element always has gap 0, even with leading separators', () => {
    expect(morseElements(' -- ..--- ')[0]?.gapUnitsBefore).toBe(0)
  })

  it('returns empty for empty input', () => {
    expect(morseElements('')).toEqual([])
    expect(morseElements('/')[0]).toBeUndefined()
  })
})

describe('morseDurationMs', () => {
  it('computes total tone+silence from units', () => {
    // A at 15 WPM: dit = 80; '.-' = 1 + 1 + 3 = 5 units
    expect(morseDurationMs('.-', 15)).toBe(400)
    // E is a single dit
    expect(morseDurationMs('.', 20)).toBe(60)
    // B at 15: dash(3) + 3x dit(1 + gap 1) = 9 units
    expect(morseDurationMs('-...', 15)).toBe(720)
  })

  it('includes letter and word gaps in multi-word output', () => {
    // '. / .' at 60 WPM (dit=20): 1 + 7 + 1 = 9 units
    expect(morseDurationMs('. / .', 60)).toBe(180)
  })

  it('matches known timing for SOS at 15 WPM', () => {
    // ...---...: tone 3x1 + 3x3 + 3x1 = 15 units; gaps 8x1 = 8; total 23 units, dit = 80
    expect(morseDurationMs('...---...', 15)).toBe(1840)
  })

  it('is zero for empty input', () => {
    expect(morseDurationMs('', 15)).toBe(0)
  })
})
