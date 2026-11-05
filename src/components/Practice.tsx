import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { accuracy } from '../core/drills'
import { useMorseAudio } from '../hooks/useMorseAudio'
import { useMorseKeyboard } from '../hooks/useMorseKeyboard'
import { createPracticeSession } from '../practice/practice-session'
import type { Drill, PracticeMode } from '../practice/practice-session'
import { SPEED_DURATIONS, useProgressStore } from '../store/progressStore'
import type { SpeedDuration } from '../store/progressStore'
import { useSettingsStore } from '../store/settingsStore'
import { cx } from './cx'
import { CheckIcon, PlayIcon, RotateIcon } from './icons'
import { Button, FIELD, Feedback, InputPad, Kbd, PageTitle, Readouts, ScoreStrip, Segmented } from './ui'
import type { FeedbackState } from './ui'

function formatTime(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

const MODES = [
  { value: 'encode', label: 'Encode' },
  { value: 'decode', label: 'Decode' },
  { value: 'speed', label: 'Speed test' },
] as const satisfies ReadonlyArray<{ value: PracticeMode; label: string }>

const DURATIONS = SPEED_DURATIONS.map((seconds) => ({
  value: String(seconds),
  label: `${seconds} detik`,
}))

function drillFeedback(drill: Drill, wrongLabel: string): FeedbackState {
  if (drill.outcome === null) return null
  if (drill.outcome === 'correct') return { kind: 'ok', text: 'Benar!' }
  return { kind: 'bad', text: `Salah — ${wrongLabel} ${drill.target.char}` }
}

/** Lifetime progress across both drills. */
function DrillProgress() {
  const correct = useProgressStore((s) => s.drillsCorrect)
  const total = useProgressStore((s) => s.drillsTotal)
  const bestStreak = useProgressStore((s) => s.bestStreak)
  return (
    <Readouts
      items={[
        ['riwayat:', total > 0 ? `${correct}/${total} (${accuracy(correct, total)}%)` : '—'],
        ['streak terbaik:', bestStreak],
      ]}
    />
  )
}

export function Practice() {
  const { play, beep, stop } = useMorseAudio()
  const [session] = useState(() =>
    createPracticeSession({
      autoCommitMs: () => useSettingsStore.getState().autoCommitMs,
      beep,
      stopAudio: stop,
      progress: useProgressStore.getState(),
    }),
  )
  const { mode, encode, decode, decodeAnswer, speed } = useSyncExternalStore(
    session.subscribe,
    session.getState,
    session.getState,
  )
  const buffer = useMorseKeyboard(session.input)
  const bestWpm = useProgressStore((s) => s.bestWpm[speed.durationS])
  const answerRef = useRef<HTMLInputElement>(null)

  useEffect(() => session.dispose, [session])

  // The answer box loses focus while it's disabled between rounds.
  useEffect(() => {
    answerRef.current?.focus()
  }, [mode, decode.round])

  const decodeLocked = decode.outcome !== null

  const inputPad = (commitDisabled: boolean) => (
    <InputPad
      className="pointer-fine:md:hidden"
      onDit={session.input.dit}
      onDah={session.input.dah}
      onCommit={session.input.commit}
      commitDisabled={commitDisabled}
      onSpace={session.input.wordGap}
      onBackspace={session.input.backspace}
    />
  )

  return (
    <div className="space-y-8">
      <header>
        <PageTitle>Latih telinga dan jarimu.</PageTitle>
      </header>

      <Segmented label="Mode latihan" value={mode} options={MODES} onChange={session.setMode} />

      {mode === 'encode' && (
        <>
          <section className="flex flex-col items-start gap-5 border-t border-edge pt-6">
            <h2 className="text-sm text-ink-3">
              <span aria-hidden="true" className="mr-2 select-none text-ink-3/70">//</span>
              encode — ketik morse dari huruf ini
            </h2>
            <p className="font-mono text-6xl text-ink">{encode.target.char}</p>
            <p className={'min-h-9 font-mono text-2xl tracking-[0.18em] ' + (buffer ? 'text-signal-text' : 'text-ink-3')}>
              {buffer || (
                <span className="font-sans text-sm tracking-normal">
                  <Kbd>←</Kbd> dit · <Kbd>→</Kbd> dah · <Kbd>Space</Kbd> commit
                </span>
              )}
            </p>
            <Feedback state={drillFeedback(encode, 'target')} />
            <ScoreStrip score={encode.score} total={encode.total} />
            <DrillProgress />
          </section>
          {inputPad(buffer.length === 0 || encode.outcome !== null)}
        </>
      )}

      {mode === 'decode' && (
        <section className="flex flex-col items-start gap-5 border-t border-edge pt-6">
          <h2 className="text-sm text-ink-3">
            <span aria-hidden="true" className="mr-2 select-none text-ink-3/70">//</span>
            decode — baca atau dengar, lalu ketik hurufnya
          </h2>
          <div className="flex items-center gap-3">
            <p className="font-mono text-4xl tracking-[0.2em] text-ink sm:text-5xl">
              {decode.target.morse}
            </p>
            <Button
              variant="secondary"
              size="icon"
              onClick={() => play(decode.target.morse)}
              aria-label="Putar audio morse ini"
            >
              <PlayIcon className="size-4" />
            </Button>
          </div>
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              session.submitDecodeAnswer()
            }}
          >
            <label htmlFor="decode-answer" className="sr-only">
              Jawaban huruf
            </label>
            <input
              id="decode-answer"
              ref={answerRef}
              value={decodeAnswer}
              onChange={(e) => session.setDecodeAnswer(e.target.value)}
              disabled={decodeLocked}
              maxLength={8}
              autoComplete="off"
              spellCheck={false}
              autoCapitalize="characters"
              placeholder="?"
              className={cx(FIELD, 'h-11 w-24 text-center font-mono text-lg uppercase disabled:opacity-50')}
            />
            <Button type="submit" variant="primary" disabled={decodeLocked || decodeAnswer.trim() === ''}>
              Periksa
            </Button>
          </form>
          <Feedback state={drillFeedback(decode, 'jawabannya')} />
          <ScoreStrip score={decode.score} total={decode.total} />
          <DrillProgress />
        </section>
      )}

      {mode === 'speed' && (
        <>
          <section className="flex flex-col items-start gap-5 border-t border-edge pt-6">
            <h2 className="text-sm text-ink-3">
              <span aria-hidden="true" className="mr-2 select-none text-ink-3/70">//</span>
              speed test — {speed.durationS} detik, kejar skor sebanyak mungkin
            </h2>

            {speed.phase !== 'running' && (
              <Segmented
                label="Durasi speed test"
                value={String(speed.durationS)}
                options={DURATIONS}
                onChange={(value) => session.setSpeedDuration(Number(value) as SpeedDuration)}
              />
            )}

            {speed.phase === 'ready' && (
              <>
                <p className="max-w-md text-base text-ink-2">
                  Huruf muncul satu per satu. Ketik morse-nya dengan panah, lalu <Kbd>Space</Kbd>{' '}
                  untuk commit. Skor dihitung dari huruf benar.
                </p>
                <Button variant="primary" size="lg" onClick={session.startSpeedTest}>
                  <PlayIcon className="size-4" />
                  Mulai {speed.durationS} detik
                </Button>
                <Readouts items={[[`rekor ${speed.durationS} detik:`, `${bestWpm} WPM`]]} />
              </>
            )}

            {speed.phase !== 'ready' && (
              <div className="w-full max-w-xs">
                <div className="mb-1.5 flex items-baseline justify-between">
                  <span className="text-sm text-ink-3">waktu</span>
                  <span
                    role="timer"
                    aria-label="Sisa waktu"
                    className="font-mono text-2xl tabular-nums text-ink"
                  >
                    {formatTime(speed.remainingS)}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden bg-surface-2">
                  <div
                    className="h-full bg-ink-2 transition-[width] duration-1000 ease-linear"
                    style={{ width: `${(speed.remainingS / speed.durationS) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {speed.phase === 'running' && (
              <>
                <p className="font-mono text-6xl text-ink">{speed.target.char}</p>
                <p className={'min-h-9 font-mono text-2xl tracking-[0.18em] ' + (buffer ? 'text-signal-text' : 'text-ink-3')}>
                  {buffer || '…'}
                </p>
                <ScoreStrip score={speed.score} total={speed.total} />
              </>
            )}

            {speed.phase === 'done' && speed.result && (
              <div role="status" aria-live="polite" className="flex flex-col items-start gap-4">
                <p className="text-sm text-ink-3">
                  <span aria-hidden="true" className="mr-2 select-none text-ink-3/70">//</span>
                  hasil
                </p>
                {speed.total === 0 ? (
                  <p className="text-base text-ink-3">Tidak ada input sama sekali. Coba lagi, pelan-pelan dulu.</p>
                ) : (
                  <>
                    <p className="font-mono text-5xl tabular-nums text-ink">
                      {speed.result.wpm}
                      <span className="ml-2 text-lg text-ink-3">WPM</span>
                    </p>
                    <p className="text-base text-ink-2">
                      {speed.score} benar dari {speed.total} soal · akurasi {accuracy(speed.score, speed.total)}%
                    </p>
                    {speed.result.isRecord ? (
                      <p className="flex items-center gap-1.5 text-sm text-signal-text">
                        <CheckIcon className="size-4 shrink-0" />
                        Rekor baru!
                      </p>
                    ) : (
                      <Readouts items={[[`rekor ${speed.durationS} detik:`, `${speed.result.best} WPM`]]} />
                    )}
                  </>
                )}
                <Button variant="secondary" onClick={session.startSpeedTest}>
                  <RotateIcon className="size-4" />
                  Main lagi
                </Button>
              </div>
            )}
          </section>
          {speed.phase === 'running' && inputPad(buffer.length === 0)}
        </>
      )}
    </div>
  )
}
