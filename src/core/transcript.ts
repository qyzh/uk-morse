import type { MorseEntry } from './morse-data'

export const WORD_GAP = 'word-gap'

/** One committed entry or word gap. A prosign stays a single item. */
export type TranscriptItem = MorseEntry | typeof WORD_GAP
export type Transcript = readonly TranscriptItem[]

export function transcriptText(transcript: Transcript): string {
  return transcript.map((item) => (item === WORD_GAP ? ' ' : item.char)).join('')
}

export function transcriptMorse(transcript: Transcript): string {
  return transcript.map((item) => (item === WORD_GAP ? '/' : item.morse)).join(' ')
}
