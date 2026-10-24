import { useCallback, useEffect, useRef, useState } from 'react'
import { decodeSymbol } from '../core/decode'
import { useArrowBuffer } from '../hooks/useArrowBuffer'
import { useMorseAudio } from '../hooks/useMorseAudio'
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

export function Trainer() {
  const autoCommitMs = useSettingsStore((s) => s.autoCommitMs)
  const { playChars, beep } = useMorseAudio()
  const [output, setOutput] = useState('')
  const [lit, setLit] = useState(false)
  const [invalid, setInvalid] = useState(false)
  const flashTimer = useRef<number | undefined>(undefined)
  const invalidTimer = useRef<number | undefined>(undefined)

  const flash = useCallback(() => {
    setLit(true)
    window.clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => setLit(false), 200)
  }, [])

  useEffect(
    () => () => {
      window.clearTimeout(flashTimer.current)
      window.clearTimeout(invalidTimer.current)
    },
    [],
  )

  const { buffer, push, commit, enter, backspace } = useArrowBuffer({
    enabled: true,
    autoCommitMs,
    onBeep: (kind) => {
      beep(kind)
      flash()
    },
    onCommit: (char) => {
      if (char === '?') {
        setInvalid(true)
        window.clearTimeout(invalidTimer.current)
        invalidTimer.current = window.setTimeout(() => setInvalid(false), 1400)
        return
      }
      setInvalid(false)
      setOutput((o) => o + char)
    },
    onEnter: () => setOutput((o) => o + ' '),
    onBackspaceEmpty: () => setOutput((o) => o.slice(0, -1)),
  })

  const preview = buffer ? decodeSymbol(buffer) : null
  const empty = output.length === 0

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
          {preview && (
            <span className="inline-flex items-center gap-2 font-mono text-sm">
              <span className="text-ink-3">=</span>
              {preview === '?' ? (
                <span className="text-danger-text">tidak dikenal</span>
              ) : (
                <span className="text-ink">{preview}</span>
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
          onDit={() => push('.')}
          onDah={() => push('-')}
          onCommit={commit}
          commitDisabled={buffer.length === 0}
          onSpace={enter}
          onBackspace={backspace}
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
            <Button size="sm" variant="ghost" onClick={() => setOutput('')} disabled={empty}>
              Bersihkan
            </Button>
            <Button size="sm" variant="primary" onClick={() => playChars(output)} disabled={empty}>
              <PlayIcon className="size-3.5" />
              Putar
            </Button>
          </div>
        </div>
        <div role="status" aria-live="polite" className="mt-3 min-h-10">
          {empty ? (
            <p className="text-base text-ink-3">Teks hasil decode muncul di sini.</p>
          ) : (
            <p className="whitespace-pre-wrap wrap-break-word font-mono text-2xl sm:text-3xl">{output}</p>
          )}
        </div>
      </section>
    </div>
  )
}
