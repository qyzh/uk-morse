/**
 * Minimal offline service worker (plan §7/§8 — no external dependency).
 * Shell is network-first for /, cache-first for hashed assets; GET only.
 */
const VERSION = 'morse-web-v1'
const SHELL = ['/', '/index.html', '/icon.svg', '/manifest.webmanifest']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return

  // Hashed Vite assets are immutable → cache-first.
  if (req.url.includes('/assets/')) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ??
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone()
              void caches.open(VERSION).then((cache) => cache.put(req, copy))
            }
            return res
          }),
      ),
    )
    return
  }

  // Navigations → network first, fall back to the cached shell when offline.
  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone()
            void caches.open(VERSION).then((cache) => cache.put(req, copy))
          }
          return res
        })
        .catch(() => caches.match('/index.html')),
    )
  }
})
