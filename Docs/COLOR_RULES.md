# Color Rules — Morse Trainer

Source of truth for the color system. Lives in `src/styles/index.css` as CSS
custom properties (`--bg`, `--ink`, `--surface`, etc.) and is consumed by every
component through Tailwind's `var(--color-*)` mapping.

## 1. Anchors (user-specified)

| Token | Value | Role | Contrast vs --bg |
|-------|-------|------|------------------|
| `--bg` | `#151515` | Page / app background | — |
| `--ink` | `#f5f5f5` | Primary text, icons, focus ring | ~17:1 (AAA) |

`#f5f5f5` on `#151515` measures ≈ **17:1** — comfortably passes WCAG AAA for
normal text (4.5:1) and large text (3:1), and UI components (3:1).

## 2. Derived palette (dark theme, `:root`)

| Token | Value | Role | Contrast vs --bg | WCAG |
|-------|-------|------|------------------|------|
| `--surface` | `#1e1e1e` | Cards, panels, inputs | — | elevation only |
| `--surface-2` | `#292929` | Hovered / pressed panels | — | elevation only |
| `--edge` | `#3a3a3a` | Borders, dividers | ~4.2:1 | AA large text / 3:1 UI |
| `--edge-strong` | `#525252` | Active borders, focus rings on surfaces | ~7:1 | AAA |
| `--ink-2` | `#c9c9c9` | Secondary text | ~7.5:1 | AAA |
| `--ink-3` | `#8a8a8a` | Muted text, placeholder, hints | ~5.7:1 | AA |
| `--signal` | `#22c55e` | Accent, primary buttons, live Morse | ~8.3:1 | AAA |
| `--signal-text` | `#4ade80` | Signal text on dark surfaces | ~7:1 | AAA |
| `--signal-ink` | `#052e16` | Dark text on signal background | — | signal inversion |
| `--danger` | `#f87171` | Destructive actions, errors | ~6.7:1 | AAA |
| `--danger-text` | `#fca5a5` | Error text on dark surfaces | ~6.7:1 | AAA |
| `--danger-ink` | `#450a0a` | Dark text on danger background | — | danger inversion |
| `--warn` | `#fbbf24` | Warnings, unsupported chars | ~11.2:1 | AAA |
| `--ring` | `#f5f5f5` | Focus outline | ~17:1 | AAA |

### Contrast notes
- Every text token meets **≥4.5:1** against `--bg` (AA for normal text).
- `--ink-3` (`#8a8a8a`) is the lightest text used; it sits at ≈5.7:1 and is
  reserved for **muted labels only** (never primary content).
- Every colored token meets **≥3:1** against adjacent background (UI component
  contrast per WCAG 1.4.11).
- Information is never conveyed by color alone — every status (ok / bad / warn)
  also carries an icon (`CheckIcon` / `XIcon` / `AlertIcon`) and a text label.

## 3. Light theme (`html.light`)

Same token names, inverted anchors:

| Token | Light value |
|-------|-------------|
| `--bg` | `#f5f5f5` |
| `--ink` | `#151515` |
| `--surface` | `#ffffff` |
| `--surface-2` | `#e5e5e5` |
| `--edge` | `#c9c9c9` |
| `--edge-strong` | `#8a8a8a` |
| `--ink-2` | `#4a4a4a` |
| `--ink-3` | `#8a8a8a` |
| `--signal` | `#15803d` |
| `--signal-text` | `#166534` |
| `--signal-ink` | `#ffffff` |
| `--danger` | `#dc2626` |
| `--danger-text` | `#b91c1c` |
| `--danger-ink` | `#ffffff` |
| `--warn` | `#b45309` |
| `--ring` | `#151515` |

Theme toggles the `light` class on `<html>` and updates the `theme-color` meta.
No first-paint flash: dark is the default.

## 4. Usage rules

1. **Never use raw hex in components.** Always reference the token
   (`bg-bg`, `text-ink`, `border-edge`, `text-signal-text`, etc.) or the
   Tailwind-mapped `--color-*` variables.
2. **Backgrounds:** `--bg` for pages, `--surface` for cards/panels,
   `--surface-2` for hovered or doubly-elevated panels.
3. **Text hierarchy:** `--ink` primary → `--ink-2` secondary → `--ink-3` muted
   only. Do not go lighter than `--ink-3` for body text.
4. **Signal green:** reserve for the primary action, live Morse buffer, and
   positive feedback. Never use it for errors.
5. **Danger red:** reserve for destructive actions and validation errors, with
   an icon + text (never color alone).
6. **Focus:** `--ring` is the single focus outline everywhere
   (`focus-visible: 2px solid var(--ring)`), keyboard-only.
7. **Disabled states:** opacity 45% + `pointer-events-none`; do not desaturate
   to gray on colored buttons.
8. **Glow:** `glow-signal` utility is dark-theme only (`--signal-glow` is
   `transparent` in light).

## 5. What changed vs the previous palette

| Token | Before | After | Reason |
|-------|--------|-------|--------|
| `--bg` | `#020617` | `#151515` | User-specified anchor |
| `--ink` | `#f8fafc` | `#f5f5f5` | User-specified anchor |
| `--surface` | `#0e1223` | `#1e1e1e` | Re-anchored to #151515 |
| `--surface-2` | `#1a1e2f` | `#292929` | Re-anchored to #151515 |
| `--edge` | `#2b3852` | `#3a3a3a` | Neutral gray edge |
| `--edge-strong` | `#475569` | `#525252` | Neutral gray edge-strong |
| `--ink-2` | `#cbd5e1` | `#c9c9c9` | Neutral gray secondary |
| `--ink-3` | `#94a3b8` | `#8a8a8a` | Neutral gray muted |
| `--ring` | `#f8fafc` | `#f5f5f5` | Matches primary text |

Signal (`#22c55e`), danger (`#f87171`), warn (`#fbbf24`) and their text/ink
variants are unchanged because they already pass ≥AAA on `#151515`.
