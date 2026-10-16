/** PARIS standard: dit = 1200 ms / WPM. Dah, gaps are multiples of the dit. */
export const DAH_UNITS = 3
export const ELEMENT_GAP_UNITS = 1
export const LETTER_GAP_UNITS = 3
export const WORD_GAP_UNITS = 7

export function ditMs(wpm: number): number {
  return 1200 / wpm
}

export function dahMs(wpm: number): number {
  return DAH_UNITS * ditMs(wpm)
}

export function letterGapMs(wpm: number): number {
  return LETTER_GAP_UNITS * ditMs(wpm)
}

export function wordGapMs(wpm: number): number {
  return WORD_GAP_UNITS * ditMs(wpm)
}

export type MorseElement = {
  kind: 'dit' | 'dah'
  /** Silence before this element, in dit units (0 for the first element). */
  gapUnitsBefore: number
}

/**
 * Structural walk of a morse string: elements with their preceding gaps.
 * Element gaps are implicit by concatenation ('.-'), letter gaps come from
 * spaces, word gaps from '/'. Overlapping separators keep the longest gap.
 */
export function morseElements(morse: string): MorseElement[] {
  const out: MorseElement[] = []
  let pending = 0
  for (const c of morse) {
    if (c === '.' || c === '-') {
      out.push({
        kind: c === '-' ? 'dah' : 'dit',
        gapUnitsBefore: out.length === 0 ? 0 : Math.max(pending, ELEMENT_GAP_UNITS),
      })
      pending = 0
    } else if (c === ' ') {
      pending = Math.max(pending, LETTER_GAP_UNITS)
    } else if (c === '/') {
      pending = Math.max(pending, WORD_GAP_UNITS)
    }
  }
  return out
}

/** Total audible + silence duration of a morse string, in milliseconds. */
export function morseDurationMs(morse: string, wpm: number): number {
  const dit = ditMs(wpm)
  let units = 0
  for (const el of morseElements(morse)) {
    units += el.gapUnitsBefore + (el.kind === 'dah' ? DAH_UNITS : 1)
  }
  return units * dit
}
