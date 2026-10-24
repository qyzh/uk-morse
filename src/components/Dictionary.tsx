import { useMemo, useState } from 'react'
import { MORSE_LIST, type MorseCategory } from '../core/morse-data'
import { useMorseAudio } from '../hooks/useMorseAudio'
import { cx } from './cx'
import { PlayIcon, SearchIcon, XIcon } from './icons'
import { Button, PageTitle } from './ui'

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

export function Dictionary({ standalone = false }: { standalone?: boolean }) {
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
    <section className="space-y-6">
      <header>
        {standalone ? (
          <PageTitle>Kamus Morse</PageTitle>
        ) : (
          <h2 className="text-2xl font-medium tracking-tight">
            <span aria-hidden="true" className="mr-2 select-none text-ink-3/70">//</span>
            kamus morse
          </h2>
        )}
        <p className="mt-3 max-w-md text-base text-ink-2">Cari karakter atau pola, klik baris untuk mendengarnya.</p>
      </header>

      <div className="flex flex-col gap-4">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-0 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
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
            className="h-10 w-full border-0 border-b border-edge-strong bg-transparent pl-7 pr-11 text-sm text-ink transition-colors duration-150 placeholder:text-ink-3 hover:border-ink-3 focus:border-ink-3"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Bersihkan pencarian"
              className="absolute right-1.5 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center text-ink-3 transition-colors duration-150 hover:bg-surface-2 hover:text-ink"
            >
              <XIcon className="size-4" />
            </button>
          )}
        </div>

        <div role="group" aria-label="Filter kategori" className="flex flex-wrap gap-x-4 gap-y-2">
          {FILTERS.map((f) => {
            const active = filter === f.id
            return (
              <button
                key={f.id}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(f.id)}
                className={cx(
                  'inline-flex min-h-11 items-center gap-1 text-sm transition-colors duration-150',
                  active ? 'text-ink' : 'text-ink-3 hover:text-ink',
                )}
              >
                <span aria-hidden="true" className="w-[1ch] shrink-0 select-none text-ink-3">
                  {active ? '>' : ''}
                </span>
                {f.label}
                <span className="font-mono text-[11px] tabular-nums text-ink-3">({counts[f.id]})</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="border-t border-edge">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-start gap-3 py-12">
            <SearchIcon className="size-6 text-ink-3" />
            <p className="text-base font-medium">
              Tidak ada hasil{query ? <> untuk &ldquo;{query}&rdquo;</> : null}
            </p>
            <p className="max-w-sm text-base text-ink-2">
              Coba huruf (A–Z), angka, pola morse seperti{' '}
              <span className="font-mono text-ink">.-.</span>, atau nama prosign seperti{' '}
              <span className="font-mono text-ink">SOS</span>.
            </p>
            <Button size="sm" onClick={clearFilters}>
              Bersihkan filter
            </Button>
          </div>
        ) : (
          <div className="max-h-[65vh] overflow-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-bg text-xs uppercase tracking-[0.08em] text-ink-3">
                <tr>
                  <th className="border-b border-edge py-2.5 pr-3 text-left font-normal">Morse</th>
                  <th className="border-b border-edge px-3 py-2.5 text-left font-normal">Karakter</th>
                  <th className="hidden border-b border-edge px-3 py-2.5 text-left font-normal sm:table-cell">
                    Kategori
                  </th>
                  <th className="border-b border-edge py-2.5 pl-3 text-right font-normal">Audio</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => {
                  const charLabel = e.char === ' ' ? 'spasi' : e.char
                  return (
                    <tr
                      key={e.morse + e.char}
                      onClick={() => play(e.morse)}
                      className="cursor-pointer border-t border-edge/60 transition-colors duration-150 hover:bg-surface-2/50"
                    >
                      <td className="py-2.5 pr-3 font-mono tracking-[0.15em] text-ink">{e.morse}</td>
                      <td className="px-3 py-2.5 font-mono text-base">{charLabel}</td>
                      <td className="hidden px-3 py-2.5 text-xs text-ink-3 sm:table-cell">
                        {CATEGORY_LABEL[e.category]}
                      </td>
                      <td className="py-2.5 pl-3 text-right">
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

      <p className="text-sm text-ink-3">
        menampilkan {filtered.length}/{MORSE_LIST.length} entri
      </p>
    </section>
  )
}
