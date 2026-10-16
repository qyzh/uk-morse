/** Drill helpers (plan §3.3): target picking, scoring, WPM formula, pools. */
import { MORSE_LIST } from './morse-data'

/** Letters ordered by CW learning frequency (E T first — plan "adaptive difficulty"). */
export const LETTERS_BY_FREQUENCY = [
  ...'ETIANMSURWDHGOVKFBLZPQCXYJ'.split(''),
]
/** Starter pool for drills (easiest letters first). */
export const EASY_POOL = ['E', 'T', 'I', 'A', 'N', 'M']

export const LETTER_POOL = MORSE_LIST.filter((e) => e.category === 'letter').map((e) => e.char)

export function pickTarget(pool: string[] = LETTER_POOL, exclude?: string): string {
  const candidates = exclude === undefined ? pool : pool.filter((c) => c !== exclude)
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
