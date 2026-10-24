import { useEffect, useRef, useState } from 'react'
import { encodeText } from '../core/encode'
import { MORSE_MAP } from '../core/morse-data'
import { useMorseAudio } from '../hooks/useMorseAudio'
import { AlertIcon, CheckIcon, CopyIcon, PlayIcon } from './icons'
import { Button, PageTitle } from './ui'

export function Encoder() {
  const { play } = useMorseAudio()
  const [text, setText] = useState('HELLO WORLD')
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle')
  const copyTimer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(copyTimer.current), [])

  const morse = encodeText(text)
  const unknown = [...new Set([...text.toUpperCase()].filter((ch) => ch !== ' ' && !(ch in MORSE_MAP)))]

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(morse)
      setCopyState('copied')
      window.clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => setCopyState('idle'), 1600)
    } catch {
      setCopyState('error')
      window.clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => setCopyState('idle'), 3000)
    }
  }

  return (
    <div className="space-y-10">
      <header>
        <PageTitle>Ubah teks menjadi Morse.</PageTitle>
        <p className="mt-4 max-w-md text-base text-ink-2">Tulis kalimat, dengarkan atau salin polanya.</p>
      </header>

      <section>
        <label htmlFor="encoder-text" className="mb-2 block text-sm text-ink-3">
          Teks
        </label>
        <textarea
          id="encoder-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          spellCheck={false}
          autoComplete="off"
          placeholder="Contoh: SOS dari kapal"
          className="w-full resize-y border-0 border-b border-edge-strong bg-transparent py-2 text-base text-ink transition-colors duration-150 placeholder:text-ink-3 hover:border-ink-3 focus:border-ink-3"
        />
        {unknown.length > 0 && (
          <p className="mt-3 flex items-start gap-2 border-l-2 border-warn/60 bg-warn/5 py-2 pl-3 pr-2 text-base text-warn">
            <AlertIcon className="mt-0.5 size-4 shrink-0" />
            <span>
              Belum didukung dan diabaikan:{' '}
              <span className="font-mono">{unknown.join(' ')}</span>
            </span>
          </p>
        )}
      </section>

      <section className="border-t border-edge pt-6">
        <h2 className="text-sm text-ink-3">
          <span aria-hidden="true" className="mr-2 select-none text-ink-3/70">//</span>
          morse
        </h2>
        <div className="mt-2 min-h-10">
          {morse ? (
            <p className="break-all font-mono text-2xl tracking-[0.12em] text-signal-text sm:text-3xl">
              {morse}
            </p>
          ) : (
            <p className="text-base text-ink-3">Tulis teks di atas — hasil morse muncul di sini.</p>
          )}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => play(morse)} disabled={!morse}>
            <PlayIcon className="size-4" />
            Putar morse
          </Button>
          <Button variant="ghost" onClick={copy} disabled={!morse}>
            {copyState === 'copied' ? (
              <>
                <CheckIcon className="size-4" />
                Tersalin
              </>
            ) : (
              <>
                <CopyIcon className="size-4" />
                Salin
              </>
            )}
          </Button>
          {copyState === 'copied' && (
            <span role="status" className="sr-only">
              Morse disalin ke clipboard
            </span>
          )}
        </div>
        {copyState === 'error' && (
          <p role="status" className="mt-3 flex items-center gap-1.5 text-base text-danger-text">
            <AlertIcon className="size-4 shrink-0" />
            Gagal menyalin ke clipboard — salin morse secara manual.
          </p>
        )}
      </section>
    </div>
  )
}
