import { useEffect, useRef, useState } from 'react'
import { encodeText } from '../core/encode'
import { MORSE_MAP } from '../core/morse-data'
import { useMorseAudio } from '../hooks/useMorseAudio'
import { AlertIcon, CheckIcon, CopyIcon, PlayIcon } from './icons'
import { Button, Panel } from './ui'

export function Encoder() {
  const { play } = useMorseAudio()
  const [text, setText] = useState('HELLO WORLD')
  const [copied, setCopied] = useState(false)
  const copyTimer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(copyTimer.current), [])

  const morse = encodeText(text)
  const unknown = [...new Set([...text.toUpperCase()].filter((ch) => ch !== ' ' && !(ch in MORSE_MAP)))]

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(morse)
      setCopied(true)
      window.clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="space-y-5">
      <Panel className="p-5 sm:p-6">
        <label
          htmlFor="encoder-text"
          className="mb-2 block text-xs font-medium uppercase tracking-wider text-ink-3"
        >
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
          className="w-full resize-y rounded-lg border border-edge bg-surface-2 p-3 font-mono text-base text-ink placeholder:text-ink-3"
        />
        {unknown.length > 0 && (
          <p className="mt-3 flex items-start gap-2 rounded-lg border border-warn/40 bg-warn/10 p-3 text-sm text-warn">
            <AlertIcon className="mt-0.5 size-4 shrink-0" />
            <span>
              Belum didukung dan diabaikan:{' '}
              <span className="font-mono">{unknown.join(' ')}</span>
            </span>
          </p>
        )}
      </Panel>

      <Panel className="p-5 sm:p-6">
        <h2 className="text-xs font-medium uppercase tracking-wider text-ink-3">Morse</h2>
        <div className="mt-2 min-h-10">
          {morse ? (
            <p className="break-all font-mono text-lg tracking-[0.12em] text-signal-text sm:text-xl">
              {morse}
            </p>
          ) : (
            <p className="text-sm text-ink-3">Tulis teks di atas — hasil morse muncul di sini.</p>
          )}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => play(morse)} disabled={!morse}>
            <PlayIcon className="size-4" />
            Putar morse
          </Button>
          <Button variant="secondary" onClick={copy} disabled={!morse}>
            {copied ? (
              <>
                <CheckIcon className="size-4 text-signal-text" />
                Tersalin
              </>
            ) : (
              <>
                <CopyIcon className="size-4" />
                Salin
              </>
            )}
          </Button>
          {copied && (
            <span role="status" className="sr-only">
              Morse disalin ke clipboard
            </span>
          )}
        </div>
      </Panel>
    </div>
  )
}
