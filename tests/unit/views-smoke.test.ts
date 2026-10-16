/**
 * Render smoke tests — every view must render its core content without
 * throwing. Complements the core-logic unit tests; runs in node via
 * react-dom/server (no DOM dependency).
 */
import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import App from '../../src/App'
import { Trainer } from '../../src/components/Trainer'
import { Dictionary } from '../../src/components/Dictionary'
import { Encoder } from '../../src/components/Encoder'
import { Practice } from '../../src/components/Practice'
import { SettingsPanel } from '../../src/components/SettingsPanel'

// App reads window.location.hash during render (hash routing).
if (typeof globalThis.window !== 'undefined' && !('location' in globalThis.window)) {
  Object.defineProperty(globalThis.window, 'location', {
    value: { hash: '' },
    writable: true,
    configurable: true,
  })
}

const cases: Array<[string, () => unknown, string]> = [
  ['App', App, 'Morse Trainer'],
  ['Trainer', Trainer, 'Simbol aktif'],
  ['Dictionary', Dictionary, 'Menampilkan'],
  ['Encoder', Encoder, 'Putar morse'],
  ['Practice', Practice, 'Encode'],
  ['SettingsPanel', SettingsPanel, 'Kecepatan (WPM)'],
]

describe('view render smoke', () => {
  for (const [name, Component, expected] of cases) {
    it(`${name} renders`, () => {
      const html = renderToString(createElement(Component as () => unknown))
      expect(html).toContain(expected)
    })
  }
})
