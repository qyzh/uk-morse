# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

Domain terms (entry, code, element, transcript, drill, round) are defined in `CONTEXT.md`. Use them in code and docs.

## Commands

```bash
npm run dev                              # Vite dev server
npm run build                            # tsc -b + vite build (the only typecheck)
npm run lint                             # eslint
npm test                                 # vitest, single run
npx vitest run tests/unit/timing.test.ts # one test file
npx vitest run -t 'wpmOf'                # tests matching a name
npm run coverage                         # covers the framework-free modules, not components
npm run e2e                              # build, then Playwright against vite preview
```

`tsc -b` only includes `src/`, so test files are linted but not typechecked.

## Local-only files

`.gitignore` excludes `tests/e2e/`, `playwright.config.ts` and `.github/`. They exist in this checkout but are not committed, so the CI workflow (lint, coverage, build, Playwright, 120 kB gzipped JS budget) does not run from the repo. It also targets `main`, while the branch here is `master`. Run those checks locally.

## Architecture

Client-only React 19 SPA (Vite, Tailwind 4, Zustand) with no backend, deployed as static files and installable as a PWA. `PLAN.md` is the original spec, written in Indonesian. Code comments like `plan §3.1` refer to it.

Dependencies point one way: `core` ← `audio`, `input` ← `practice` ← `components`, with `hooks` as thin adapters to React. Rules live in the framework-free modules, not in components, so they run in tests under node. `src/core` is also pure.

- **Morse data:** `core/morse-data.ts` holds the source tables. `MORSE_MAP` is char → morse, and `CHAR_MAP` is the reverse. Some prosigns share a code with punctuation (`AR` / `+`, `BT` / `=`, `KN` / `(`). `CHAR_MAP` deliberately keeps the punctuation char, so decoding those codes never yields the prosign.
- **Morse string format:** `.`/`-` elements, a space between letters, `/` between words. `encodeText` and `morseElements` share it.
- **Translation:** failure is reported apart from output, never as a character, because `?` is itself an entry. `decodeCode` returns a `MorseEntry` or `null`; `encodeText` returns `{ morse, unsupported }`.
- **Transcript:** `core/transcript.ts` keeps the Trainer's output as entries and word gaps rather than a string, so a prosign replays as one code and Backspace removes it whole.
- **Timing and audio:** `core/timing.ts` implements PARIS timing (dit = 1200 / WPM ms). `audio/morse-audio.ts` turns that into `TimingEvent`s and schedules Web Audio oscillators ahead of time rather than using JS timers per tone. `MorseAudio` takes settings as a function, read at each sound, and an injectable `AudioContext` factory so tests can fake it. It creates the context on the first sound to satisfy autoplay policy.
- **`useMorseAudio`:** owns the app's single `MorseAudio`, so two sounds can't overlap: new playback replaces what's sounding, and a key-press beep cuts playback. Mute lives in the engine, and the hook stops audio when a view unmounts or mute turns on.
- **Morse input:** `input/morse-input.ts` is the keying model. `←` dit, `→` dah, Space commit, Enter word gap, Backspace delete, Esc reset. It's framework-free, so whole key sequences run in tests, and the pad calls the same actions as the keyboard. `useMorseKeyboard` is the thin adapter that connects it to `window` and React. A gate controls it: `open`, `held` (keys swallowed and ignored) or `closed` (keys left to the page). Moving off `open` drops the buffer. Text fields keep every key, and focused controls keep Space and Enter unless a letter is mid-way through being keyed.
- **Practice session:** `practice/practice-session.ts` owns the Encode and Decode drills and the speed test: targets, scoring, the 450ms end of a round, the countdown, mode switching and recording progress. `Practice.tsx` only renders its state. It holds one `MorseInput` and derives the gate from its state, so don't set the gate from a view.
- **State:** `store/settingsStore.ts` persists to `morse-app:v1`. Setters clamp their values. When adding a setting, also add it to `partialize`, or it won't persist. `store/progressStore.ts` persists progress to `morse-app:progress:v1`. Session scores aren't persisted.
- **Routing:** hash-based and hand-rolled in `App.tsx` (`#/trainer`, `#/dictionary`, ...), driven by the `VIEWS` array. There is no router dependency. `key={view}` on the view wrapper remounts the view and replays the `view-in` animation, so view-local state doesn't survive navigation.
- **PWA:** `public/sw.js` is hand-written and registers in production builds only. Bump `VERSION` when changing its caching. `public/_headers` sets the Cloudflare Pages cache policy.

## Testing

Vitest runs in node with no DOM. `tests/setup.ts` stubs `localStorage` and `window`. `views-smoke.test.ts` renders each view with `react-dom/server`, so effects don't run there. Timer-driven rules are tested through their module's interface with fake timers (`morse-input.test.ts`, `practice-session.test.ts`). Audio is tested with `fake-audio.ts` standing in for `AudioContext`. The smoke tests assert on Indonesian UI strings, so they break when copy changes.

`tests/unit/contrast.test.ts` parses `src/styles/index.css` and enforces WCAG contrast on the color tokens. It expects 6-digit hex values inside the `:root` and `html.light` token blocks.

## Conventions

- Product UI copy is Indonesian. Code and comments are English.
- The `Docs/DESIGN.md` rules are strict: one mono font, square controls, signal green only on live Morse, the primary action and positive feedback, and no ambient motion.
