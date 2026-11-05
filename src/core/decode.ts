import { CHAR_MAP, MORSE_LIST, normalizeMorse, type MorseEntry } from './morse-data'

const ENTRY_BY_CHAR = new Map(MORSE_LIST.map((entry) => [entry.char, entry]))

/** The entry for a code, or null for unknown input. */
export function decodeCode(code: string): MorseEntry | null {
  const char = CHAR_MAP[normalizeMorse(code)]
  return char === undefined ? null : ENTRY_BY_CHAR.get(char)!
}
