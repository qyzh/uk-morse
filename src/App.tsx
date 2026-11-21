import { useEffect, useState } from 'react'
import { cx } from './components/cx'
import { MoonIcon, SunIcon, VolumeIcon, VolumeOffIcon } from './components/icons'
import { AudioProvider } from './hooks/AudioProvider'
import { useMorseAudio } from './hooks/useMorseAudio'
import { useSettingsStore } from './store/settingsStore'
import { NAV_VIEWS, renderView, titleOf, viewOfHash } from './view-router'
import type { ViewId } from './view-router'

function AppShell() {
  const audio = useMorseAudio()
  const theme = useSettingsStore((s) => s.theme)
  const muted = useSettingsStore((s) => s.muted)
  const toggleMute = useSettingsStore((s) => s.toggleMute)
  const setTheme = useSettingsStore((s) => s.setTheme)
  const [view, setView] = useState<ViewId>(() => viewOfHash(window.location.hash))

  useEffect(() => {
    if (!window.location.hash) window.history.replaceState(null, '', '#/')
    const onHashChange = () => setView(viewOfHash(window.location.hash))
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'light' ? '#f1e4c5' : '#201810')
  }, [theme])

  useEffect(() => {
    document.title = titleOf(view)
  }, [view])

  useEffect(() => () => audio.stop(), [view, audio])

  return (
    <div className="min-h-dvh overflow-x-clip font-sans text-ink">
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

      <header className="boot-in sticky top-0 z-20 border-b border-edge bg-bg/70 backdrop-blur">
        <PlusMark className="-bottom-2.25 -left-1.25 hidden md:block" />
        <PlusMark className="-bottom-2.25 -right-1.25 hidden md:block" />
        <div className="flex h-14 items-center gap-4 px-4 md:px-8 lg:gap-6">
          <a href="#/" aria-label="Morse Trainer" className="flex h-11 shrink-0 items-center text-base font-medium tracking-tight">
            morse_trainer
            <span aria-hidden="true" className="ml-1.5 inline-block h-[0.7em] w-[0.5em] bg-ink" />
          </a>

          <nav
            aria-label="Navigasi utama"
            className="ml-auto hidden divide-x divide-ink border border-ink pointer-fine:md:flex"
          >
            {NAV_VIEWS.map((v) => {
              const active = v.id === view
              return (
                <a
                  key={v.id}
                  href={`#/${v.id}`}
                  aria-current={active ? 'page' : undefined}
                  className={cx(
                    'inline-flex h-10.5 items-center px-3 text-sm transition-colors duration-150',
                    active ? 'bg-ink font-bold text-bg' : 'text-ink hover:bg-surface-2',
                  )}
                >
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
        <div key={view} className="view-in">
          {renderView(view)}
        </div>
      </main>

      <nav
        aria-label="Navigasi utama"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-ink bg-bg/85 pb-[env(safe-area-inset-bottom)] backdrop-blur pointer-fine:md:hidden"
      >
        <div className="grid grid-cols-5 divide-x divide-ink">
          {NAV_VIEWS.map((v) => {
            const Icon = v.Icon!
            const active = v.id === view
            return (
              <a
                key={v.id}
                href={`#/${v.id}`}
                aria-current={active ? 'page' : undefined}
                className={cx(
                  'flex h-14 flex-col items-center justify-center gap-0.5 text-[10px] font-bold uppercase tracking-[0.06em] transition-colors duration-150',
                  active ? 'bg-ink text-bg' : 'text-ink hover:bg-surface-2',
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

export default function App() {
  return (
    <AudioProvider>
      <AppShell />
    </AudioProvider>
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
