import { MORSE_MAP } from './morse-data'

export const UNKNOWN = '?'

/** Single char (case-insensitive) → morse string, or null when unmapped. */
export function encodeChar(ch: string): string | null {
  if (ch === ' ') return '/'
  return MORSE_MAP[ch.toUpperCase()] ?? null
}

/** Word → dit/dah tokens separated by single spaces; unknown chars → '¿'. */
export function encodeWord(word: string, unknown = UNKNOWN): string {
  return [...word]
    .map((ch) => MORSE_MAP[ch.toUpperCase()] ?? unknown)
    .join(' ')
}

/** Text → morse. Words separated by ' / ' (plan spec: space → '/'). */
export function encodeText(text: string, unknown = UNKNOWN): string {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => encodeWord(word, unknown))
    .join(' / ')
}
