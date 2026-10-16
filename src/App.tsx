import { useState } from 'react'
import { Trainer } from './components/Trainer'
import { Dictionary } from './components/Dictionary'
import { Encoder } from './components/Encoder'
import { Practice } from './components/Practice'
import { SettingsPanel } from './components/SettingsPanel'
import { useSettingsStore } from './store/settingsStore'

export default function App() {
  const theme = useSettingsStore((s) => s.theme)
  const [view, setView] = useState<'trainer' | 'dictionary' | 'encoder' | 'practice' | 'settings'>('trainer')
  if (typeof document !== 'undefined') document.documentElement.classList.toggle('dark', theme === 'dark')

  const views = [
    { id: 'trainer', label: 'Trainer' },
    { id: 'dictionary', label: 'Kamus' },
    { id: 'encoder', label: 'Encoder' },
    { id: 'practice', label: 'Latihan' },
    { id: 'settings', label: 'Pengaturan' },
  ] as const

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 font-mono">
      <header className="sticky top-0 z-10 border-b border-neutral-800 bg-neutral-950/90 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4">
          <h1 className="text-lg font-bold tracking-widest">MORSE TRAINER</h1>
          <nav className="flex gap-1 ml-auto">
            {views.map((v) => (
              <button
                key={v.id}
                onClick={() => setView(v.id)}
                className={
                  'px-3 py-1.5 rounded text-sm transition-colors ' +
                  (view === v.id ? 'bg-emerald-600 text-white' : 'text-neutral-300 hover:bg-neutral-800')
                }
              >
                {v.label}
              </button>
            ))}
          </nav>
        </div>
      </header>
      <section className="max-w-5xl mx-auto px-4 py-6">
        {view === 'trainer' && <Trainer />}
        {view === 'dictionary' && <Dictionary />}
        {view === 'encoder' && <Encoder />}
        {view === 'practice' && <Practice />}
        {view === 'settings' && <SettingsPanel />}
      </section>
    </main>
  )
}