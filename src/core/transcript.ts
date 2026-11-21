import type { MorseEntry } from './morse-data'

const WORD_GAP = 'word-gap'

/** One committed entry or word gap. A prosign stays a single item. */
type TranscriptItem = MorseEntry | typeof WORD_GAP
type Transcript = readonly TranscriptItem[]

/** What the Trainer renders: the transcript as text, as morse, and whether it is empty. */
export type TranscriptState = {
  readonly text: string
  readonly morse: string
  readonly empty: boolean
}

export type TranscriptSession = {
  /** Add an entry that has just been committed. */
  append: (entry: MorseEntry) => void
  /** Separate two words. Ignored at the start and after another word gap. */
  wordGap: () => void
  /** Remove the last item, entry or word gap. */
  backspace: () => void
  /** Remove every item. */
  clear: () => void
  getState: () => TranscriptState
  subscribe: (listener: () => void) => () => void
}

const textOf = (transcript: Transcript): string =>
  transcript.map((item) => (item === WORD_GAP ? ' ' : item.char)).join('')

const morseOf = (transcript: Transcript): string =>
  transcript.map((item) => (item === WORD_GAP ? '/' : item.morse)).join(' ')

/**
 * The transcript committed so far in the Trainer: entries and the word gaps
 * between them. Framework-free so the edit rules run in tests; the Trainer
 * reads it through useSyncExternalStore.
 */
export function createTranscript(): TranscriptSession {
  let transcript: Transcript = []
  let state: TranscriptState = { text: '', morse: '', empty: true }
  const listeners = new Set<() => void>()

  const update = (next: Transcript) => {
    transcript = next
    state = {
      text: textOf(transcript),
      morse: morseOf(transcript),
      empty: transcript.length === 0,
    }
    for (const listener of listeners) listener()
  }

  return {
    append(entry) {
      update([...transcript, entry])
    },
    wordGap() {
      if (transcript.length === 0 || transcript[transcript.length - 1] === WORD_GAP) return
      update([...transcript, WORD_GAP])
    },
    backspace() {
      if (transcript.length === 0) return
      update(transcript.slice(0, -1))
    },
    clear() {
      if (transcript.length === 0) return
      update([])
    },
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
