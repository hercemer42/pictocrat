/** Holds one photo fetched ahead of time, so the next slide appears without waiting for its download. */
export function prefetcher<T>(fetchNext: () => Promise<T>) {
  let ahead: Promise<T> | null = null

  return {
    /** Starts fetching the next photo in the background, unless one is already on its way. */
    start() {
      if (ahead) return
      ahead = fetchNext()
      ahead.catch(() => {})  // a failure surfaces when the photo is taken, not as an unhandled rejection
    },

    /** The prefetched photo if there is one (waiting for it if it's still downloading), else a fresh fetch. */
    take() {
      const next = ahead ?? fetchNext()
      ahead = null
      return next
    },

    /** Forgets the prefetched photo, e.g. when it may be in a folder that was just hidden or deleted. */
    discard() {
      ahead = null
    },
  }
}
