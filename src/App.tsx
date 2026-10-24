import { useEffect, useState } from 'react'
import type { ReactElement } from 'react'
import { Trainer } from './components/Trainer'
import { Dictionary } from './components/Dictionary'
import { Encoder } from './components/Encoder'
import { Practice } from './components/Practice'
import { SettingsPanel } from './components/SettingsPanel'
import { cx } from './components/cx'
import {
  BookIcon,
  GearIcon,
  MoonIcon,
  RadioIcon,
  SunIcon,
  TargetIcon,
  TypeIcon,
  VolumeIcon,
  VolumeOffIcon,
} from './components/icons'
import type { IconProps } from './components/icons'
import { useSettingsStore } from './store/settingsStore'

type ViewId = 'trainer' | 'dictionary' | 'encoder' | 'practice' | 'settings'

const VIEWS: Array<{ id: ViewId; label: string; title: string; Icon: (props: IconProps) => ReactElement }> = [
  { id: 'trainer', label: 'Trainer', title: 'Trainer', Icon: RadioIcon },
  { id: 'dictionary', label: 'Kamus', title: 'Kamus Morse', Icon: BookIcon },
  { id: 'encoder', label: 'Encoder', title: 'Encoder', Icon: TypeIcon },
  { id: 'practice', label: 'Latihan', title: 'Latihan', Icon: TargetIcon },
  { id: 'settings', label: 'Pengaturan', title: 'Pengaturan', Icon: GearIcon },
]

/** Hash routing (M9 polish): deep links + browser back/forward both work. */
function readHash(): ViewId {
  const id = window.location.hash.replace(/^#\/?/, '')
  return VIEWS.some((v) => v.id === id) ? (id as ViewId) : 'trainer'
}

export default function App() {
  const theme = useSettingsStore((s) => s.theme)
  const muted = useSettingsStore((s) => s.muted)
  const toggleMute = useSettingsStore((s) => s.toggleMute)
  const setTheme = useSettingsStore((s) => s.setTheme)
  const [view, setView] = useState<ViewId>(readHash)

  useEffect(() => {
    if (!window.location.hash) window.history.replaceState(null, '', '#/trainer')
    const onHashChange = () => setView(readHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light')
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'light' ? '#f5f5f5' : '#151515')
  }, [theme])

  useEffect(() => {
    const meta = VIEWS.find((v) => v.id === view)
    document.title = meta ? `${meta.title} — morse_trainer` : 'morse_trainer'
  }, [view])

  return (
    <div className="min-h-dvh overflow-x-clip bg-bg font-sans text-ink">
      <div className="relative mx-auto flex min-h-dvh w-full max-w-5xl flex-col md:border-x md:border-edge">
      <a
        href="#konten"
        onClick={(e) => {
          e.preventDefault()
          document.getElementById('konten')?.focus()
        }}
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-signal focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:uppercase focus:tracking-[0.08em] focus:text-signal-ink"
      >
        Langsung ke konten
      </a>

      <header className="sticky top-0 z-20 border-b border-edge bg-bg/90 backdrop-blur">
        <PlusMark className="-bottom-2.25 -left-1.25 hidden md:block" />
        <PlusMark className="-bottom-2.25 -right-1.25 hidden md:block" />
        <div className="flex h-14 items-center gap-4 px-4 md:px-8 lg:gap-6">
          <a href="#/trainer" aria-label="Morse Trainer" className="flex h-11 shrink-0 items-center text-base font-medium tracking-tight">
            morse_trainer
            <span aria-hidden="true" className="ml-1.5 inline-block h-[0.7em] w-[0.5em] bg-ink" />
          </a>

          <nav aria-label="Navigasi utama" className="ml-auto hidden items-center gap-4 pointer-fine:md:flex">
            {VIEWS.map((v) => {
              const active = v.id === view
              return (
                <a
                  key={v.id}
                  href={`#/${v.id}`}
                  aria-current={active ? 'page' : undefined}
                  className={cx(
                    'inline-flex h-11 items-center gap-1 text-sm transition-colors duration-150',
                    active ? 'text-ink' : 'text-ink-3 hover:text-ink',
                  )}
                >
                  <span aria-hidden="true" className="hidden text-ink-3/70 lg:inline">
                    [
                  </span>
                  {v.label}
                  <span aria-hidden="true" className="hidden text-ink-3/70 lg:inline">
                    ]
                  </span>
                </a>
              )
            })}
          </nav>

          <div className="ml-auto flex items-center gap-1 md:ml-0">
            <button
              type="button"
              onClick={toggleMute}
              aria-pressed={muted}
              aria-label={muted ? 'Aktifkan bunyi' : 'Bisukan bunyi'}
              className="flex size-11 items-center justify-center text-ink-3 transition-colors duration-150 hover:bg-surface-2 hover:text-ink"
            >
              {muted ? <VolumeOffIcon className="size-4" /> : <VolumeIcon className="size-4" />}
            </button>
            <button
              type="button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label={`Ganti ke tema ${theme === 'dark' ? 'terang' : 'gelap'}`}
              className="flex size-11 items-center justify-center text-ink-3 transition-colors duration-150 hover:bg-surface-2 hover:text-ink"
            >
              {theme === 'dark' ? <SunIcon className="size-4" /> : <MoonIcon className="size-4" />}
            </button>
          </div>
        </div>
      </header>

      <main id="konten" tabIndex={-1} className="w-full flex-1 px-4 py-8 pb-28 outline-none md:px-8 md:py-12 pointer-fine:md:pb-20 pointer-coarse:md:pb-28">
        {view === 'trainer' && (
          <div className="space-y-12">
            <Trainer />
            <Dictionary />
          </div>
        )}
        {view === 'dictionary' && <Dictionary standalone />}
        {view === 'encoder' && <Encoder />}
        {view === 'practice' && <Practice />}
        {view === 'settings' && <SettingsPanel />}
      </main>

      <nav
        aria-label="Navigasi utama"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-edge bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur pointer-fine:md:hidden"
      >
        <div className="grid grid-cols-5">
          {VIEWS.map((v) => {
            const Icon = v.Icon
            const active = v.id === view
            return (
              <a
                key={v.id}
                href={`#/${v.id}`}
                aria-current={active ? 'page' : undefined}
                className={cx(
                  'flex h-14 flex-col items-center justify-center gap-0.5 border-t-2 text-[10px] font-medium uppercase tracking-[0.06em] transition-colors duration-150',
                  active ? 'border-ink text-ink' : 'border-transparent text-ink-3 hover:text-ink',
                )}
              >
                <Icon className="size-5" />
                {v.label}
              </a>
            )
          })}
        </div>
      </nav>
      </div>
    </div>
  )
}

/** Crosshair corner mark (mdxcn frame). Decorative. */
function PlusMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cx('pointer-events-none absolute z-10 select-none font-mono text-[11px] leading-none text-edge-strong', className)}
    >
      +
    </span>
  )
}
