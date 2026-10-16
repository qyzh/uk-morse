// Minimal localStorage stub so zustand's persist middleware works in node
// (vitest runs without a DOM). Tests that rely on persistence read from here.
type StorageLike = {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
  clear: () => void
}

if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>()
  const stub: StorageLike = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => void store.set(key, String(value)),
    removeItem: (key) => void store.delete(key),
    clear: () => store.clear(),
  }
  Object.defineProperty(globalThis, 'localStorage', {
    value: stub,
    writable: true,
    configurable: true,
  })
  // Alias `window` so zustand's default persisted storage (window.localStorage) resolves.
  if (typeof globalThis.window === 'undefined') {
    Object.defineProperty(globalThis, 'window', {
      value: globalThis,
      writable: true,
      configurable: true,
    })
  }
}
