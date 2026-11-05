# Morse Trainer

A browser practice console for learning Morse code: keying it, reading it, and hearing it. It runs entirely client-side, works offline once loaded, and installs as a PWA. The product UI is in Indonesian.

## Features

- **Home:** the app opens on a board game. Walk the Morse tree to each target before the fuse runs out; levels get faster and the hints fade.
- **Trainer:** key Morse with the keyboard or the on-screen pad and watch it decode into a transcript. Prosigns stay one item, so Backspace removes them whole.
- **Kamus (dictionary):** every entry (letters, numbers, punctuation, prosigns) with its code, playable.
- **Encoder:** type text, hear it, and copy the Morse.
- **Latihan (practice):** Encode and Decode drills, plus a speed test. Progress is saved locally.
- **Pengaturan (settings):** speed (6–45 WPM), tone frequency (400–1000 Hz), volume, mute, auto-commit delay, and paper/night themes.

### Keying

| Key | Action |
| --- | --- |
| `←` | dit |
| `→` | dah |
| `Space` | commit the letter |
| `Enter` | word gap |
| `Backspace` | delete |
| `Esc` | reset |

The on-screen pad calls the same actions.

## Getting started

Requires Node 20 or newer.

```bash
npm install
npm run dev       # Vite dev server
```

| Command | What it does |
| --- | --- |
| `npm run build` | `tsc -b` and `vite build`. This is the only typecheck. |
| `npm run preview` | Serve the production build |
| `npm run lint` | ESLint |
| `npm test` | Vitest, single run |
| `npm run coverage` | Coverage for the framework-free modules |
| `npm run e2e` | Build, then Playwright against `vite preview` |

## Stack

React 19, TypeScript, Vite, Tailwind 4 and Zustand. There is no backend and no router dependency: routing is hash-based (`#/`, `#/trainer`, `#/dictionary`, `#/encoder`, `#/practice`, `#/settings`).

## Project layout

Dependencies point one way: `core` ← `audio`, `input` ← `practice` ← `components`, with `hooks` as thin adapters to React. Rules live in the framework-free modules, so they run in tests under node.

```
src/
  core/        Morse tables, encode/decode, PARIS timing, transcript, drills
  audio/       Web Audio scheduling of timing events
  input/       The keying model
  practice/    Drill, speed test and board game state
  store/       Persisted settings and progress (Zustand)
  hooks/       React adapters for audio and keyboard
  components/  Views and UI primitives
  styles/      Tokens and the paper texture
public/        PWA manifest, service worker, cache headers
tests/         Unit tests (e2e is local-only)
```

## Docs

- [`CONTEXT.md`](CONTEXT.md): domain terms (entry, code, element, transcript, drill, round)
- [`CLAUDE.md`](CLAUDE.md): architecture and conventions
- [`Docs/DESIGN.md`](Docs/DESIGN.md): visual design rules
- [`PLAN.md`](PLAN.md): the original spec, in Indonesian

## Deployment

The build output in `dist/` is static, so any static host works. `public/_headers` sets the Cloudflare Pages cache policy, and the hand-written service worker `public/sw.js` registers in production builds only. Bump its `VERSION` when you change its caching.
