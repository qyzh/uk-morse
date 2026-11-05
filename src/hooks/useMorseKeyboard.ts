import { useLayoutEffect, useSyncExternalStore } from 'react'
import type { MorseInput } from '../input/morse-input'

/**
 * Connects a Morse input to the window's keyboard and returns its buffer.
 * A layout effect, so keys work from the first paint: a passive effect runs
 * after it, and a key pressed in between is lost.
 */
export function useMorseKeyboard(input: MorseInput): string {
  useLayoutEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (input.handleKey(event)) event.preventDefault()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      input.dispose()
    }
  }, [input])
  return useSyncExternalStore(input.subscribe, input.getBuffer, input.getBuffer)
}
