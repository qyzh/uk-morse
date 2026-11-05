# Design concept — Morse Trainer

Anchor for future UI work. Visual reference: [mdxcn.dev](https://www.mdxcn.dev/). Palette source of truth: `src/styles/index.css`.

Load this file when changing layout, typography, chrome, or visual hierarchy. Load `src/styles/index.css` when changing color.

## Identity

**mdxcn structure, old paper palette, telegram-form components.** Take the editorial frame from mdxcn (open page, hairline crosshair, large tight type, quiet chrome) and set it on an aged sheet: a practice log from a telegraph office. Paper is the default, iron-gall ink does the work, and verdigris is kept for live Morse. Controls are parts of a printed telegram form: ruled boxes, joined cells, tick boxes. It keeps the terminal's manners: one typewriter family, prompt marks, square controls.

The sheet (`src/styles/paper.svg` plus browning at the edges) lies on `body`, so views sit directly on it. New surfaces follow this file; do not reintroduce sans-serif type, rounded controls, or underlined tabs.

## Layout

The page is a **void** with a **frame**, not a dashboard of equal cards.

- One column of content, lots of empty space, left-aligned once past the hero.
- Hairline rules and plus-marks at corners (the mdxcn crosshair) as the page boundary. Structure encodes “this is a document,” not decoration.
- Header is a thin strip: wordmark, navigation as one joined form row with the current view filled in ink, icon actions.
- Primary action, if there is one, sits in a single ink-filled control — not a row of equal buttons.
- Product objects stay visible: Morse buffer, dit/dah, dictionary rows, WPM. Hierarchy comes from those objects, not from wrapping every block in `Panel`.

## Components

Every control comes from `src/components/ui.tsx` and reads as part of a telegram form.

- Buttons: `primary` is filled ink, `secondary` is ruled, both with the form's `double-rule`. `ghost` is an underlined word. `row` and `cell` are for controls joined into a form, which rules them with `divide-*`.
- Fields use `FIELD`, one ruled box. A field for short codes adds `input-cells`, one box per character.
- Choices are tick boxes: `[x]` for the chosen one, `[ ]` for the rest. The brackets are decorative; `aria-pressed` carries the state.
- Feedback is `[x]` or `[!]` plus words.

## Type

**Courier Prime only** — `--font-sans` and `--font-mono` both point at it; ligatures are disabled. It ships regular and bold, so headlines are bold and `font-medium` reads as regular. The *treatment* is mdxcn edited by a terminal:

- Wordmark: `morse_trainer` with a static block caret.
- Display: sentence case, bold, tight tracking, prefixed by a dim `>`; no caret after the headline.
- Section labels: lowercase after a dim `//`; settings sections and desktop nav sit inside dim `[ ]`.
- Actions: uppercase with `0.08em` tracking; sentence-case nouns stay in labels, readouts, and body copy.
- Readouts use terminal notation: `benar: 0`, `menampilkan 52/60 entri`.
- Body: 16px, short measure, ink-2 for supporting copy.
- Controls are square (`rounded-none`); no rounded pills, cards, or toggles.
- Product UI copy stays Indonesian, as the app already is.

## Color

Do not restate hex here. Follow the tokens in `src/styles/index.css`.

Signal is scarce: the live buffer and positive drill feedback. The primary action is ink. Surfaces stay near `--bg`; `--surface` is a last resort, not the default wrapping.

## Motion

One change at a time, tied to input (key, play, commit). Prefer duration already used (`150ms` color). No ambient motion: every change is tied to input. Respect the global reduced-motion rule (already in `index.css`).

Arrival motion, nothing more: first paint plays one `boot-in` cascade (180ms, 6px); a view switch replays `view-in` (120ms, 3px). Both are `transform`/`opacity` only, run from the `--ease-out` token and `rise-in` keyframes in `index.css`, and there is no third audience for motion — no loops, no blinking caret, no scroll reveals in product views.

## Board (home view)

The home view is a game and nothing else: one form holding the board, a status row and its keys. There's no headline, and score, level and combo print on the board itself. The status row appears once a run starts; the play button is the form's last row.

- Lamps along the route stamp verdigris for a dit and vermilion for a dah, as the green and red of the hardware. Prussian blue (amber at night) is the target: the dot display, the marked lamp, the lives and the fuse. Vermilion here is a lamp, not an error, so failure is always said in words beside the board. Shape (circle, bar) carries dit and dah without color.
- A lit lamp lands with one `stamp` (110ms scale, `--ease-out`). It's tied to the key that lit it, and it's the only motion on the board.
- The fuse steps down a segment at a time, so it needs no animation and survives reduced motion. It only runs during a round. The target's lamp is marked, never pulsed.
- On touch screens the dit/dah keys are the form's bottom row, so the board and keys share one screen.

## Done when

A redesigned surface is done when all of these hold:

1. Reading order is wordmark → headline or primary Morse object → primary action → secondary detail. The home view has no headline.
2. Every color is a token from `src/styles/index.css` (`bg-bg`, `text-ink`, `text-signal-text`, …).
3. Signal appears at most on live Morse and positive feedback.
4. Type is mono throughout; prompts and brackets are decorative (`aria-hidden`) and never carry meaning alone.
5. Keyboard focus uses `--ring`; status is icon + text, not color alone.
6. Mobile still has the bottom nav and dit/dah pad; these key off touch capability (`pointer: coarse`), not width alone, so landscape phones keep them. The frame tightens, it does not spawn a second information architecture.
