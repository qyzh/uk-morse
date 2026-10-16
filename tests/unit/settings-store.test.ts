import { beforeEach, describe, expect, it, vi } from 'vitest'

// tests/setup.ts stubs globalThis.localStorage; reset modules between tests so
// each one creates a fresh store bound to a clean stub.
const readPersisted = (): { state: Record<string, unknown>; version: number } => {
  const raw = globalThis.localStorage.getItem('morse-app:v1')
  expect(raw).not.toBeNull()
  return JSON.parse(raw!) as { state: Record<string, unknown>; version: number }
}

beforeEach(() => {
  globalThis.localStorage.clear()
  vi.resetModules()
})

const importStore = () => import('../../src/store/settingsStore')

describe('settings store (M2, PLAN.md §3.5)', () => {
  it('starts with plan defaults', async () => {
    const { useSettingsStore } = await importStore()
    expect(useSettingsStore.getState()).toMatchObject({
      wpm: 15,
      toneHz: 600,
      volume: 0.6,
      muted: false,
      autoCommitMs: 700,
      theme: 'dark',
    })
  })

  it('clamps values to their allowed ranges', async () => {
    const { useSettingsStore } = await importStore()
    const s = useSettingsStore.getState()
    s.setWpm(1000)
    s.setToneHz(5000)
    s.setVolume(5)
    s.setAutoCommitMs(99_999)
    let cur = useSettingsStore.getState()
    expect(cur.wpm).toBe(45)
    expect(cur.toneHz).toBe(1000)
    expect(cur.volume).toBe(1)
    expect(cur.autoCommitMs).toBe(3000)

    s.setWpm(0)
    s.setToneHz(0)
    s.setVolume(-1)
    s.setAutoCommitMs(-5)
    cur = useSettingsStore.getState()
    expect(cur.wpm).toBe(6)
    expect(cur.toneHz).toBe(400)
    expect(cur.volume).toBe(0)
    expect(cur.autoCommitMs).toBe(0) // 0 = auto-commit off
  })

  it('toggles mute and switches the theme', async () => {
    const { useSettingsStore } = await importStore()
    const s = useSettingsStore.getState()
    s.toggleMute()
    expect(useSettingsStore.getState().muted).toBe(true)
    s.toggleMute()
    expect(useSettingsStore.getState().muted).toBe(false)

    s.setTheme('light')
    expect(useSettingsStore.getState().theme).toBe('light')
  })

  it('resets to defaults', async () => {
    const { useSettingsStore, DEFAULT_SETTINGS } = await importStore()
    const s = useSettingsStore.getState()
    s.setWpm(30)
    s.toggleMute()
    s.setTheme('light')
    s.reset()
    const after = useSettingsStore.getState()
    expect(after).toMatchObject(DEFAULT_SETTINGS)
    expect(after.muted).toBe(DEFAULT_SETTINGS.muted)
    expect(after.wpm).toBe(DEFAULT_SETTINGS.wpm)
  })

  it('persists settings (not actions) to the versioned key', async () => {
    const { useSettingsStore, STORAGE_KEY } = await importStore()
    useSettingsStore.getState().setWpm(22)
    expect(STORAGE_KEY).toBe('morse-app:v1')
    const saved = readPersisted()
    expect(saved.state).toMatchObject({ wpm: 22, toneHz: 600 })
    expect(saved.state).not.toHaveProperty('setWpm')
    expect(saved.version).toBe(1)
  })

  it('rehydrates persisted settings on creation', async () => {
    globalThis.localStorage.setItem(
      'morse-app:v1',
      JSON.stringify({
        state: { wpm: 25, toneHz: 500, volume: 0.2, muted: true, autoCommitMs: 500, theme: 'light' },
        version: 1,
      }),
    )
    vi.resetModules()
    const { useSettingsStore } = await importStore()
    expect(useSettingsStore.getState()).toMatchObject({
      wpm: 25,
      toneHz: 500,
      volume: 0.2,
      muted: true,
      autoCommitMs: 500,
      theme: 'light',
    })
  })

  it('fills keys missing from storage with defaults on rehydration', async () => {
    globalThis.localStorage.setItem('morse-app:v1', JSON.stringify({ state: { wpm: 20 }, version: 1 }))
    vi.resetModules()
    const { useSettingsStore } = await importStore()
    expect(useSettingsStore.getState()).toMatchObject({
      wpm: 20,
      toneHz: 600,
      volume: 0.6,
      muted: false,
      autoCommitMs: 700,
      theme: 'dark',
    })
  })
})
