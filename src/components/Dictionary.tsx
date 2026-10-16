import { useMemo, useState } from 'react'
import { MORSE_LIST, type MorseCategory } from '../core/morse-data'
import { useMorseAudio } from '../hooks/useMorseAudio'
import { cx } from './cx'
import { PlayIcon, SearchIcon, XIcon } from './icons'
import { Button, Toggle } from './ui'

const CATEGORY_LABEL: Record<MorseCategory, string> = {
  letter: 'Huruf',
  number: 'Angka',
  punctuation: 'Tanda baca',
  prosign: 'Prosign',
}

const FILTERS = [
  { id: 'all', label: 'Semua' },
  { id: 'letter', label: 'Huruf' },
  { id: 'number', label: 'Angka' },
  { id: 'punctuation', label: 'Tanda baca' },
  { id: 'prosign', label: 'Prosign' },
] as const

type FilterId = (typeof FILTERS)[number]['id']

export function Dictionary() {
  const { play } = useMorseAudio()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FilterId>('all')

  const counts = useMemo(() => {
    const c: Record<FilterId, number> = {
      all: MORSE_LIST.length,
      letter: 0,
      number: 0,
      punctuation: 0,
      prosign: 0,
    }
    for (const entry of MORSE_LIST) c[entry.category] += 1
    return c
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return MORSE_LIST.filter((e) => {
      if (filter !== 'all' && e.category !== filter) return false
      if (!q) return true
      return (
        e.char.toLowerCase().includes(q) ||
        e.morse.toLowerCase().includes(q) ||
        (e.keywords ?? []).some((k) => k.toLowerCase().includes(q))
      )
    })
  }, [query, filter])

  const clearFilters = () => {
    setQuery('')
    setFilter('all')
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
          <label htmlFor="dict-search" className="sr-only">
            Cari entri morse
          </label>
          <input
            id="dict-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari huruf, pola morse (mis. .-.), atau nama prosign…"
            autoComplete="off"
            spellCheck={false}
            className="h-10 w-full rounded-lg border border-edge bg-surface pl-9 pr-11 text-sm text-ink placeholder:text-ink-3"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Bersihkan pencarian"
              className="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-ink-3 transition-colors duration-150 hover:bg-surface-2 hover:text-ink"
            >
              <XIcon className="size-4" />
            </button>
          )}
        </div>

        <div role="group" aria-label="Filter kategori" className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Toggle key={f.id} active={filter === f.id} onClick={() => setFilter(f.id)}>
              {f.label}
              <span
                className={cx(
                  'font-mono text-[11px] tabular-nums',
                  filter === f.id ? 'text-signal-ink/70' : 'text-ink-3',
                )}
              >
                {counts[f.id]}
              </span>
            </Toggle>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-edge bg-surface">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <SearchIcon className="size-6 text-ink-3" />
            <p className="text-sm font-medium">
              Tidak ada hasil{query ? <> untuk &ldquo;{query}&rdquo;</> : null}
            </p>
            <p className="max-w-sm text-xs text-ink-3">
              Coba huruf (A–Z), angka, pola morse seperti{' '}
              <span className="font-mono text-signal-text">.-.</span>, atau nama prosign seperti{' '}
              <span className="font-mono text-signal-text">SOS</span>.
            </p>
            <Button size="sm" onClick={clearFilters}>
              Bersihkan filter
            </Button>
          </div>
        ) : (
          <div className="max-h-[65vh] overflow-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-surface-2 text-xs uppercase tracking-wider text-ink-3">
                <tr>
                  <th className="border-b border-edge px-3 py-2.5 text-left font-medium">Morse</th>
                  <th className="border-b border-edge px-3 py-2.5 text-left font-medium">Karakter</th>
                  <th className="hidden border-b border-edge px-3 py-2.5 text-left font-medium sm:table-cell">
                    Kategori
                  </th>
                  <th className="border-b border-edge px-3 py-2.5 text-right font-medium">Audio</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => {
                  const charLabel = e.char === ' ' ? 'spasi' : e.char
                  return (
                    <tr
                      key={e.morse + e.char}
                      onClick={() => play(e.morse)}
                      className="cursor-pointer border-t border-edge/60 transition-colors duration-150 hover:bg-surface-2/70"
                    >
                      <td className="px-3 py-2.5 font-mono tracking-[0.15em] text-signal-text">{e.morse}</td>
                      <td className="px-3 py-2.5 font-mono text-base">{charLabel}</td>
                      <td className="hidden px-3 py-2.5 sm:table-cell">
                        <span className="rounded-full border border-edge px-2 py-0.5 text-[11px] text-ink-3">
                          {CATEGORY_LABEL[e.category]}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <Button
                          variant="ghost"
                          size="iconSm"
                          onClick={(ev) => {
                            ev.stopPropagation()
                            play(e.morse)
                          }}
                          aria-label={`Putar audio ${charLabel}`}
                        >
                          <PlayIcon className="size-3.5" />
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-ink-3">
        Menampilkan {filtered.length} dari {MORSE_LIST.length} entri
      </p>
    </div>
  )
}
