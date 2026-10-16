import { useSettingsStore } from '../store/settingsStore'

export function SettingsPanel() {
  const s = useSettingsStore()
  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <label className="block text-sm mb-1">WPM: {s.wpm}</label>
        <input type="range" min={6} max={45} value={s.wpm} onChange={(e) => s.setWpm(Number(e.target.value))} className="w-full" />
      </div>
      <div>
        <label className="block text-sm mb-1">Frekuensi nada (Hz): {s.toneHz}</label>
        <input type="range" min={400} max={1000} step={10} value={s.toneHz} onChange={(e) => s.setToneHz(Number(e.target.value))} className="w-full" />
      </div>
      <div>
        <label className="block text-sm mb-1">Volume: {Math.round(s.volume * 100)}%</label>
        <input type="range" min={0} max={1} step={0.05} value={s.volume} onChange={(e) => s.setVolume(Number(e.target.value))} className="w-full" />
      </div>
      <div>
        <label className="block text-sm mb-1">Auto-commit delay (ms, 0 = off): {s.autoCommitMs}</label>
        <input type="range" min={0} max={3000} step={50} value={s.autoCommitMs} onChange={(e) => s.setAutoCommitMs(Number(e.target.value))} className="w-full" />
      </div>
      <div className="flex gap-3">
        <button onClick={s.toggleMute} className="px-3 py-2 rounded bg-neutral-800 hover:bg-neutral-700 text-sm">
          {s.muted ? 'Unmute' : 'Mute'}
        </button>
        <button onClick={() => s.setTheme(s.theme === 'dark' ? 'light' : 'dark')} className="px-3 py-2 rounded bg-neutral-800 hover:bg-neutral-700 text-sm">
          Tema: {s.theme}
        </button>
        <button onClick={s.reset} className="px-3 py-2 rounded bg-neutral-800 hover:bg-neutral-700 text-sm">
          Reset
        </button>
      </div>
    </div>
  )
}