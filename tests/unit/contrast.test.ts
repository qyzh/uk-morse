/**
 * Guards the palette tokens in src/styles/index.css: text tokens must meet
 * WCAG AA on the background, and the control-boundary token must meet 3:1.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const css = readFileSync(fileURLToPath(new URL('../../src/styles/index.css', import.meta.url)), 'utf8')

function tokenBlock(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`)
  if (start === -1) throw new Error(`missing token block: ${selector}`)
  const body = css.slice(start, css.indexOf('}', start))
  const tokens: Record<string, string> = {}
  for (const match of body.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})/g)) {
    tokens[match[1]!] = match[2]!
  }
  return tokens
}

function channel(value: string): number {
  const c = parseInt(value, 16) / 255
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => channel(hex.slice(i, i + 2)))
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi! + 0.05) / (lo! + 0.05)
}

const TEXT_TOKENS = ['ink', 'ink-2', 'ink-3', 'signal-text', 'danger-text', 'warn']

for (const [theme, selector] of [
  ['dark', ':root'],
  ['light', 'html.light'],
] as const) {
  describe(`${theme} palette`, () => {
    const tokens = tokenBlock(selector)

    it('text tokens meet 4.5:1 on --bg', () => {
      for (const token of TEXT_TOKENS) {
        expect(contrast(tokens[token]!, tokens.bg!), `${token} on bg`).toBeGreaterThanOrEqual(4.5)
      }
    })

    it('--edge-strong meets 3:1 as the control boundary', () => {
      expect(contrast(tokens['edge-strong']!, tokens.bg!)).toBeGreaterThanOrEqual(3)
    })

    it('button labels contrast with their colored backgrounds', () => {
      expect(contrast(tokens['signal-ink']!, tokens.signal!)).toBeGreaterThanOrEqual(4.5)
      expect(contrast(tokens['danger-ink']!, tokens.danger!)).toBeGreaterThanOrEqual(4.5)
    })
  })
}
