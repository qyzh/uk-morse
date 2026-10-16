import { CHAR_MAP, MAX_MORSE_LENGTH, normalizeMorse } from './morse-data'

export const UNKNOWN = '?'

/** One token (no spaces) → char. Case comes straight from CHAR_MAP. */
export function decodeSymbol(token: string): string {
  return CHAR_MAP[normalizeMorse(token)] ?? UNKNOWN
}

/**
 * Greedy longest-match decode of a stream without separators (plan §5).
 * Handles prosigns like '...---...' (SOS) as one symbol.
 */
export function decodeStream(stream: string): string {
  const s = normalizeMorse(stream)
  let out = ''
  let i = 0
  while (i < s.length) {
    let matched: string | null = null
    for (let len = Math.min(MAX_MORSE_LENGTH, s.length - i); len > 0; len--) {
      const ch = CHAR_MAP[s.slice(i, i + len)]
      if (ch !== undefined) {
        matched = ch
        i += len
        break
      }
    }
    if (matched === null) {
      out += UNKNOWN
      i++
    } else {
      out += matched
    }
  }
  return out
}

/** Word (tokens separated by ' ') → chars. Single-token words go through the stream decoder. */
export function decodeWord(word: string): string {
  const tokens = normalizeMorse(word).split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return ''
  if (tokens.length === 1) return decodeStream(tokens[0]!)
  return tokens.map(decodeSymbol).join('')
}

/** Morse text → human text. '/' is the word separator (plan spec). */
export function decodeText(text: string): string {
  return text
    .split('/')
    .map(decodeWord)
    .join(' ')
    .trim()
}
