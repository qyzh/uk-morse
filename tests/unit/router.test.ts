import { describe, expect, it } from 'vitest'
import { NAV_VIEWS, VIEWS, renderView, titleOf, viewOfHash } from '../../src/view-router'

describe('view router', () => {
  it('parses hashes into views', () => {
    expect(viewOfHash('')).toBe('home')
    expect(viewOfHash('#/')).toBe('home')
    expect(viewOfHash('#/trainer')).toBe('trainer')
    expect(viewOfHash('settings')).toBe('settings')
    expect(viewOfHash('#/unknown')).toBe('home')
  })

  it('gives every view a full document title', () => {
    expect(titleOf('home')).toBe('morse_trainer')
    expect(titleOf('trainer')).toBe('Trainer — morse_trainer')
    expect(titleOf('settings')).toBe('Pengaturan — morse_trainer')
  })

  it('lists every view except home in the navs', () => {
    expect(NAV_VIEWS.map((v) => v.id)).toEqual(VIEWS.slice(1).map((v) => v.id))
    for (const view of NAV_VIEWS) {
      expect(view.label).toBeTruthy()
      expect(view.Icon).toBeTypeOf('function')
    }
  })

  it('renders an element for every view', () => {
    for (const view of VIEWS) expect(renderView(view.id)).toBeTruthy()
  })
})
