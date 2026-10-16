import { useState } from 'react'
import { useArrowBuffer } from '../hooks/useArrowBuffer'
import { useMorseAudio } from '../hooks/useMorseAudio'
import { useSettingsStore } from '../store/settingsStore'

const KEYINFO = '← dit  ·  → dah  ·  Space commit  ·  Enter spasi  ·  Backspace undo  ·  Esc reset'

export function Trainer() {
  const autoCommitMs = useSettingsStore((s) => s.autoCommitMs)
  const wpm = useSettingsStore((s) => s.wpm)
  const { play, beep, stop } = useMorseAudio()
  const [output, setOutput] = useState('')

  const { buffer, addSymbol, commit, word, undo, reset } = useArrowBuffer({
    enabled: true,
    autoCommitMs,
    onBeep: beep,
    // invalid patterns display as "?" (plan §3.1)
    onCommit: (char) => setOutput((o) => o + char),
    onEnter: () => setOutput((o) => o + ' '),
    onBackspaceEmpty: () => setOutput((o) => o.slice(0, -1)),
  })

  const screenBtn =
    'min-w-16 px-4 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 active:bg-emerald-700 text-lg font-mono select-none'

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
        <p className="text-xs text-neutral-400 mb-2">
          Simbol aktif {autoCommitMs > 0 ? `· auto-commit ${autoCommitMs}ms` : '· auto-commit off'}
        </p>
        <div
          className="text-5xl md:text-7xl font-mono tracking-[0.3em] min-h-[4rem] text-emerald-400"
          role="status"
        >
          {buffer || <span className="text-neutral-700">…</span>}
        </div>
        <p className="mt-2 text-xs text-neutral-500">{KEYINFO}</p>
      </div>

      <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-neutral-400">Hasil decode</p>
          <div className="flex gap-2">
            <button onClick={() => void play(output)} className="text-xs px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700">
              ▶ Play ({wpm} WPM)
            </button>
            <button onClick={stop} className="text-xs px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700">
              ■
            </button>
            <button onClick={() => setOutput('')} className="text-xs px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700">
              Clear
            </button>
          </div>
        </div>
        <div
          className="text-2xl md:text-3xl font-mono min-h-[3rem] whitespace-pre-wrap break-all"
          role="status"
          aria-live="polite"
        >
          {output || <span className="text-neutral-600">—</span>}
        </div>
      </div>

      {/* on-screen fallback for touch devices without arrow keys (plan §6, §11) */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
        <p className="text-xs text-neutral-400 mb-3 md:hidden">On-screen kontrol (untuk tanpa keyboard arah):</p>
        <div className="flex flex-wrap justify-center gap-2">
          <button onClick={() => addSymbol('dit')} className={screenBtn} aria-label="Tambah dit">
            ·
          </button>
          <button onClick={() => addSymbol('dah')} className={screenBtn} aria-label="Tambah dah">
            −
          </button>
          <button onClick={commit} className={screenBtn + ''} aria-label="Commit huruf">
            Space
          </button>
          <button onClick={word} className={screenBtn + ''} aria-label="Commit kata">
            Enter
          </button>
          <button onClick={undo} className={screenBtn + ''} aria-label="Undo">
            ⌫
          </button>
          <button onClick={reset} className={screenBtn + ' text-rose-300'} aria-label="Reset buffer">
            Esc
          </button>
        </div>
      </div>
    </div>
  )
}
