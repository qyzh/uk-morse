import { ANTENNA, BOARD_HEIGHT, BOARD_NODES, BOARD_WIDTH } from '../core/morse-board'
import type { BoardNode } from '../core/morse-board'
import { DOT_COLUMNS, dotRows } from '../core/dot-font'
import { FUSE_SEGMENTS, START_LIVES } from '../practice/board-game'
import { cx } from './cx'

const DOT_PITCH = 12
const DOT_X = 340
const DOT_Y = 322
const LIFE_Y = 428
const SPEAKER_Y = 490
const SCORE_Y = 472
const FUSE_X = 32
const FUSE_Y = 522
const FUSE_GAP = 5
const FUSE_WIDTH = (BOARD_WIDTH - 2 * FUSE_X - (FUSE_SEGMENTS - 1) * FUSE_GAP) / FUSE_SEGMENTS

function Lamp({ node, className }: { node: BoardNode; className?: string }) {
  if (node.shape === 'dit') {
    return <circle cx={node.x} cy={node.y} r={14} className={className} />
  }
  const [width, height] = node.shape === 'dah-flat' ? [38, 19] : [19, 38]
  return (
    <rect
      x={node.x - width / 2}
      y={node.y - height / 2}
      width={width}
      height={height}
      className={className}
    />
  )
}

function Node({ node, lit, marked }: { node: BoardNode; lit: boolean; marked: boolean }) {
  const dit = node.shape === 'dit'
  return (
    <g>
      <Lamp
        node={node}
        className={cx(
          'transition-[fill,stroke] duration-75',
          lit && 'stamp stroke-2',
          lit && (dit ? 'fill-led-dit stroke-led-dit glow-dit' : 'fill-led-dah stroke-led-dah glow-dah'),
          !lit && 'fill-bg',
          !lit && (marked ? 'stroke-led-target glow-target stroke-[3.5]' : 'stroke-ink stroke-2'),
        )}
      />
      <text
        x={node.labelX}
        y={node.labelY}
        textAnchor="middle"
        className={cx(
          'text-[18px] font-bold',
          lit ? (dit ? 'fill-led-dit' : 'fill-led-dah') : marked ? 'fill-led-target' : 'fill-ink',
        )}
      >
        {node.char}
      </text>
    </g>
  )
}

function Antenna() {
  const { x, y } = ANTENNA
  return (
    <path
      d={`M${x} ${y}V${y - 62}M${x - 21} ${y - 62}H${x + 21}L${x} ${y - 16}ZM${x - 10} ${y - 62}L${x} ${y - 16}L${x + 10} ${y - 62}`}
      className="fill-none stroke-ink stroke-2"
    />
  )
}

function DotDisplay({ char }: { char: string | null }) {
  return (
    <g>
      {dotRows(char).flatMap((bits, row) =>
        Array.from({ length: DOT_COLUMNS }, (_, column) => {
          const on = (bits >> (DOT_COLUMNS - 1 - column)) & 1
          return (
            <circle
              key={`${row}-${column}`}
              cx={DOT_X + column * DOT_PITCH}
              cy={DOT_Y + row * DOT_PITCH}
              r={4.5}
              className={on ? 'fill-led-target' : 'fill-board-off'}
            />
          )
        }),
      )}
    </g>
  )
}

function Speaker() {
  const x = ANTENNA.x
  const arc = (r: number) =>
    `M${x - r * 0.7} ${SPEAKER_Y - r * 0.7}A${r} ${r} 0 0 0 ${x - r * 0.7} ${SPEAKER_Y + r * 0.7}` +
    `M${x + r * 0.7} ${SPEAKER_Y - r * 0.7}A${r} ${r} 0 0 1 ${x + r * 0.7} ${SPEAKER_Y + r * 0.7}`
  return (
    <g className="fill-none stroke-ink">
      <circle cx={x} cy={SPEAKER_Y} r={9} className="stroke-[3]" />
      <path d={`${arc(17)}${arc(25)}`} strokeWidth={4} strokeLinecap="round" />
    </g>
  )
}

/**
 * The board as a chart printed on a form: wires and lamps for the Morse tree.
 * Lamps along `route` stamp green for a dit and red for a dah, in the shapes
 * the code is drawn in, so shape still tells them apart without color.
 */
export function MorseBoard({
  route,
  displayChar,
  markedChar,
  score,
  best,
  level,
  multiplier,
  lives,
  fuse,
  onSound,
  className,
}: {
  /** The code to light, element by element from the antenna. */
  route: string
  displayChar: string | null
  /** A target to mark on the tree, when the level gives that hint. */
  markedChar: string | null
  score: number
  best: number
  level: number
  multiplier: number
  lives: number
  fuse: number
  /** Sounds the target. Leaves the speaker inert when absent. */
  onSound?: (() => void) | undefined
  className?: string
}) {
  return (
    <div className={cx('relative', className)}>
      <svg
        viewBox={`0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}`}
        role="img"
        aria-label="Papan Morse: pohon 26 huruf yang bercabang dari antena"
        className="block h-auto w-full font-mono"
      >
        <g>
          <text x="30" y="60" className="fill-ink text-[42px] font-bold">
            MORSE
          </text>
          <text x="282" y="60" className="fill-ink text-[42px] font-bold">
            CODE
          </text>
          <g className="stroke-ink stroke-2">
            {BOARD_NODES.map((node) => (
              <line key={node.char} x1={node.parent.x} y1={node.parent.y} x2={node.x} y2={node.y} />
            ))}
          </g>
          <Antenna />
          <Speaker />
        </g>
        {BOARD_NODES.map((node) => (
          <Node
            key={node.char}
            node={node}
            lit={route.startsWith(node.morse)}
            marked={node.char === markedChar}
          />
        ))}

        <DotDisplay char={displayChar} />
        <g>
          {Array.from({ length: START_LIVES }, (_, i) => (
            <circle
              key={i}
              cx={DOT_X + i * 24}
              cy={LIFE_Y}
              r={7}
              className={i < lives ? 'fill-led-target stroke-led-target stroke-2' : 'fill-bg stroke-ink stroke-2'}
            />
          ))}
        </g>
        <g className="fill-ink text-[15px]">
          <text x={FUSE_X} y={SCORE_Y}>skor {score}</text>
          <text x={FUSE_X} y={SCORE_Y + 18}>terbaik {best}</text>
          <text x={FUSE_X} y={SCORE_Y + 36}>level {level} x{multiplier}</text>
        </g>
        <g>
          {Array.from({ length: FUSE_SEGMENTS }, (_, i) => (
            <rect
              key={i}
              x={FUSE_X + i * (FUSE_WIDTH + FUSE_GAP)}
              y={FUSE_Y}
              width={FUSE_WIDTH}
              height={7}
              className={i < fuse ? 'fill-led-target' : 'fill-board-off'}
            />
          ))}
        </g>
      </svg>
      {onSound && (
        <button
          type="button"
          onClick={onSound}
          aria-label="Putar bunyi target"
          className="absolute size-14 -translate-x-1/2 -translate-y-1/2"
          style={{
            left: `${(ANTENNA.x / BOARD_WIDTH) * 100}%`,
            top: `${(SPEAKER_Y / BOARD_HEIGHT) * 100}%`,
          }}
        />
      )}
    </div>
  )
}
