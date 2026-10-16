import { describe, expect, it } from 'vitest'
import {
  decodeSymbol,
  decodeStream,
  decodeWord,
  decodeText,
  UNKNOWN,
} from '../../src/core/decode'
import { encodeText } from '../../src/core/encode'

describe('decodeSymbol', () => {
  it('decodes letters, numbers and punctuation', () => {
    expect(decodeSymbol('.-')).toBe('A')
    expect(decodeSymbol('-...')).toBe('B')
    expect(decodeSymbol('-----')).toBe('0')
    expect(decodeSymbol('.-.-.-')).toBe('.')
    expect(decodeSymbol('.--.-.')).toBe('@')
  })

  it('decodes prosigns from single tokens', () => {
    expect(decodeSymbol('...---...')).toBe('SOS')
  })

  it('resolves char/prosign collisions toward the punctuation char', () => {
    // 'AR' and '+' share '.-.-.', 'BT' and '=' share '-...-'
    expect(decodeSymbol('.-.-.')).toBe('+')
    expect(decodeSymbol('-...-')).toBe('=')
  })

  it('trims surrounding whitespace', () => {
    expect(decodeSymbol(' .- ')).toBe('A')
  })

  it('maps unknown tokens to ?', () => {
    expect(decodeSymbol('.-.-')).toBe(UNKNOWN)
    expect(decodeSymbol('??')).toBe(UNKNOWN)
  })
})

describe('decodeStream (greedy longest-match)', () => {
  it('decodes unseparated letters', () => {
    // C A concatenated: '-.-..-' has no 6-symbol entry, greedy falls back to C+A
    expect(decodeStream('-.-..-')).toBe('CA')
    expect(decodeStream('..--..')).toBe('?') // itself a full entry
  })

  it('prefers the longest match: 8 dots = HH prosign', () => {
    expect(decodeStream('........')).toBe('HH')
    expect(decodeStream('..')).toBe('I')
  })

  it('decodes the SOS prosign from a raw stream', () => {
    expect(decodeStream('...---...')).toBe('SOS')
  })

  it('decodes SK "...-.-" greedily, not S+O prefixes', () => {
    expect(decodeStream('...-.-')).toBe('SK')
  })

  it('greedy longest-match reparses letter-wise streams differently', () => {
    // '.-' '-...' '...-..' letter-wise is ABE?F; greedy eats P/F/D instead
    expect(decodeStream('.--...-.-..')).toBe('PFD')
  })

  it('marks junk positions with ? and moves on', () => {
    // 'x' matches nothing at any length -> '?', then '.-' -> 'A'
    expect(decodeStream('x.-')).toBe('?A')
  })

  it('returns empty for empty input', () => {
    expect(decodeStream('')).toBe('')
  })
})

describe('decodeWord', () => {
  it('joins symbol tokens', () => {
    expect(decodeWord('... --- ...')).toBe('SOS')
    expect(decodeWord('.- -...')).toBe('AB')
  })

  it('single-token words go through the stream decoder', () => {
    expect(decodeWord('...---...')).toBe('SOS')
    expect(decodeWord('...---...')).toBe(decodeStream('...---...'))
  })

  it('keeps unknown tokens as ?', () => {
    expect(decodeWord('.- ?')).toBe('A' + UNKNOWN)
  })

  it('returns empty for empty input', () => {
    expect(decodeWord('')).toBe('')
    expect(decodeWord('   ')).toBe('')
  })
})

describe('decodeText', () => {
  it('splits on / inside messages, joins words with spaces', () => {
    expect(decodeText('... --- ... / ... --- ...')).toBe('SOS SOS')
    expect(decodeText(' .- -... / -.-. -.. ')).toBe('AB CD')
  })

  it('returns empty for empty and separator-only input', () => {
    expect(decodeText('')).toBe('')
    expect(decodeText('/ /')).toBe('')
  })

  it('is the inverse of encodeText for encodable text', () => {
    const text = 'HI PARIS 42 ?!'
    expect(decodeText(encodeText(text))).toBe(text)
  })

  it('IS invertible on collision patterns (punctuation wins)', () => {
    // encodeText('=') -> '-...-' -> '='; prosign stays on MORSE_LIST/MORSE_MAP
    expect(decodeText(encodeText('='))).toBe('=')
    expect(decodeText(encodeText('+'))).toBe('+')
  })
})
