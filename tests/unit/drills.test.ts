import { describe, expect, it } from 'vitest'
import {
  EASY_POOL,
  LETTER_POOL,
  LETTERS_BY_FREQUENCY,
  accuracy,
  pickTarget,
  wpmOf,
} from '../../src/core/drills'

describe('drills pools', () => {
  it('EASY_POOL covers the first six letters (plan §3.3 adaptive)', () => {
    expect(EASY_POOL).toEqual(['E', 'T', 'I', 'A', 'N', 'M'])
  })

  it('LETTERS_BY_FREQUENCY starts with E T I A N and has 26 unique letters', () => {
    expect(LETTERS_BY_FREQUENCY.slice(0, 5)).toEqual(['E', 'T', 'I', 'A', 'N'])
    expect(new Set(LETTERS_BY_FREQUENCY).size).toBe(26)
    expect(LETTER_POOL).toHaveLength(26)
  })
})

describe('pickTarget', () => {
  it('always returns a member of the pool', () => {
    for (let i = 0; i < 200; i++) {
      expect(pickTarget(EASY_POOL)).toSatisfy((c: string) => EASY_POOL.includes(c))
    }
  })

  it('excludes the last target when possible', () => {
    for (let i = 0; i < 100; i++) {
      expect(pickTarget(['A', 'B'], 'A')).toBe('B')
    }
    expect(pickTarget(['A'], 'A')).toBe('A') // single-item falls back
  })
})

describe('accuracy', () => {
  it('rounds to whole percents, 0 percent when nothing attempted', () => {
    expect(accuracy(1, 3)).toBe(33)
    expect(accuracy(3, 3)).toBe(100)
    expect(accuracy(0, 0)).toBe(0)
    expect(accuracy(0, 7)).toBe(0)
  })
})

describe('wpmOf (chars/5 per minute)', () => {
  it('5 chars/min = 1 WPM', () => {
    expect(wpmOf(5, 60)).toBe(1)
    expect(wpmOf(100, 60)).toBe(20)
  })

  it('handles fractional minutes and zero guards', () => {
    expect(wpmOf(25, 30)).toBe(10)
    expect(wpmOf(0, 60)).toBe(0)
    expect(wpmOf(50, 0)).toBe(0)
    expect(wpmOf(50, -1)).toBe(0)
  })
})
