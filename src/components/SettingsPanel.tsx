import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useMorseAudio } from '../hooks/useMorseAudio'
import {
  AUTO_COMMIT_MAX_MS,
  FREQUENCY_MAX_HZ,
  FREQUENCY_MIN_HZ,
  WPM_MAX,
  WPM_MIN,
  useSettingsStore,
} from '../store/settingsStore'
import type { Theme } from '../store/settingsStore'
import { CheckIcon, KeyboardIcon, MoonIcon, RotateIcon, SunIcon, VolumeIcon, VolumeOffIcon } from './icons'
import { Button, Panel, Segmented } from './ui'

const THEME_OPTIONS: ReadonlyArray<{ value: Theme; label: string; icon: ReactNode }> = [
  { value: 'dark', label: 'Gelap', icon: <MoonIcon className="size-3.5" /> },
  { value: 'light', label: 'Terang', icon: <SunIcon className="size-3.5" /> },
]

function RangeField({
  id,
  label,
  display,
  value,
  min,
  max,
  step = 1,
  onChange,
  hint,
}: {
  id: string
  label: string
  display: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
  hint?: string
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-ink-2">
          {label}
        </label>
        <span className="font-mono text-sm tabular-nums text-ink">{display}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.valueAsNumber)}
        className="mt-2 h-8 w-full"
      />
      {hint && <p className="mt-1 text-xs text-ink-3">{hint}</p>}
    </div>
  )
}

function SectionTitle({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-ink-3">
      {icon}
      {children}
    </h2>
  )
}

export function SettingsPanel() {
  const s = useSettingsStore()
  const { play } = useMorseAudio()
  const [confirming, setConfirming] = useState(false)
  const [resetDone, setResetDone] = useState(false)
  const doneTimer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(doneTimer.current), [])

  const doReset = () => {
    s.reset()
    setConfirming(false)
    setResetDone(true)
    window.clearTimeout(doneTimer.current)
    doneTimer.current = window.setTimeout(() => setResetDone(false), 2500)
  }

  return (
    <div className="max-w-2xl space-y-5">
      <Panel className="space-y-5 p-5 sm:p-6">
        <SectionTitle icon={<VolumeIcon className="size-3.5" />}>Audio</SectionTitle>

        <RangeField
          id="set-wpm"
          label="Kecepatan (WPM)"
          display={`${s.wpm} WPM`}
          min={WPM_MIN}
          max={WPM_MAX}
          value={s.wpm}
          onChange={s.setWpm}
          hint="Standar PARIS — durasi dit = 1200 / WPM milidetik."
        />
        <RangeField
          id="set-tone"
          label="Frekuensi nada"
          display={`${s.toneHz} Hz`}
          min={FREQUENCY_MIN_HZ}
          max={FREQUENCY_MAX_HZ}
          step={10}
          value={s.toneHz}
          onChange={s.setToneHz}
        />
        <RangeField
          id="set-volume"
          label="Volume"
          display={`${Math.round(s.volume * 100)}%`}
          min={0}
          max={1}
          step={0.05}
          value={s.volume}
          onChange={s.setVolume}
        />

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => play('-.-')} disabled={s.muted}>
            <VolumeIcon className="size-3.5" />
            Tes nada (K)
          </Button>
          <Button variant="secondary" size="sm" onClick={s.toggleMute}>
            {s.muted ? (
              <>
                <VolumeOffIcon className="size-3.5" />
                Bunyi mati
              </>
            ) : (
              <>
                <VolumeIcon className="size-3.5" />
                Bunyi aktif
              </>
            )}
          </Button>
        </div>
        {s.muted && <p className="text-xs text-ink-3">Bunyi sedang dimatikan — tes nada tidak terdengar.</p>}
      </Panel>

      <Panel className="space-y-5 p-5 sm:p-6">
        <SectionTitle icon={<KeyboardIcon className="size-3.5" />}>Input</SectionTitle>
        <RangeField
          id="set-autocommit"
          label="Auto-commit"
          display={s.autoCommitMs === 0 ? 'Nonaktif' : `${s.autoCommitMs} ms`}
          min={0}
          max={AUTO_COMMIT_MAX_MS}
          step={100}
          value={s.autoCommitMs}
          onChange={s.setAutoCommitMs}
          hint="Commit huruf otomatis setelah jeda; 0 = hanya manual dengan Space."
        />
      </Panel>

      <Panel className="space-y-4 p-5 sm:p-6">
        <SectionTitle icon={<SunIcon className="size-3.5" />}>Tampilan</SectionTitle>
        <div>
          <span className="text-sm font-medium text-ink-2">Tema</span>
          <div className="mt-2">
            <Segmented label="Tema" value={s.theme} options={THEME_OPTIONS} onChange={s.setTheme} />
          </div>
        </div>
      </Panel>

      <Panel className="space-y-4 p-5 sm:p-6">
        <SectionTitle icon={<RotateIcon className="size-3.5" />}>Data</SectionTitle>
        <p className="text-sm text-ink-2">
          Preferensi tersimpan otomatis di perangkat ini (localStorage). Tidak ada data yang dikirim
          ke server.
        </p>
        {resetDone && (
          <p role="status" className="flex items-center gap-1.5 text-sm text-signal-text">
            <CheckIcon className="size-4" />
            Pengaturan dikembalikan ke default.
          </p>
        )}
        {confirming ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-ink-2">Yakin reset semua pengaturan?</span>
            <Button variant="danger" size="sm" onClick={doReset}>
              Ya, reset
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
              Batal
            </Button>
          </div>
        ) : (
          <Button variant="dangerGhost" size="sm" onClick={() => setConfirming(true)}>
            Reset pengaturan
          </Button>
        )}
      </Panel>
    </div>
  )
}
