import { describe, expect, it } from 'vitest'
import { encodeText } from '../../src/core/encode'

describe('encodeText', () => {
  it('separates codes with spaces and words with " / "', () => {
    expect(encodeText('HI THERE').morse).toBe('.... .. / - .... . .-. .')
  })

  it('is case-insensitive', () => {
    expect(encodeText('hi').morse).toBe('.... ..')
    expect(encodeText('sos').morse).toBe('... --- ...')
  })

  it('treats every whitespace run as one word gap', () => {
    expect(encodeText('A  B\n\tC').morse).toBe('.- / -... / -.-.')
  })

  it('passes punctuation through', () => {
    expect(encodeText('hi!').morse).toBe('.... .. -.-.--')
    expect(encodeText('123.').morse).toBe('.---- ..--- ...-- .-.-.-')
    expect(encodeText("don't").morse).toBe('-.. --- -. .----. -')
  })

  it('returns nothing for blank input', () => {
    expect(encodeText('')).toEqual({ morse: '', unsupported: [] })
    expect(encodeText('   ')).toEqual({ morse: '', unsupported: [] })
  })

  it('leaves unsupported characters out and reports them', () => {
    expect(encodeText('A€B')).toEqual({ morse: '.- -...', unsupported: ['€'] })
  })

  it('drops a word when nothing in it is supported', () => {
    expect(encodeText('€ A')).toEqual({ morse: '.-', unsupported: ['€'] })
    expect(encodeText('A € B').morse).toBe('.- / -...')
  })

  it('has nothing to play when nothing is supported', () => {
    expect(encodeText('€')).toEqual({ morse: '', unsupported: ['€'] })
  })

  it('reports each unsupported character once, in first-seen order', () => {
    expect(encodeText('€#€').unsupported).toEqual(['€', '#'])
  })

  it('never reports whitespace as unsupported', () => {
    expect(encodeText('A\nB\tC').unsupported).toEqual([])
  })
})
