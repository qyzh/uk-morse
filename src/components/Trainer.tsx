import { useEffect, useState } from 'react'
import { decodeCode } from '../core/decode'
import { WORD_GAP, transcriptMorse, transcriptText } from '../core/transcript'
import type { Transcript } from '../core/transcript'
import { useMorseAudio } from '../hooks/useMorseAudio'
import { useMorseKeyboard } from '../hooks/useMorseKeyboard'
import { createMorseInput } from '../input/morse-input'
import { useSettingsStore } from '../store/settingsStore'
import { PlayIcon, XIcon } from './icons'
import { Button, InputPad, Kbd, Led, PageTitle } from './ui'

const SHORTCUTS: Array<[string, string]> = [
  ['←', 'dit'],
  ['→', 'dah'],
  ['Space', 'commit huruf'],
  ['Enter', 'spasi'],
  ['⌫', 'hapus'],
  ['Esc', 'reset'],
]

/** A flag that lowers itself `ms` after it was last raised. */
function useFlash(ms: number) {
  const [raised, setRaised] = useState(0)

  useEffect(() => {
    if (raised === 0) return
    const id = window.setTimeout(() => setRaised(0), ms)
    return () => window.clearTimeout(id)
  }, [raised, ms])

  const setFlash = (on: boolean) => setRaised((n) => (on ? n + 1 : 0))
  return [raised > 0, setFlash] as const
}

export function Trainer() {
  const { play, beep } = useMorseAudio()
  const [transcript, setTranscript] = useState<Transcript>([])
  const [lit, setLit] = useFlash(200)
  const [invalid, setInvalid] = useFlash(1400)

  const [input] = useState(() =>
    createMorseInput({
      autoCommitMs: () => useSettingsStore.getState().autoCommitMs,
      onElement: (kind) => {
        beep(kind)
        setLit(true)
      },
      onCommit: (entry) => {
        if (entry === null) {
          setInvalid(true)
          return
        }
        setInvalid(false)
        setTranscript((t) => [...t, entry])
      },
      onWordGap: () => setTranscript((t) => [...t, WORD_GAP]),
      onBackspaceEmpty: () => setTranscript((t) => t.slice(0, -1)),
    }),
  )
  const buffer = useMorseKeyboard(input)

  const preview = buffer ? decodeCode(buffer) : null
  const empty = transcript.length === 0
  const nothingToPlay = transcript.every((item) => item === WORD_GAP)

  return (
    <div className="space-y-10">
      <section>
        <PageTitle>Ketuk Morse dengan tombol panah.</PageTitle>
        <p className="mt-4 max-w-md text-base text-ink-2">
          Tekan dit dan dah, lalu commit untuk menjadikannya huruf.
        </p>

        <div className="mt-10 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm text-ink-3">
            <span aria-hidden="true" className="select-none text-ink-3/70">
              //
            </span>
            <Led on={lit || buffer.length > 0} />
            <span>simbol aktif</span>
          </h2>
          {invalid && (
            <span role="status" className="flex items-center gap-1.5 text-sm text-danger-text">
              <XIcon className="size-3.5" />
              Simbol tidak dikenal
            </span>
          )}
        </div>

        <p
          className={
            'mt-3 min-h-16 break-all font-mono text-4xl tracking-[0.18em] sm:text-6xl ' +
            (buffer ? 'text-signal-text glow-signal' : 'text-ink-3')
          }
        >
          {buffer || (
            <span className="text-base tracking-normal">
              Belum ada simbol — tekan <Kbd>←</Kbd> untuk dit, <Kbd>→</Kbd> untuk dah.
            </span>
          )}
        </p>

        <div className="mt-2 flex min-h-7 items-center">
          {buffer && (
            <span className="inline-flex items-center gap-2 font-mono text-sm">
              <span className="text-ink-3">=</span>
              {preview ? (
                <span className="text-ink">{preview.char}</span>
              ) : (
                <span className="text-danger-text">tidak dikenal</span>
              )}
            </span>
          )}
        </div>

        <ul className="mt-6 hidden flex-wrap gap-x-5 gap-y-2 text-sm text-ink-3 pointer-fine:md:flex">
          {SHORTCUTS.map(([key, label]) => (
            <li key={key} className="inline-flex items-center gap-1.5">
              <Kbd>{key}</Kbd> {label}
            </li>
          ))}
        </ul>

        <InputPad
          className="mt-6 pointer-fine:md:hidden"
          onDit={input.dit}
          onDah={input.dah}
          onCommit={input.commit}
          commitDisabled={buffer.length === 0}
          onSpace={input.wordGap}
          onBackspace={input.backspace}
        />
      </section>

      <section className="border-t border-edge pt-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm text-ink-3">
            <span aria-hidden="true" className="select-none text-ink-3/70">
              //
            </span>
            <span>hasil decode</span>
          </h2>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => setTranscript([])} disabled={empty}>
              Bersihkan
            </Button>
            <Button size="sm" variant="primary" onClick={() => play(transcriptMorse(transcript))} disabled={nothingToPlay}>
              <PlayIcon className="size-3.5" />
              Putar
            </Button>
          </div>
        </div>
        <div role="status" aria-live="polite" className="mt-3 min-h-10">
          {empty ? (
            <p className="text-base text-ink-3">Teks hasil decode muncul di sini.</p>
          ) : (
            <p className="whitespace-pre-wrap wrap-break-word font-mono text-2xl sm:text-3xl">{transcriptText(transcript)}</p>
          )}
        </div>
      </section>
    </div>
  )
}
