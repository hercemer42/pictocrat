import type { Image } from './api'

/** The recently shown photos and which one is on screen. */
export type Show = { history: Image[], pos: number }

export const HISTORY_LIMIT = 20

export const EMPTY_SHOW: Show = { history: [], pos: -1 }

/** Adds a photo at the end of the history and shows it, forgetting the oldest beyond the limit. */
export function append(show: Show, image: Image, limit = HISTORY_LIMIT): Show {
  const history = [...show.history, image].slice(-limit)
  return { history, pos: history.length - 1 }
}

export const canGoForward = (show: Show) => show.pos < show.history.length - 1

export const forward = (show: Show): Show => canGoForward(show) ? { ...show, pos: show.pos + 1 } : show

export const back = (show: Show): Show => show.pos > 0 ? { ...show, pos: show.pos - 1 } : show

/** Swaps in an updated copy of a photo (after a rotation) wherever it appears. */
export const replace = (show: Show, image: Image): Show =>
  ({ ...show, history: show.history.map(i => i.id === image.id ? image : i) })

/**
 * Removes photos from the history after a hide or delete, moving on to the photo that followed the
 * current one. `needsNext` is true when nothing followed it, so a new photo has to be fetched.
 */
export function drop(show: Show, gone: (image: Image) => boolean): { show: Show, needsNext: boolean } {
  const before = show.history.slice(0, show.pos).filter(i => !gone(i))
  const after = show.history.slice(show.pos + 1).filter(i => !gone(i))
  const history = [...before, ...after]

  return after.length
    ? { show: { history, pos: before.length }, needsNext: false }
    : { show: { history, pos: history.length - 1 }, needsNext: true }
}
