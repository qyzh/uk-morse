# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev                              # Vite dev server
npm run build                            # tsc -b + vite build (the only typecheck)
npm run lint                             # eslint
npm test                                 # vitest, single run
npx vitest run tests/unit/timing.test.ts # one test file
npx vitest run -t 'wpmOf'                # tests matching a name
npm run coverage                         # covers src/core, src/audio, src/store only
npm run e2e                              # build, then Playwright against vite preview
```

`tsc -b` only includes `src/`, so test files are linted but not typechecked.

## Local-only files

`.gitignore` excludes `tests/e2e/`, `playwright.config.ts` and `.github/`. They exist in this checkout but are not committed, so the CI workflow (lint, coverage, build, Playwright, 120 kB gzipped JS budget) does not run from the repo. It also targets `main`, while the branch here is `master`. Run those checks locally.

## Architecture

Client-only React 19 SPA (Vite, Tailwind 4, Zustand) with no backend, deployed as static files and installable as a PWA. `PLAN.md` is the original spec, written in Indonesian. Code comments like `plan §3.1` refer to it.

Dependencies point one way: `core` ← `audio` ← `hooks` ← `components`. `src/core` is pure and framework-free, which is why the logic tests run in node.

- **Morse data:** `core/morse-data.ts` holds the source tables. `MORSE_MAP` is char → morse, and `CHAR_MAP` is the reverse. Some prosigns share a code with punctuation (`AR` / `+`, `BT` / `=`, `KN` / `(`). `CHAR_MAP` deliberately keeps the punctuation char, so decoding those codes never yields the prosign.
- **Morse string format:** `.`/`-` elements, a space between letters, `/` between words. `decodeText`, `encodeText` and `morseElements` all share it. `decodeSymbol` looks up one token; `decodeStream` does greedy longest-match on unseparated input.
- **Timing and audio:** `core/timing.ts` implements PARIS timing (dit = 1200 / WPM ms). `audio/morse-audio.ts` turns that into `TimingEvent`s and schedules Web Audio oscillators ahead of time rather than using JS timers per tone. `MorseAudio` takes an injectable `AudioContext` factory so tests can fake it, and creates the context lazily to satisfy autoplay policy.
- **`useMorseAudio`:** connects the engine to settings. Each view that calls it gets its own `MorseAudio` instance, so `stop()` only affects that view.
- **`useArrowBuffer`:** the Morse input model. `←` dit, `→` dah, Space commit, Enter word break, Backspace delete, Esc reset. It listens on `window` and also returns the same actions for the touch pad (`InputPad`), so keyboard and touch stay identical. The buffer lives in a ref and handlers mutate it directly, keeping side effects out of `setState` updaters so StrictMode can't double-commit. `Practice` runs two instances, gated by `enabled`; only one may be enabled at a time. The text-entry and interactive target guards exist so fields and focused buttons keep their keys (`tests/unit/keyboard-guard.test.ts`).
- **State:** `store/settingsStore.ts` persists to `morse-app:v1`. Setters clamp their values. When adding a setting, also add it to `partialize`, or it won't persist. `store/progressStore.ts` (`morse-app:progress:v1`) is tested but no component uses it yet: `Practice` keeps scores in local state, and they reset on reload.
- **Routing:** hash-based and hand-rolled in `App.tsx` (`#/trainer`, `#/dictionary`, ...), driven by the `VIEWS` array. There is no router dependency. `key={view}` on the view wrapper remounts the view and replays the `view-in` animation, so view-local state doesn't survive navigation.
- **PWA:** `public/sw.js` is hand-written and registers in production builds only. Bump `VERSION` when changing its caching. `public/_headers` sets the Cloudflare Pages cache policy.

## Testing

Vitest runs in node with no DOM. `tests/setup.ts` stubs `localStorage` and `window`. `views-smoke.test.ts` renders each view with `react-dom/server`, so effects and interactions don't run there; those are only covered by the Playwright spec. The smoke tests assert on Indonesian UI strings, so they break when copy changes.

`tests/unit/contrast.test.ts` parses `src/styles/index.css` and enforces WCAG contrast on the color tokens. It expects 6-digit hex values inside the `:root` and `html.light` token blocks.

## Conventions

- Product UI copy is Indonesian. Code and comments are English.
- The `Docs/DESIGN.md` rules are strict: one mono font, square controls, signal green only on live Morse, the primary action and positive feedback, and no ambient motion.
