import { useCallback, useEffect, useRef, useState } from 'react'
import { MORSE_LIST } from '../core/morse-data'
import { accuracy, pickTarget } from '../core/drills'
import { useArrowBuffer } from '../hooks/useArrowBuffer'
import { useMorseAudio } from '../hooks/useMorseAudio'
import { useProgressStore, type SpeedDuration } from '../store/progressStore'

const LETTERS = MORSE_LIST.filter((e) => e.category === 'letter').map((e) => e.char)

function randomLetterEntry(): { char: string; morse: string } {
  const entry = MORSE_LIST[Math.floor(Math.random() * MORSE_LIST.length)]!
  return { char: entry.char, morse: entry.morse }
}

const DURATIONS: SpeedDuration[] = [30, 60, 120]

function feedbackClass(f: string): string {
  if (f.startsWith('Benar')) return 'text-emerald-400'
  if (f.length === 0) return ''
  return 'text-rose-400'
}

export function Practice() {
  const { beep, play } = useMorseAudio()
  const progress = useProgressStore()
  const recordDrill = useProgressStore((s) => s.recordDrill)
  const recordSpeedTest = useProgressStore((s) => s.recordSpeedTest)
  const [mode, setMode] = useState<'encode' | 'decode' | 'speed'>('encode')

  // ---- Encode drill (type morse for the shown letter) ----
  const [encTarget, setEncTarget] = useState(() => pickTarget(LETTERS))
  const [encScore, setEncScore] = useState(0)
  const [encTotal, setEncTotal] = useState(0)
  const [encFeedback, setEncFeedback] = useState('')
  const encTotalRef = useRef(0)
  const encCorrectRef = useRef(0)
  const encStreakRef = useRef(0)
  const encTargetRef = useRef(encTarget)
  useEffect(() => {
    encTargetRef.current = encTarget
  }, [encTarget])

  const { buffer: encBuffer } = useArrowBuffer({
    enabled: mode === 'encode',
    autoCommitMs: 0, // drills grade per commit, not on a timer
    onBeep: beep,
    onCommit: (char) => {
      const correct = char === encTargetRef.current
      encTotalRef.current += 1
      if (correct) {
        encCorrectRef.current += 1
        encStreakRef.current += 1
        progress.recordStreak(encStreakRef.current)
      } else {
        encStreakRef.current = 0
      }
      recordDrill(correct)
      setEncScore(encCorrectRef.current)
      setEncTotal(encTotalRef.current)
      setEncFeedback(correct ? 'Benar!' : `Salah (${char === '?' ? 'invalid' : char})`)
      window.setTimeout(() => {
        setEncTarget((prev) => pickTarget(LETTERS, prev))
        setEncFeedback('')
      }, 400)
    },
  })

  // ---- Decode drill (read the shown morse, type the letter) ----
  const [dec, setDec] = useState(() => randomLetterEntry())
  const [decAnswer, setDecAnswer] = useState('')
  const [decFeedback, setDecFeedback] = useState('')
  const [decTotal, setDecTotal] = useState(0)
  const [decScore, setDecScore] = useState(0)

  const nextDec = useCallback((wasCorrect: boolean) => {
    recordDrill(wasCorrect)
    window.setTimeout(() => {
      setDec((prev) => {
        const next = randomLetterEntry()
        return next.char === prev.char ? randomLetterEntry() : next
      })
      setDecAnswer('')
      setDecFeedback('')
    }, 400)
  }, [recordDrill])

  const submitDec = useCallback(() => {
    if (decAnswer.trim() === '') return
    const correct = decAnswer.trim().toUpperCase() === dec.char
    setDecTotal((t) => t + 1)
    if (correct) setDecScore((s) => s + 1)
    setDecFeedback(correct ? 'Benar!' : 'Salah (jawaban: ' + dec.char + ')')
    nextDec(correct)
  }, [dec, decAnswer, nextDec])

  // ---- Speed test ----
  const [speedActive, setSpeedActive] = useState(false)
  const [speedDuration, setSpeedDuration] = useState<SpeedDuration>(30)
  const [speedTime, setSpeedTime] = useState(30)
  const [speedTarget, setSpeedTarget] = useState(() => pickTarget(LETTERS))
  const [speedScore, setSpeedScore] = useState(0)
  const [speedTries, setSpeedTries] = useState(0)
  const [speedResult, setSpeedResult] = useState<{ wpm: number; best: number } | null>(null)
  const speedTargetRef = useRef(speedTarget)
  const speedScoreRef = useRef(0)
  const speedTriesRef = useRef(0)
  useEffect(() => {
    speedTargetRef.current = speedTarget
  }, [speedTarget])

  useEffect(() => {
    if (!speedActive) return
    const id = window.setInterval(() => {
      setSpeedTime((t) => {
        if (t <= 1) {
          const wpm = recordSpeedTest(speedDuration, speedScoreRef.current)
          const best = useProgressStore.getState().bestWpm[speedDuration] ?? 0
          setSpeedResult({ wpm, best })
          setSpeedActive(false)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => window.clearInterval(id)
  }, [speedActive, speedDuration, recordSpeedTest])

  const { buffer: speedBuffer } = useArrowBuffer({
    enabled: mode === 'speed' && speedActive,
    autoCommitMs: 0,
    onBeep: beep,
    onCommit: (char) => {
      if (char === speedTargetRef.current) {
        speedScoreRef.current += 1
        setSpeedScore(speedScoreRef.current)
      }
      speedTriesRef.current += 1
      setSpeedTries(speedTriesRef.current)
      setSpeedTarget((prev) => pickTarget(LETTERS, prev))
    },
  })

  const startSpeed = (duration: SpeedDuration) => {
    speedScoreRef.current = 0
    speedTriesRef.current = 0
    setSpeedScore(0)
    setSpeedTries(0)
    setSpeedTime(duration)
    setSpeedDuration(duration)
    setSpeedResult(null)
    setSpeedTarget(pickTarget(LETTERS))
    setSpeedActive(true)
  }

  const modeBtn = (active: boolean) =>
    'px-3 py-2 rounded text-sm ' + (active ? 'bg-emerald-600' : 'bg-neutral-800 hover:bg-neutral-700')

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {(['encode', 'decode', 'speed'] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)} className={modeBtn(mode === m)}>
            {m === 'encode' ? 'Encode Drill' : m === 'decode' ? 'Decode Drill' : 'Speed Test'}
          </button>
        ))}
        <p className="ml-auto text-xs text-neutral-500">
          Riwayat: {progress.drillsCorrect}/{progress.drillsTotal} ({accuracy(progress.drillsCorrect, progress.drillsTotal)}%) · streak terbaik {progress.bestStreak}
        </p>
      </div>

      {mode === 'encode' && (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 space-y-3">
          <p className="text-xs text-neutral-400">Ketik Morse untuk huruf target (panah ←/→, Space commit):</p>
          <div className="text-6xl font-mono text-center text-emerald-400" role="status">
            {encTarget}
          </div>
          <div className="text-2xl font-mono text-center min-h-[2rem] text-neutral-300">{encBuffer || '…'}</div>
          <p className={'text-center text-sm ' + feedbackClass(encFeedback)}>{encFeedback}</p>
          <p className="text-center text-xs text-neutral-500">
            Skor: {encScore}/{encTotal}
          </p>
          <div className="flex justify-center">
            <button
              onClick={() => void play(MORSE_LIST.find((e) => e.char === encTarget)?.morse ?? '')}
              className="text-xs px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700"
            >
              ▶ Dengar morse target
            </button>
          </div>
        </div>
      )}

      {mode === 'decode' && (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 space-y-3">
          <p className="text-xs text-neutral-400">Dengar/baca Morse, ketik hurufnya:</p>
          <div className="text-4xl font-mono text-center text-emerald-400" role="status">
            {dec.morse}
          </div>
          <div className="flex justify-center gap-2">
            <button
              onClick={() => void play(dec.morse)}
              className="text-xs px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700"
            >
              ▶ Play
            </button>
            <input
              value={decAnswer}
              onChange={(e) => setDecAnswer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitDec()
              }}
              maxLength={6}
              className="w-24 text-center rounded border border-neutral-700 bg-neutral-950 px-2 py-1 font-mono uppercase"
              autoFocus
            />
            <button onClick={submitDec} className="px-3 py-1 rounded bg-emerald-600 text-sm">
              Submit
            </button>
          </div>
          <p className={'text-center text-sm ' + feedbackClass(decFeedback)}>{decFeedback}</p>
          <p className="text-center text-xs text-neutral-500">
            Skor: {decScore}/{decTotal}
          </p>
        </div>
      )}

      {mode === 'speed' && (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 space-y-3">
          <div className="text-center space-y-2">
            <p className="text-xs text-neutral-400">
              Waktu: {speedTime}s · rekor {speedDuration}s: {progress.bestWpm[speedDuration] ?? 0} WPM
            </p>
            <div className="flex justify-center gap-1">
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => setSpeedDuration(d)}
                  disabled={speedActive}
                  className={modeBtn(speedDuration === d) + ' disabled:opacity-40'}
                >
                  {d}s
                </button>
              ))}
            </div>
            {!speedActive && (
              <button onClick={() => startSpeed(speedDuration)} className="mt-2 px-4 py-2 rounded bg-emerald-600 text-sm">
                Mulai {speedDuration}s
              </button>
            )}
          </div>
          {speedActive && (
            <>
              <div className="text-6xl font-mono text-center text-emerald-400" role="status">
                {speedTarget}
              </div>
              <div className="text-2xl font-mono text-center min-h-[2rem] text-neutral-300">{speedBuffer || '…'}</div>
              <p className="text-center text-xs text-neutral-500">
                Benar: {speedScore} / mencoba {speedTries}
              </p>
            </>
          )}
          {!speedActive && speedResult !== null && (
            <div className="text-center text-sm text-neutral-300" aria-live="polite">
              Selesai! {speedScore} huruf benar dari {speedTries} mencoba →{' '}
              <span className="font-mono">≈ {speedResult.wpm} WPM</span> — rekor {speedResult.best} WPM
              {speedResult.wpm >= speedResult.best && speedResult.wpm > 0 ? ' 🏆 rekor baru!' : ''}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
