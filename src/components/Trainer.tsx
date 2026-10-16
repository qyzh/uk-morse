import { useCallback, useEffect, useRef, useState } from 'react'
import { decodeSymbol } from '../core/decode'
import { useArrowBuffer } from '../hooks/useArrowBuffer'
import { useMorseAudio } from '../hooks/useMorseAudio'
import { useSettingsStore } from '../store/settingsStore'
import { PlayIcon, XIcon } from './icons'
import { Button, InputPad, Kbd, Led, Panel } from './ui'

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
    <div className="space-y-5">
      <Panel className="p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-ink-3">
            <Led on={lit || buffer.length > 0} />
            Simbol aktif
          </h2>
          {invalid && (
            <span role="status" className="flex items-center gap-1.5 text-xs text-danger-text">
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
            <span className="text-sm tracking-normal">
              Belum ada simbol — tekan <Kbd>←</Kbd> untuk dit, <Kbd>→</Kbd> untuk dah.
            </span>
          )}
        </p>

        <div className="mt-2 flex min-h-7 items-center">
          {preview && (
            <span className="inline-flex items-center gap-2 rounded-md border border-edge bg-surface-2 px-2.5 py-1 font-mono text-sm">
              <span className="text-ink-3">=</span>
              {preview === '?' ? (
                <span className="text-danger-text">tidak dikenal</span>
              ) : (
                <span className="text-signal-text">{preview}</span>
              )}
            </span>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-3">
          <span className="inline-flex items-center gap-1.5">
            <Kbd>←</Kbd> dit
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Kbd>→</Kbd> dah
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Kbd>Space</Kbd> commit huruf
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Kbd>Enter</Kbd> spasi
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Kbd>⌫</Kbd> hapus
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Kbd>Esc</Kbd> reset
          </span>
        </div>
      </Panel>

      <Panel className="p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xs font-medium uppercase tracking-wider text-ink-3">Hasil decode</h2>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => playChars(output)} disabled={empty}>
              <PlayIcon className="size-3.5" />
              Putar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setOutput('')} disabled={empty}>
              Bersihkan
            </Button>
          </div>
        </div>
        <div role="status" aria-live="polite" className="mt-2 min-h-10">
          {empty ? (
            <p className="text-sm text-ink-3">Teks hasil decode muncul di sini.</p>
          ) : (
            <p className="whitespace-pre-wrap break-words font-mono text-2xl sm:text-3xl">{output}</p>
          )}
        </div>
      </Panel>

      <Panel className="p-4 md:hidden">
        <InputPad
          onDit={() => push('.')}
          onDah={() => push('-')}
          onCommit={commit}
          commitDisabled={buffer.length === 0}
          onSpace={enter}
          onBackspace={backspace}
        />
      </Panel>
    </div>
  )
}
