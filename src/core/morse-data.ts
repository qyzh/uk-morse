/**
 * Framework-agnostic morse data + lookup maps (PLAN.md §5, Appendix A).
 *
 * Ambiguity rule: some prosigns share their morse string with punctuation
 * ('AR'/'.-.-.' = '+', 'BT'/'-...-' = '=', 'KN'/'-.--.' = '('). CHAR_MAP keeps
 * the punctuation char (better text round-trips); the colliding prosign stays
 * reachable via MORSE_MAP/encodeChar, and both entries remain in MORSE_LIST.
 */

export type MorseCategory = 'letter' | 'number' | 'punctuation' | 'prosign'

export type MorseEntry = {
  /** 'A', '1', '.', 'SOS' */
  char: string
  /** '.-' */
  morse: string
  category: MorseCategory
  keywords?: string[]
}

export const MORSE_MAP: Record<string, string> = {
  // Letters A–Z
  A: '.-',
  B: '-...',
  C: '-.-.',
  D: '-..',
  E: '.',
  F: '..-.',
  G: '--.',
  H: '....',
  I: '..',
  J: '.---',
  K: '-.-',
  L: '.-..',
  M: '--',
  N: '-.',
  O: '---',
  P: '.--.',
  Q: '--.-',
  R: '.-.',
  S: '...',
  T: '-',
  U: '..-',
  V: '...-',
  W: '.--',
  X: '-..-',
  Y: '-.--',
  Z: '--..',
  // Numbers 0–9
  0: '-----',
  1: '.----',
  2: '..---',
  3: '...--',
  4: '....-',
  5: '.....',
  6: '-....',
  7: '--...',
  8: '---..',
  9: '----.',
  // Punctuation
  '.': '.-.-.-',
  ',': '--..--',
  '?': '..--..',
  "'": '.----.',
  '!': '-.-.--',
  '/': '-..-.',
  '(': '-.--.',
  ')': '-.--.-',
  '&': '.-...',
  ':': '---...',
  ';': '-.-.-.',
  '=': '-...-',
  '+': '.-.-.',
  '-': '-....-',
  _: '..--.-',
  '"': '.-..-.',
  $: '...-..-',
  '@': '.--.-.',
  // Prosigns
  SOS: '...---...',
  AR: '.-.-.',
  BT: '-...-',
  SK: '...-.-',
  KN: '-.--.',
  HH: '........',
}

export const CHAR_MAP: Record<string, string> = {}
for (const [char, morse] of Object.entries(MORSE_MAP)) {
  // First wins: prosigns are declared after punctuation, so punctuation
  // keeps the reverse mapping ('-...-' -> '='). Colliding prosigns stay
  // reachable via MORSE_MAP/encodeChar; unique prosigns (SOS, SK, HH) map fine.
  if (CHAR_MAP[morse] === undefined) CHAR_MAP[morse] = char
}

export const MORSE_LIST: MorseEntry[] = (
  [
    ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((char) => ({
      char,
      category: 'letter' as const,
    })),
    ...'0123456789'.split('').map((char) => ({
      char,
      category: 'number' as const,
    })),
    { char: '.', category: 'punctuation' as const },
    { char: ',', category: 'punctuation' as const },
    { char: '?', category: 'punctuation' as const },
    { char: "'", category: 'punctuation' as const },
    { char: '!', category: 'punctuation' as const },
    { char: '/', category: 'punctuation' as const, keywords: ['slash', 'word space'] },
    { char: '(', category: 'punctuation' as const, keywords: ['open', 'parens', 'KN'] },
    { char: ')', category: 'punctuation' as const, keywords: ['close', 'parens', 'KK'] },
    { char: '&', category: 'punctuation' as const, keywords: ['ampersand', 'AS'] },
    { char: ':', category: 'punctuation' as const },
    { char: ';', category: 'punctuation' as const },
    { char: '=', category: 'punctuation' as const, keywords: ['BT', 'break'] },
    { char: '+', category: 'punctuation' as const, keywords: ['AR', 'end of message'] },
    { char: '-', category: 'punctuation' as const, keywords: ['dash', 'hyphen'] },
    { char: '_', category: 'punctuation' as const, keywords: ['underscore'] },
    { char: '"', category: 'punctuation' as const, keywords: ['quote'] },
    { char: '$', category: 'punctuation' as const, keywords: ['dollar', 'SX'] },
    { char: '@', category: 'punctuation' as const, keywords: ['at', 'AC'] },
    { char: 'SOS', category: 'prosign' as const, keywords: ['distress'] },
    { char: 'AR', category: 'prosign' as const, keywords: ['end of message'] },
    { char: 'BT', category: 'prosign' as const, keywords: ['break', 'new paragraph'] },
    { char: 'SK', category: 'prosign' as const, keywords: ['end of contact', 'VA'] },
    { char: 'KN', category: 'prosign' as const, keywords: ['invite specific station'] },
    { char: 'HH', category: 'prosign' as const, keywords: ['error', 'correction'] },
  ] satisfies Omit<MorseEntry, 'morse'>[]
).map((entry) => ({ ...entry, morse: MORSE_MAP[entry.char]! }))

/** Longest morse string in the data — bound for longest-match decoding. */
export const MAX_MORSE_LENGTH = Math.max(...Object.keys(CHAR_MAP).map((k) => k.length))

/** Accept common dit/dah spellings, canonicalize to '.' and '-'. */
export function normalizeMorse(morse: string): string {
  return morse.replace(/[·•●]/g, '.').replace(/[−—–_]/g, '-').trim()
}
