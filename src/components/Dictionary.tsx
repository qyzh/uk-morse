import { useMemo, useState } from 'react'
import { MORSE_LIST, type MorseCategory, type MorseEntry } from '../core/morse-data'
import { useMorseAudio } from '../hooks/useMorseAudio'

type SortKey = 'a-z' | 'morse-length' | 'category'

const sorters: Record<SortKey, (a: MorseEntry, b: MorseEntry) => number> = {
  'a-z': (a, b) => a.char.localeCompare(b.char),
  'morse-length': (a, b) => a.morse.length - b.morse.length || a.char.localeCompare(b.char),
  category: (a, b) => a.category.localeCompare(b.category) || a.char.localeCompare(b.char),
}

export function Dictionary() {
  const { play } = useMorseAudio()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<MorseCategory | 'all'>('all')
  const [sort, setSort] = useState<SortKey>('a-z')
  const [copied, setCopied] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return MORSE_LIST.filter((e) => {
      if (category !== 'all' && e.category !== category) return false
      if (!q) return true
      return (
        e.char.toLowerCase().includes(q) ||
        e.morse.includes(q) ||
        (e.keywords ?? []).some((k) => k.toLowerCase().includes(q))
      )
    }).sort(sorters[sort])
  }, [query, category, sort])

  const categories: (MorseCategory | 'all')[] = ['all', 'letter', 'number', 'punctuation', 'prosign']

  const chip = (active: boolean) =>
    'px-2 py-2 rounded text-xs ' + (active ? 'bg-emerald-600' : 'bg-neutral-800 hover:bg-neutral-700')

  const copyMorse = async (entry: MorseEntry) => {
    await navigator.clipboard.writeText(entry.morse)
    setCopied(entry.char)
    window.setTimeout(() => setCopied(null), 1000)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari huruf atau morse (mis. .-.)"
          className="flex-1 min-w-[220px] rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
        />
        <div className="flex gap-1">
          {categories.map((c) => (
            <button key={c} onClick={() => setCategory(c)} className={chip(category === c)}>
              {c === 'all' ? 'semua' : c}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {(Object.keys(sorters) as SortKey[]).map((s) => (
            <button key={s} onClick={() => setSort(s)} className={chip(sort === s)}>
              {s === 'a-z' ? 'A–Z' : s === 'morse-length' ? 'panjang' : 'kategori'}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto rounded border border-neutral-800">
        <table className="w-full text-sm">
          <thead className="bg-neutral-900 text-neutral-400">
            <tr>
              <th className="text-left px-3 py-2">Morse</th>
              <th className="text-left px-3 py-2">Karakter</th>
              <th className="text-left px-3 py-2">Kategori</th>
              <th className="text-left px-3 py-2">Audio</th>
              <th className="text-left px-3 py-2">Copy</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => (
              <tr key={e.char + e.morse} className="border-t border-neutral-800">
                <td className="px-3 py-2 font-mono text-emerald-400">{e.morse}</td>
                <td className="px-3 py-2 font-mono">{e.char}</td>
                <td className="px-3 py-2 text-neutral-400">{e.category}</td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => play(e.morse)}
                    className="text-xs px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700"
                    aria-label={`Play ${e.char}`}
                  >
                    ▶
                  </button>
                </td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => void copyMorse(e)}
                    className="text-xs px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700"
                    aria-label={`Copy morse ${e.char}`}
                  >
                    {copied === e.char ? '✓' : '⧉'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-neutral-500">
        {filtered.length} dari {MORSE_LIST.length} entri
      </p>
    </div>
  )
}
