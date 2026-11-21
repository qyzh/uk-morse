/**
 * Render smoke tests — every view must render its core content without
 * throwing. Complements the core-logic unit tests; runs in node via
 * react-dom/server (no DOM dependency).
 */
import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import type { ComponentType, ReactElement } from 'react'
import { renderToString } from 'react-dom/server'
import App from '../../src/App'
import { Home } from '../../src/components/Home'
import { Trainer } from '../../src/components/Trainer'
import { Dictionary } from '../../src/components/Dictionary'
import { Encoder } from '../../src/components/Encoder'
import { Practice } from '../../src/components/Practice'
import { SettingsPanel } from '../../src/components/SettingsPanel'
import { AudioProvider } from '../../src/hooks/AudioProvider'

// App reads window.location.hash during render (hash routing).
if (typeof globalThis.window !== 'undefined' && !('location' in globalThis.window)) {
  Object.defineProperty(globalThis.window, 'location', {
    value: { hash: '' },
    writable: true,
    configurable: true,
  })
}

/** Views read the app's audio context; App already supplies its own. */
const withAudio = (View: ComponentType): ReactElement =>
  createElement(AudioProvider, null, createElement(View))

const cases: Array<[string, () => ReactElement, string]> = [
  ['App', () => createElement(App), 'morse_trainer'],
  ['Home', () => withAudio(Home), 'Mulai main'],
  ['Trainer', () => withAudio(Trainer), 'simbol aktif'],
  ['Dictionary', () => withAudio(Dictionary), 'entri'],
  ['Encoder', () => withAudio(Encoder), 'Putar morse'],
  ['Practice', () => withAudio(Practice), 'Encode'],
  ['SettingsPanel', () => withAudio(SettingsPanel), 'Kecepatan (WPM)'],
]

describe('view render smoke', () => {
  for (const [name, render, expected] of cases) {
    it(`${name} renders`, () => {
      expect(renderToString(render())).toContain(expected)
    })
  }
})
