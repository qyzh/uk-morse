import { describe, expect, it } from 'vitest'
import { ANTENNA, BOARD_NODES } from '../../src/core/morse-board'
import { DOT_COLUMNS, DOT_FONT } from '../../src/core/dot-font'
import { LETTERS } from '../../src/core/drills'

const nodeOf = (char: string) => BOARD_NODES.find((node) => node.char === char)!

describe('board', () => {
  it('has one node for each letter, with its code', () => {
    expect(BOARD_NODES).toHaveLength(LETTERS.length)
    for (const { char, morse } of LETTERS) expect(nodeOf(char).morse).toBe(morse)
  })

  it('gives every node its own place', () => {
    expect(new Set(BOARD_NODES.map((n) => `${n.x},${n.y}`)).size).toBe(BOARD_NODES.length)
  })

  it('wires every node straight to the node one element closer to the antenna', () => {
    for (const node of BOARD_NODES) {
      const expected = node.morse.length === 1 ? ANTENNA : nodeOf(BOARD_NODES.find((n) => n.morse === node.morse.slice(0, -1))!.char)
      expect(node.parent.x, node.char).toBe(expected.x)
      expect(node.parent.y, node.char).toBe(expected.y)
      expect(node.x === node.parent.x || node.y === node.parent.y, node.char).toBe(true)
    }
  })

  it('draws dits round and dahs along their wire', () => {
    expect(nodeOf('E').shape).toBe('dit')
    expect(nodeOf('T').shape).toBe('dah-flat')
    expect(nodeOf('A').shape).toBe('dah-tall')
  })

  it('has a dot glyph within the display for each letter', () => {
    for (const { char } of LETTERS) {
      const rows = DOT_FONT[char]!
      expect(rows, char).toHaveLength(7)
      for (const bits of rows) expect(bits).toBeLessThan(1 << DOT_COLUMNS)
    }
  })
})
