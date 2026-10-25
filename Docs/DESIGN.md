# Design concept — Morse Trainer

Anchor for future UI work. Visual reference: [mdxcn.dev](https://www.mdxcn.dev/). Palette source of truth: `src/styles/index.css`.

Load this file when changing layout, typography, chrome, or visual hierarchy. Load `src/styles/index.css` when changing color.

## Identity

**mdxcn structure, Morse palette, terminal voice.** Take the editorial frame from mdxcn (void page, hairline crosshair, large tight type, quiet chrome) and render it as a CW practice console. Keep Morse tokens: background `#151515`, ink `#f5f5f5`, signal green for live Morse and the one primary action. The interface is a terminal, not a skin: one mono family, prompt marks, square controls.

All views have been through the terminal pass. New surfaces follow this file; do not reintroduce sans-serif type, rounded controls, or underlined tabs.

## Layout

The page is a **void** with a **frame**, not a dashboard of equal cards.

- One column of content, lots of empty space, left-aligned once past the hero.
- Hairline rules and plus-marks at corners (the mdxcn crosshair) as the page boundary. Structure encodes “this is a document,” not decoration.
- Header is a thin strip: wordmark, a few text links, icon actions. No filled nav pills.
- Primary action, if there is one, sits in a single signal-colored control — not a row of equal buttons.
- Product objects stay visible: Morse buffer, dit/dah, dictionary rows, WPM. Hierarchy comes from those objects, not from wrapping every block in `Panel`.

## Type

**JetBrains Mono only** — `--font-sans` and `--font-mono` both point at it; ligatures are disabled. The *treatment* is mdxcn edited by a terminal:

- Wordmark: `morse_trainer` with a static block caret.
- Display: sentence case, medium weight, tight tracking, prefixed by a dim `>`; no caret after the headline.
- Section labels: lowercase after a dim `//`; settings sections and desktop nav sit inside dim `[ ]`.
- Actions: uppercase with `0.08em` tracking; sentence-case nouns stay in labels, readouts, and body copy.
- Readouts use terminal notation: `benar: 0`, `menampilkan 52/60 entri`.
- Body: 16px, short measure, ink-2 for supporting copy.
- Controls are square (`rounded-none`); no rounded pills, cards, or toggles.
- Product UI copy stays Indonesian, as the app already is.

## Color

Do not restate hex here. Follow the tokens in `src/styles/index.css`.

Signal is scarce: live buffer, the primary action, positive drill feedback. Surfaces stay near `--bg`; `--surface` is a last resort, not the default wrapping.

## Motion

One change at a time, tied to input (key, play, commit). Prefer duration already used (`150ms` color). No ambient motion: every change is tied to input. Respect the global reduced-motion rule (already in `index.css`).

Arrival motion, nothing more: first paint plays one `boot-in` cascade (180ms, 6px); a view switch replays `view-in` (120ms, 3px). Both are `transform`/`opacity` only, run from the `--ease-out` token and `rise-in` keyframes in `index.css`, and there is no third audience for motion — no loops, no blinking caret, no scroll reveals in product views.

## Done when

A redesigned surface is done when all of these hold:

1. Reading order is wordmark → headline or primary Morse object → primary action → secondary detail.
2. Every color is a token from `src/styles/index.css` (`bg-bg`, `text-ink`, `text-signal-text`, …).
3. Signal appears at most on live Morse, the primary action, and positive feedback.
4. Type is mono throughout; prompts and brackets are decorative (`aria-hidden`) and never carry meaning alone.
5. Keyboard focus uses `--ring`; status is icon + text, not color alone.
6. Mobile still has the bottom nav and dit/dah pad; these key off touch capability (`pointer: coarse`), not width alone, so landscape phones keep them. The frame tightens, it does not spawn a second information architecture.
