import { describe, expect, it } from 'vitest'
import { LETTERS, accuracy, pickTarget, wpmOf } from '../../src/core/drills'

describe('LETTERS', () => {
  it('holds the 26 letter entries', () => {
    expect(LETTERS).toHaveLength(26)
    expect(LETTERS.every((entry) => entry.category === 'letter')).toBe(true)
  })
})

describe('pickTarget', () => {
  const [a, b] = LETTERS

  it('always returns a member of the pool', () => {
    for (let i = 0; i < 200; i++) {
      expect(LETTERS).toContain(pickTarget(LETTERS))
    }
  })

  it('excludes the last target when possible', () => {
    for (let i = 0; i < 100; i++) {
      expect(pickTarget([a!, b!], a)).toBe(b)
    }
    expect(pickTarget([a!], a)).toBe(a) // single-item falls back
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
