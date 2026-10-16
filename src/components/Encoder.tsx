import { useState } from 'react'
import { encodeText } from '../core/encode'
import { MORSE_MAP } from '../core/morse-data'
import { useMorseAudio } from '../hooks/useMorseAudio'

export function Encoder() {
  const { play } = useMorseAudio()
  const [text, setText] = useState('HELLO WORLD')
  const morse = encodeText(text)
  const unknown = [...new Set([...text.toUpperCase()].filter((ch) => ch !== ' ' && !(ch in MORSE_MAP)))]

  return (
    <div className="space-y-4">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        className="w-full rounded border border-neutral-700 bg-neutral-900 p-3 font-mono"
        placeholder="Teks yang akan di-encode..."
      />
      {unknown.length > 0 && (
        <p className="text-xs text-amber-400">Karakter tidak didukung: {unknown.join(' ')}</p>
      )}
      <div className="rounded border border-neutral-800 bg-neutral-900 p-4 font-mono break-all text-emerald-400">
        {morse || <span className="text-neutral-600">—</span>}
      </div>
      <div className="flex gap-2">
        <button onClick={() => play(morse)} className="px-3 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-sm">
          ▶ Play Morse
        </button>
        <button
          onClick={() => navigator.clipboard.writeText(morse)}
          className="px-3 py-2 rounded bg-neutral-800 hover:bg-neutral-700 text-sm"
        >
          Copy
        </button>
      </div>
    </div>
  )
}