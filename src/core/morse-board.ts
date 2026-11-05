/**
 * The board: the 26 letters laid out as the Morse tree, every route starting at
 * the antenna. Left of it dah runs left and dit runs down; right of it dit runs
 * right and dah runs down. Only positions live here; codes come from MORSE_MAP.
 */
import { MORSE_MAP } from './morse-data'

export const BOARD_WIDTH = 428
export const BOARD_HEIGHT = 548
export const ANTENNA = { x: 212, y: 112 }

type Side = 'top' | 'bottom' | 'left' | 'right' | 'upper-right' | 'lower-left'

export type BoardNode = {
  char: string
  /** The node's code, which is also its route from the antenna. */
  morse: string
  x: number
  y: number
  /** A dah's lamp runs along its wire, so it lies flat or stands up. */
  shape: 'dit' | 'dah-flat' | 'dah-tall'
  labelX: number
  labelY: number
  /** The node one element closer to the antenna. */
  parent: { x: number; y: number }
}

const LABEL_OFFSET: Record<Side, readonly [number, number]> = {
  top: [0, -22],
  bottom: [0, 34],
  left: [-25, 6],
  right: [25, 6],
  'upper-right': [23, -12],
  'lower-left': [-27, 20],
}

const LAYOUT: Record<string, readonly [x: number, y: number, label: Side]> = {
  E: [247, 112, 'top'],
  I: [293, 112, 'top'],
  S: [337, 112, 'top'],
  H: [381, 112, 'top'],
  U: [293, 168, 'left'],
  V: [337, 168, 'right'],
  F: [293, 226, 'right'],
  A: [247, 280, 'lower-left'],
  R: [293, 280, 'bottom'],
  L: [337, 280, 'right'],
  W: [247, 390, 'left'],
  P: [293, 390, 'right'],
  J: [247, 445, 'right'],
  T: [173, 112, 'top'],
  M: [115, 112, 'top'],
  O: [58, 112, 'top'],
  G: [115, 168, 'right'],
  Q: [58, 168, 'bottom'],
  Z: [115, 224, 'right'],
  N: [173, 280, 'upper-right'],
  K: [115, 280, 'top'],
  Y: [58, 280, 'top'],
  C: [115, 335, 'right'],
  D: [173, 390, 'upper-right'],
  X: [115, 390, 'left'],
  B: [173, 445, 'left'],
}

const position = (morse: string, chars: Record<string, string>) => {
  const [x, y] = LAYOUT[chars[morse]!] ?? [ANTENNA.x, ANTENNA.y]
  return { x, y }
}

const CHAR_OF_CODE = Object.fromEntries(Object.keys(LAYOUT).map((char) => [MORSE_MAP[char]!, char]))

export const BOARD_NODES: readonly BoardNode[] = Object.entries(LAYOUT).map(([char, [x, y, side]]) => {
  const morse = MORSE_MAP[char]!
  const parent = position(morse.slice(0, -1), CHAR_OF_CODE)
  const isDit = morse.endsWith('.')
  const [dx, dy] = LABEL_OFFSET[side]
  return {
    char,
    morse,
    x,
    y,
    shape: isDit ? 'dit' : parent.y === y ? 'dah-flat' : 'dah-tall',
    labelX: x + dx,
    labelY: y + dy,
    parent,
  }
})
