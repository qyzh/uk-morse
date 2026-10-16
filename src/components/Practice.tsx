import { useCallback, useEffect, useRef, useState } from 'react'
import { MORSE_LIST, type MorseEntry } from '../core/morse-data'
import { useArrowBuffer } from '../hooks/useArrowBuffer'
import { useMorseAudio } from '../hooks/useMorseAudio'
import { useSettingsStore } from '../store/settingsStore'
import { PlayIcon, RotateIcon } from './icons'
import { Button, Feedback, InputPad, Kbd, Panel, ScoreStrip, Segmented } from './ui'
import type { FeedbackState } from './ui'

const letters = MORSE_LIST.filter((e) => e.category === 'letter')

function randomEntry(): MorseEntry {
  return letters[Math.floor(Math.random() * letters.length)]!
}

const SPEED_SECONDS = 30

function formatTime(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

type Mode = 'encode' | 'decode' | 'speed'

const MODES = [
  { value: 'encode', label: 'Encode' },
  { value: 'decode', label: 'Decode' },
  { value: 'speed', label: 'Speed test' },
] as const satisfies ReadonlyArray<{ value: Mode; label: string }>

export function Practice() {
  const autoCommitMs = useSettingsStore((s) => s.autoCommitMs)
  const { play, beep } = useMorseAudio()
  const [mode, setMode] = useState<Mode>('encode')

  /* ---------- Encode drill ---------- */
  const [encTarget, setEncTarget] = useState(randomEntry)
  const [encScore, setEncScore] = useState(0)
  const [encTotal, setEncTotal] = useState(0)
  const [encFeedback, setEncFeedback] = useState<FeedbackState>(null)

  const advanceEnc = useCallback(() => {
    window.setTimeout(() => {
      setEncTarget(randomEntry())
      setEncFeedback(null)
    }, 450)
  }, [])

  const {
    buffer: encBuffer,
    push: encPush,
    commit: encCommit,
    enter: encEnter,
    backspace: encBackspace,
  } = useArrowBuffer({
    enabled: mode === 'encode',
    autoCommitMs,
    onBeep: beep,
    onCommit: (char) => {
      setEncTotal((t) => t + 1)
      if (char === encTarget.char) {
        setEncScore((s) => s + 1)
        setEncFeedback({ kind: 'ok', text: 'Benar!' })
      } else {
        setEncFeedback({ kind: 'bad', text: `Salah — target ${encTarget.char}` })
      }
      advanceEnc()
    },
  })
  const encMobile = mode === 'encode'

  /* ---------- Decode drill ---------- */
  const [dec, setDec] = useState(randomEntry)
  const [decAnswer, setDecAnswer] = useState('')
  const [decScore, setDecScore] = useState(0)
  const [decTotal, setDecTotal] = useState(0)
  const [decFeedback, setDecFeedback] = useState<FeedbackState>(null)
  const answerRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    answerRef.current?.focus()
  }, [dec])

  const nextDec = useCallback(() => {
    window.setTimeout(() => {
      setDec(randomEntry())
      setDecAnswer('')
      setDecFeedback(null)
    }, 450)
  }, [])

  const submitDec = useCallback(() => {
    const guess = decAnswer.trim().toUpperCase()
    if (!guess) return
    setDecTotal((t) => t + 1)
    if (guess === dec.char) {
      setDecScore((s) => s + 1)
      setDecFeedback({ kind: 'ok', text: 'Benar!' })
    } else {
      setDecFeedback({ kind: 'bad', text: `Salah — jawabannya ${dec.char}` })
    }
    nextDec()
  }, [dec, decAnswer, nextDec])

  /* ---------- Speed test ---------- */
  const [speedActive, setSpeedActive] = useState(false)
  const [speedDone, setSpeedDone] = useState(false)
  const [speedTime, setSpeedTime] = useState(SPEED_SECONDS)
  const [speedTarget, setSpeedTarget] = useState(randomEntry)
  const [speedScore, setSpeedScore] = useState(0)
  const [speedTotal, setSpeedTotal] = useState(0)
  const finishTimer = useRef<number | undefined>(undefined)

  useEffect(
    () => () => {
      window.clearTimeout(finishTimer.current)
    },
    [],
  )

  // countdown ticks; the finish transition is scheduled from startSpeed()
  useEffect(() => {
    if (!speedActive || mode !== 'speed') return
    const id = window.setInterval(() => {
      setSpeedTime((t) => Math.max(0, t - 1))
    }, 1000)
    return () => window.clearInterval(id)
  }, [speedActive, mode])

  const {
    buffer: speedBuffer,
    push: speedPush,
    commit: speedCommit,
    enter: speedEnter,
    backspace: speedBackspace,
    reset: speedReset,
  } = useArrowBuffer({
    enabled: mode === 'speed' && speedActive,
    autoCommitMs,
    onBeep: beep,
    onCommit: (char) => {
      setSpeedTotal((t) => t + 1)
      if (char === speedTarget.char) setSpeedScore((s) => s + 1)
      setSpeedTarget(randomEntry())
    },
  })

  const startSpeed = () => {
    speedReset()
    setSpeedScore(0)
    setSpeedTotal(0)
    setSpeedTime(SPEED_SECONDS)
    setSpeedTarget(randomEntry())
    setSpeedDone(false)
    setSpeedActive(true)
    window.clearTimeout(finishTimer.current)
    finishTimer.current = window.setTimeout(() => {
      setSpeedActive(false)
      setSpeedDone(true)
    }, SPEED_SECONDS * 1000)
  }

  const changeMode = (next: Mode) => {
    if (next === mode) return
    if (speedActive) {
      window.clearTimeout(finishTimer.current)
      setSpeedActive(false)
      setSpeedDone(false)
      setSpeedTime(SPEED_SECONDS)
    }
    setMode(next)
  }

  const accuracy = speedTotal > 0 ? Math.round((speedScore / speedTotal) * 100) : 0
  const wpm = Math.round((speedScore / 5) / (SPEED_SECONDS / 60))

  return (
    <div className="space-y-5">
      <Segmented label="Mode latihan" value={mode} options={MODES} onChange={changeMode} />

      {mode === 'encode' && (
        <>
          <Panel className="flex flex-col items-center gap-5 p-6 sm:p-8">
            <h2 className="text-xs font-medium uppercase tracking-wider text-ink-3">
              Encode — ketik morse dari huruf ini
            </h2>
            <p className="font-mono text-6xl text-signal-text glow-signal">{encTarget.char}</p>
            <p className={'min-h-9 font-mono text-2xl tracking-[0.18em] ' + (encBuffer ? 'text-ink' : 'text-ink-3')}>
              {encBuffer || (
                <span className="font-sans text-sm tracking-normal">
                  <Kbd>←</Kbd> dit · <Kbd>→</Kbd> dah · <Kbd>Space</Kbd> commit
                </span>
              )}
            </p>
            <Feedback state={encFeedback} />
            <ScoreStrip score={encScore} total={encTotal} />
          </Panel>
          {encMobile && (
            <Panel className="p-4 md:hidden">
              <InputPad
                onDit={() => encPush('.')}
                onDah={() => encPush('-')}
                onCommit={encCommit}
                commitDisabled={encBuffer.length === 0}
                onSpace={encEnter}
                onBackspace={encBackspace}
              />
            </Panel>
          )}
        </>
      )}

      {mode === 'decode' && (
        <Panel className="flex flex-col items-center gap-5 p-6 sm:p-8">
          <h2 className="text-xs font-medium uppercase tracking-wider text-ink-3">
            Decode — baca atau dengar, lalu ketik hurufnya
          </h2>
          <div className="flex items-center gap-3">
            <p className="font-mono text-4xl tracking-[0.2em] text-signal-text glow-signal sm:text-5xl">
              {dec.morse}
            </p>
            <Button
              variant="secondary"
              size="icon"
              className="rounded-full"
              onClick={() => play(dec.morse)}
              aria-label="Putar audio morse ini"
            >
              <PlayIcon className="size-4" />
            </Button>
          </div>
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              submitDec()
            }}
          >
            <label htmlFor="decode-answer" className="sr-only">
              Jawaban huruf
            </label>
            <input
              id="decode-answer"
              ref={answerRef}
              value={decAnswer}
              onChange={(e) => setDecAnswer(e.target.value.toUpperCase())}
              disabled={decFeedback !== null}
              maxLength={8}
              autoComplete="off"
              spellCheck={false}
              autoCapitalize="characters"
              placeholder="?"
              className="h-11 w-24 rounded-lg border border-edge bg-surface-2 text-center font-mono text-lg uppercase text-ink placeholder:text-ink-3 disabled:opacity-50"
            />
            <Button type="submit" variant="primary" disabled={decFeedback !== null || decAnswer.trim() === ''}>
              Periksa
            </Button>
          </form>
          <Feedback state={decFeedback} />
          <ScoreStrip score={decScore} total={decTotal} />
        </Panel>
      )}

      {mode === 'speed' && (
        <>
          <Panel className="flex flex-col items-center gap-5 p-6 sm:p-8">
            <h2 className="text-xs font-medium uppercase tracking-wider text-ink-3">
              Speed test — {SPEED_SECONDS} detik, kejar skor sebanyak mungkin
            </h2>

            {!speedActive && !speedDone && (
              <>
                <p className="max-w-md text-center text-sm text-ink-3">
                  Huruf muncul satu per satu. Ketik morse-nya dengan panah, lalu <Kbd>Space</Kbd>{' '}
                  untuk commit. Skor dihitung dari huruf benar.
                </p>
                <Button variant="primary" size="lg" onClick={startSpeed}>
                  <PlayIcon className="size-4" />
                  Mulai {SPEED_SECONDS} detik
                </Button>
              </>
            )}

            {speedActive && (
              <>
                <div className="w-full max-w-xs">
                  <div className="mb-1.5 flex items-baseline justify-between">
                    <span className="text-xs uppercase tracking-wider text-ink-3">Waktu</span>
                    <span
                      role="timer"
                      aria-label="Sisa waktu"
                      className="font-mono text-2xl tabular-nums text-ink"
                    >
                      {formatTime(speedTime)}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full bg-signal transition-[width] duration-1000 ease-linear"
                      style={{ width: `${(speedTime / SPEED_SECONDS) * 100}%` }}
                    />
                  </div>
                </div>
                <p className="font-mono text-6xl text-signal-text glow-signal">{speedTarget.char}</p>
                <p className={'min-h-9 font-mono text-2xl tracking-[0.18em] ' + (speedBuffer ? 'text-ink' : 'text-ink-3')}>
                  {speedBuffer || '…'}
                </p>
                <ScoreStrip score={speedScore} total={speedTotal} />
              </>
            )}

            {speedDone && (
              <div role="status" aria-live="polite" className="flex flex-col items-center gap-4">
                <p className="text-xs uppercase tracking-wider text-ink-3">Hasil</p>
                {speedTotal === 0 ? (
                  <p className="text-sm text-ink-3">Tidak ada input sama sekali. Coba lagi, pelan-pelan dulu.</p>
                ) : (
                  <>
                    <p className="font-mono text-5xl tabular-nums text-signal-text glow-signal">
                      {wpm}
                      <span className="ml-2 text-lg text-ink-3">WPM</span>
                    </p>
                    <p className="text-sm text-ink-2">
                      {speedScore} benar dari {speedTotal} soal · akurasi {accuracy}%
                    </p>
                  </>
                )}
                <Button variant="secondary" onClick={startSpeed}>
                  <RotateIcon className="size-4" />
                  Main lagi
                </Button>
              </div>
            )}
          </Panel>
          {speedActive && (
            <Panel className="p-4 md:hidden">
              <InputPad
                onDit={() => speedPush('.')}
                onDah={() => speedPush('-')}
                onCommit={speedCommit}
                commitDisabled={speedBuffer.length === 0}
                onSpace={speedEnter}
                onBackspace={speedBackspace}
              />
            </Panel>
          )}
        </>
      )}
    </div>
  )
}
