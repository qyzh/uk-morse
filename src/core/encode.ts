import { MORSE_MAP } from './morse-data'

export type Encoded = {
  /** Codes separated by ' ', words by ' / '. */
  morse: string
  /** Characters with no entry, left out of `morse`. First-seen order, no repeats. */
  unsupported: string[]
}

export function encodeText(text: string): Encoded {
  const unsupported = new Set<string>()
  const words: string[] = []
  for (const word of text.split(/\s+/)) {
    const codes: string[] = []
    for (const ch of word) {
      const code = MORSE_MAP[ch.toUpperCase()]
      if (code === undefined) unsupported.add(ch)
      else codes.push(code)
    }
    if (codes.length > 0) words.push(codes.join(' '))
  }
  return { morse: words.join(' / '), unsupported: [...unsupported] }
}
