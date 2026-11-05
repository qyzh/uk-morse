/** Drill helpers (plan §3.3): target picking, scoring, WPM formula. */
import { MORSE_LIST, type MorseEntry } from './morse-data'

export const LETTERS: readonly MorseEntry[] = MORSE_LIST.filter((e) => e.category === 'letter')

/** A random entry from the pool, avoiding `exclude` when the pool allows it. */
export function pickTarget(pool: readonly MorseEntry[], exclude?: MorseEntry): MorseEntry {
  const candidates = pool.filter((entry) => entry !== exclude)
  const source = candidates.length > 0 ? candidates : pool
  return source[Math.floor(Math.random() * source.length)]!
}

/** Accuracy percentage 0..100, NaN-free for total = 0. */
export function accuracy(correct: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((correct / total) * 100)
}

/** Speed-test WPM (plan §3.3): (chars / 5) / minutes. */
export function wpmOf(chars: number, seconds: number): number {
  if (seconds <= 0 || chars <= 0) return 0
  return (chars / 5) / (seconds / 60)
}
