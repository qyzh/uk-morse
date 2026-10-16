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
      ?.setAttribute('content', theme === 'light' ? '#f6f8fa' : '#020617')
  }, [theme])

  useEffect(() => {
    const meta = VIEWS.find((v) => v.id === view)
    document.title = meta ? `${meta.title} — Morse Trainer` : 'Morse Trainer'
  }, [view])

  return (
    <div className="flex min-h-dvh flex-col bg-bg font-sans text-ink">
      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-signal focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-signal-ink"
      >
        Langsung ke konten
      </a>

      <header className="sticky top-0 z-20 border-b border-edge bg-bg/85 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-4 px-4">
          <a href="#/trainer" className="flex shrink-0 items-center gap-2.5">
            <span className="inline-block size-2.5 rounded-full bg-signal shadow-[0_0_10px_var(--signal)]" aria-hidden="true" />
            <span className="text-sm font-semibold uppercase tracking-[0.18em]">Morse Trainer</span>
          </a>

          <nav aria-label="Navigasi utama" className="ml-auto hidden items-center gap-1 md:flex">
            {VIEWS.map((v) => {
              const Icon = v.Icon
              const active = v.id === view
              return (
                <a
                  key={v.id}
                  href={`#/${v.id}`}
                  aria-current={active ? 'page' : undefined}
                  className={cx(
                    'flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors duration-150',
                    active
                      ? 'bg-surface-2 text-signal-text'
                      : 'text-ink-3 hover:bg-surface-2 hover:text-ink-2',
                  )}
                >
                  <Icon className="size-4" />
                  {v.label}
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
              className="flex size-10 items-center justify-center rounded-lg text-ink-3 transition-colors duration-150 hover:bg-surface-2 hover:text-ink"
            >
              {muted ? <VolumeOffIcon className="size-4" /> : <VolumeIcon className="size-4" />}
            </button>
            <button
              type="button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label={`Ganti ke tema ${theme === 'dark' ? 'terang' : 'gelap'}`}
              className="flex size-10 items-center justify-center rounded-lg text-ink-3 transition-colors duration-150 hover:bg-surface-2 hover:text-ink"
            >
              {theme === 'dark' ? <SunIcon className="size-4" /> : <MoonIcon className="size-4" />}
            </button>
          </div>
        </div>
      </header>

      <main id="konten" tabIndex={-1} className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-28 outline-none md:py-8 md:pb-16">
        {view === 'trainer' && <Trainer />}
        {view === 'dictionary' && <Dictionary />}
        {view === 'encoder' && <Encoder />}
        {view === 'practice' && <Practice />}
        {view === 'settings' && <SettingsPanel />}
      </main>

      <nav
        aria-label="Navigasi utama"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-edge bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
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
                  'flex h-14 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors duration-150',
                  active ? 'text-signal-text' : 'text-ink-3',
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
  )
}
