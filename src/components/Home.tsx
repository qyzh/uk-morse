import { useEffect, useState, useSyncExternalStore } from 'react'
import { decodeCode } from '../core/decode'
import { useMorseAudio } from '../hooks/useMorseAudio'
import { useMorseKeyboard } from '../hooks/useMorseKeyboard'
import { createBoardGame, hasHint, levelOf, multiplierOf } from '../practice/board-game'
import type { BoardGameState } from '../practice/board-game'
import { useProgressStore } from '../store/progressStore'
import { useSettingsStore } from '../store/settingsStore'
import { cx } from './cx'
import { PlayIcon } from './icons'
import { MorseBoard } from './MorseBoard'
import { Button, ElementKeys, Feedback, Kbd } from './ui'
import type { FeedbackState } from './ui'

function feedbackOf({ phase, outcome, target, points, score, isRecord }: BoardGameState): FeedbackState {
  if (phase === 'over') {
    return isRecord
      ? { kind: 'ok', text: `Rekor baru: ${score}` }
      : { kind: 'bad', text: `Permainan selesai. Skor ${score}` }
  }
  if (outcome === 'hit') return { kind: 'ok', text: `Benar. +${points}` }
  if (outcome === null || target === null) return null
  const reason = outcome === 'wrong' ? 'Salah arah' : 'Waktu habis'
  return { kind: 'bad', text: `${reason}. ${target.char} adalah ${target.morse}` }
}

/** The whole page is one form: the board, a status row while it's in use, and its keys. */
export function Home() {
  const { play, beep } = useMorseAudio()
  const [game] = useState(() =>
    createBoardGame({
      autoCommitMs: () => useSettingsStore.getState().autoCommitMs,
      beep,
      play,
      progress: useProgressStore.getState(),
    }),
  )
  const state = useSyncExternalStore(game.subscribe, game.getState, game.getState)
  const buffer = useMorseKeyboard(game.input)
  const best = useProgressStore((s) => s.bestBoardScore)

  useEffect(() => game.dispose, [game])

  const { phase, target, outcome, score, combo, lives, fuse } = state
  const playing = phase === 'playing'
  const level = levelOf(state.hits)
  const liveTarget = playing ? target : null
  const feedback = feedbackOf(state)

  return (
    <section
      aria-label="Permainan papan Morse"
      className="mx-auto w-full min-w-64 max-w-[calc((100dvh-19rem)*0.78)] border-2 border-ink md:max-w-[calc((100dvh-15rem)*0.78)]"
    >
      <MorseBoard
        className="p-3"
        route={outcome === null ? buffer : (target?.morse ?? '')}
        displayChar={liveTarget?.char ?? (buffer ? (decodeCode(buffer)?.char ?? null) : null)}
        markedChar={liveTarget && hasHint(level) ? liveTarget.char : null}
        score={score}
        best={Math.max(best, score)}
        level={level}
        multiplier={multiplierOf(combo)}
        lives={lives}
        fuse={fuse}
        onSound={liveTarget ? () => play(liveTarget.morse) : undefined}
      />

      <p aria-live="polite" className="sr-only">
        {liveTarget ? `Target: ${liveTarget.char}, level ${level}, skor ${score}, nyawa ${lives}` : ''}
      </p>

      <div
        className={cx(
          'flex min-h-14 items-center justify-center gap-4 border-t border-ink px-3',
          phase === 'ready' && 'hidden',
        )}
      >
        <Feedback state={feedback} />
        {feedback === null && (
          <p className="hidden items-center gap-3 text-sm text-ink-3 pointer-fine:md:flex">
            <span className="inline-flex items-center gap-1.5">
              <Kbd>←</Kbd> dit
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Kbd>→</Kbd> dah
            </span>
          </p>
        )}
        {feedback === null && (
          <p className="text-sm text-ink-3 pointer-fine:md:hidden">Mulai dari antena</p>
        )}
      </div>

      {!playing && (
        <Button
          variant="row"
          size="none"
          onClick={game.start}
          className="h-16 w-full border-t border-ink text-lg font-bold uppercase tracking-[0.08em]"
        >
          <PlayIcon className="size-5" />
          {phase === 'over' ? 'Main lagi' : 'Mulai main'}
        </Button>
      )}

      <ElementKeys
        className="border-t border-ink pointer-fine:md:hidden"
        onDit={game.input.dit}
        onDah={game.input.dah}
      />
    </section>
  )
}
