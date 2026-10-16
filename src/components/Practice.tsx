import { useCallback, useEffect, useRef, useState } from 'react'
import { MORSE_LIST } from '../core/morse-data'
import { useArrowBuffer } from '../hooks/useArrowBuffer'
import { useMorseAudio } from '../hooks/useMorseAudio'
import { useSettingsStore } from '../store/settingsStore'

const letters = MORSE_LIST.filter((e) => e.category === 'letter').map((e) => e.char)

function randomChar(): string {
  return letters[Math.floor(Math.random() * letters.length)]!
}

function randomMorse(): { char: string; morse: string } {
  const e = MORSE_LIST.filter((x) => x.category === 'letter')[Math.floor(Math.random() * 26)]!
  return { char: e.char, morse: e.morse }
}
export function Practice() {
  const settings = useSettingsStore()
  const { beep } = useMorseAudio()
  const [mode, setMode] = useState<'encode' | 'decode' | 'speed'>('encode')

  // ---- Encode drill ----
  const [encTarget, setEncTarget] = useState(randomChar())
  const [encScore, setEncScore] = useState(0)
  const [encTotal, setEncTotal] = useState(0)
  const [encFeedback, setEncFeedback] = useState('')
  const encTargetRef = useRef(encTarget)
  useEffect(() => { encTargetRef.current = encTarget }, [encTarget])

  const advanceEnc = useCallback(() => {
    window.setTimeout(() => {
      setEncTarget(randomChar())
      setEncFeedback('')
    }, 400)
  }, [])

  const { buffer: encBuffer } = useArrowBuffer({
    enabled: mode === 'encode',
    autoCommitMs: settings.autoCommitMs,
    onBeep: beep,
    onCommit: (char) => {
      setEncTotal((t) => t + 1)
      if (char === encTargetRef.current) {
        setEncScore((s) => s + 1)
        setEncFeedback('Benar!')
      } else {
        setEncFeedback('Salah (' + (char === '?' ? 'invalid' : char) + ')')
      }
      advanceEnc()
    },
  })

  // ---- Decode drill ----
  const [dec, setDec] = useState(randomMorse())
  const [decAnswer, setDecAnswer] = useState('')
  const [decScore, setDecScore] = useState(0)
  const [decTotal, setDecTotal] = useState(0)
  const [decFeedback, setDecFeedback] = useState('')

  const nextDec = useCallback(() => {
    window.setTimeout(() => {
      setDec(randomMorse())
      setDecAnswer('')
      setDecFeedback('')
    }, 400)
  }, [])

  const submitDec = useCallback(() => {
    if (decAnswer.trim() === '') return
    setDecTotal((t) => t + 1)
    if (decAnswer.trim().toUpperCase() === dec.char) {
      setDecScore((s) => s + 1)
      setDecFeedback('Benar!')
    } else {
      setDecFeedback('Salah (jawaban: ' + dec.char + ')')
    }
    nextDec()
  }, [dec, decAnswer, nextDec])

  // ---- Speed test (30s) ----
  const [speedActive, setSpeedActive] = useState(false)
  const [speedTime, setSpeedTime] = useState(30)
  const [speedTarget, setSpeedTarget] = useState(randomChar())
  const [speedScore, setSpeedScore] = useState(0)
  const [speedTotal, setSpeedTotal] = useState(0)
  const speedTargetRef = useRef(speedTarget)
  useEffect(() => { speedTargetRef.current = speedTarget }, [speedTarget])

  useEffect(() => {
    if (!speedActive) return
    const id = window.setInterval(() => {
      setSpeedTime((t) => {
        if (t <= 1) {
          setSpeedActive(false)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => window.clearInterval(id)
  }, [speedActive])

  const { buffer: speedBuffer } = useArrowBuffer({
    enabled: mode === 'speed' && speedActive,
    autoCommitMs: settings.autoCommitMs,
    onBeep: beep,
    onCommit: (char) => {
      setSpeedTotal((t) => t + 1)
      if (char === speedTargetRef.current) setSpeedScore((s) => s + 1)
      setSpeedTarget(randomChar())
    },
  })

  const startSpeed = () => {
    setSpeedScore(0)
    setSpeedTotal(0)
    setSpeedTime(30)
    setSpeedTarget(randomChar())
    setSpeedActive(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {(['encode', 'decode', 'speed'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={'px-3 py-2 rounded text-sm ' + (mode === m ? 'bg-emerald-600' : 'bg-neutral-800 hover:bg-neutral-700')}
          >
            {m === 'encode' ? 'Encode Drill' : m === 'decode' ? 'Decode Drill' : 'Speed Test (30s)'}
          </button>
        ))}
      </div>

      {mode === 'encode' && (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 space-y-3">
          <p className="text-xs text-neutral-400">Ketik Morse untuk huruf target (panah ←/→, Space commit):</p>
          <div className="text-6xl font-mono text-center text-emerald-400">{encTarget}</div>
          <div className="text-2xl font-mono text-center min-h-[2rem] text-neutral-300">{encBuffer || '…'}</div>
          <p className={'text-center text-sm ' + (encFeedback.startsWith('Benar') ? 'text-emerald-400' : 'text-rose-400')}>{encFeedback}</p>
          <p className="text-center text-xs text-neutral-500">Skor: {encScore}/{encTotal}</p>
        </div>
      )}

      {mode === 'decode' && (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 space-y-3">
          <p className="text-xs text-neutral-400">Dengar/baca Morse, ketik hurufnya:</p>
          <div className="text-4xl font-mono text-center text-emerald-400">{dec.morse}</div>
          <div className="flex justify-center gap-2">
            <input
              value={decAnswer}
              onChange={(e) => setDecAnswer(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submitDec() }}
              className="w-24 text-center rounded border border-neutral-700 bg-neutral-950 px-2 py-1 font-mono uppercase"
              autoFocus
            />
            <button onClick={submitDec} className="px-3 py-1 rounded bg-emerald-600 text-sm">Submit</button>
          </div>
          <p className={'text-center text-sm ' + (decFeedback.startsWith('Benar') ? 'text-emerald-400' : 'text-rose-400')}>{decFeedback}</p>
          <p className="text-center text-xs text-neutral-500">Skor: {decScore}/{decTotal}</p>
        </div>
      )}

      {mode === 'speed' && (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 space-y-3">
          <div className="text-center">
            <p className="text-xs text-neutral-400">Waktu: {speedTime}s</p>
            {!speedActive && (
              <button onClick={startSpeed} className="mt-2 px-4 py-2 rounded bg-emerald-600 text-sm">
                Mulai 30s
              </button>
            )}
          </div>
          {speedActive && (
            <>
              <div className="text-6xl font-mono text-center text-emerald-400">{speedTarget}</div>
              <div className="text-2xl font-mono text-center min-h-[2rem] text-neutral-300">{speedBuffer || '…'}</div>
              <p className="text-center text-xs text-neutral-500">Benar: {speedScore}/{speedTotal}</p>
            </>
          )}
          {!speedActive && speedTotal > 0 && (
            <div className="text-center text-sm text-neutral-300">
              Selesai! Benar {speedScore}/{speedTotal} — WPM ≈ {Math.round((speedScore / 5) / (30 / 60))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}