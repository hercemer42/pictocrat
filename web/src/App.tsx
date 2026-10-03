import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { api, inDir, photoUrl, type Image, type Settings as SettingsValues } from './api'
import { formatTaken } from './dates'
import { EMPTY_SHOW, append, back, canGoForward, drop, forward, replace } from './history'
import { prefetcher } from './prefetch'
import { Settings } from './Settings'

const CONTROLS_TIMEOUT = 10_000  // controls hide, and the show resumes, after this long untouched
const EMPTY_RETRY = 60           // seconds between checks when there are no photos yet
const SWIPE_DISTANCE = 60        // px

/** Resolves once the browser has the image, so the previous photo stays up until the next one is ready. */
const preload = (image: Image) => new Promise<Image>(resolve => {
  const img = new window.Image()
  img.onload = img.onerror = () => resolve(image)
  img.src = photoUrl(image)
})

const errorText = (error: unknown) => error instanceof Error ? error.message : String(error)

export function App() {
  const [show, setShow] = useState(EMPTY_SHOW)
  const [attempts, setAttempts] = useState(0)  // bumped after every fetch, so the timer re-arms even when nothing changed
  const [playing, setPlaying] = useState(true)
  const [controls, setControls] = useState(false)
  const [touched, setTouched] = useState(0)  // bumped on each interaction, restarting the controls' auto-hide
  const [confirm, setConfirm] = useState<'image' | 'dir' | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settings, setSettings] = useState<SettingsValues>({ interval: 10, newFirst: false })
  const [message, setMessage] = useState('')
  const [empty, setEmpty] = useState(false)

  const current = useRef(show)
  current.current = show
  const image = show.history[show.pos]
  const poke = () => setTouched(n => n + 1)

  useEffect(() => {
    if (!message) return
    const timer = setTimeout(() => setMessage(''), 4000)
    return () => clearTimeout(timer)
  }, [message])

  const fetchNext = useCallback(async () => {
    const next = await api.next()
    setEmpty(!next)
    return next && preload(next)
  }, [])

  const prefetch = useMemo(() => prefetcher(fetchNext), [fetchNext])

  // as soon as a photo is up, start downloading the next one
  useEffect(() => {
    if (image) prefetch.start()
  }, [image, prefetch])

  /** Moves forward through the history, or on to a new random photo at its end. */
  const advance = useCallback(async () => {
    if (canGoForward(current.current)) {
      setShow(forward(current.current))
      return
    }

    try {
      const next = await prefetch.take()
      if (next) setShow(s => append(s, next))
    } catch (error) {
      setMessage(errorText(error))
    } finally {
      setAttempts(n => n + 1)
    }
  }, [prefetch])

  const previous = () => setShow(back)

  useEffect(() => {
    api.settings().then(setSettings, error => setMessage(errorText(error)))
    advance()
  }, [advance])

  const paused = !playing || controls || confirm !== null || settingsOpen

  useEffect(() => {
    if (paused && !empty) return
    const timer = setTimeout(advance, (empty ? EMPTY_RETRY : settings.interval) * 1000)
    return () => clearTimeout(timer)
  }, [paused, empty, show, attempts, settings.interval, advance])

  useEffect(() => {
    if (!controls || confirm || settingsOpen) return
    const timer = setTimeout(() => setControls(false), CONTROLS_TIMEOUT)
    return () => clearTimeout(timer)
  }, [controls, confirm, settingsOpen, touched])

  // swipe left/right moves through the photos, tap toggles the controls
  const downX = useRef<number | null>(null)
  const swiped = useRef(false)

  const onPointerDown = (e: PointerEvent) => {
    downX.current = e.clientX
    swiped.current = false
  }

  const onPointerUp = (e: PointerEvent) => {
    if (downX.current === null) return
    const dx = e.clientX - downX.current
    downX.current = null

    if (Math.abs(dx) < SWIPE_DISTANCE) return
    swiped.current = true
    if (dx < 0) advance()
    else previous()
    poke()
  }

  // Taps act on click, not pointerup: the browser has already picked the click's target by then, so a
  // tap can't land on a control button that pops up under the finger (Hide photo, Delete photo).
  const onTap = () => {
    if (swiped.current) return
    setControls(c => !c)
    poke()
  }

  /** Drops photos from the history after a hide or delete, then shows the next one. */
  const dropAndMoveOn = async (gone: (i: Image) => boolean) => {
    const { show: kept, needsNext } = drop(current.current, gone)

    // the prefetched photo may be in the folder that was just hidden or deleted
    prefetch.discard()

    if (!needsNext) {
      setShow(kept)
      return
    }

    const next = await prefetch.take()
    setShow(next ? append(kept, next) : kept)
  }

  const act = (fn: () => unknown) => async () => {
    poke()

    try {
      await fn()
    } catch (error) {
      setMessage(errorText(error))
    }
  }

  const rotate = (turns: number) => act(async () => {
    const updated = await api.updateImage(image.id, { rotate: image.rotate + turns })
    setShow(s => replace(s, updated))
  })

  const hideImage = act(async () => {
    await api.updateImage(image.id, { hidden: true })
    setMessage('Photo hidden. You can unhide it from Settings.')
    await dropAndMoveOn(i => i.id === image.id)
  })

  const topLevel = () => setMessage('This photo is in the top-level picture folder, which can\'t be hidden or deleted as a whole.')

  const hideDir = act(async () => {
    if (!image.dir) return topLevel()
    const { changed } = await api.setDirHidden(image.dir, true)
    setMessage(`${changed} photos in "${image.dir}" hidden. You can unhide them from Settings.`)
    await dropAndMoveOn(i => inDir(i, image.dir))
  })

  const deleteConfirmed = act(async () => {
    const target = image
    const kind = confirm
    setConfirm(null)

    if (kind === 'image') {
      await api.deleteImage(target.id)
      setMessage('Photo moved to the trash. You can restore it from Settings for 30 days.')
      await dropAndMoveOn(i => i.id === target.id)
    } else {
      const { deleted } = await api.deleteDir(target.dir)
      setMessage(`Folder "${target.dir}" (${deleted} photos) moved to the trash. You can restore it from Settings for 30 days.`)
      await dropAndMoveOn(i => inDir(i, target.dir))
    }
  })

  const rescan = act(async () => {
    const result = await api.scan()
    setMessage(`Scan done: ${result.added} new, ${result.removed} gone, ${result.total} photos.`)
    if (result.total) await advance()
  })

  return (
    <>
      <div className="stage" onPointerDown={onPointerDown} onPointerUp={onPointerUp} onClick={onTap}>
        {image && (
          <img
            key={image.id}
            className={image.rotate % 2 ? 'photo sideways' : 'photo'}
            style={{ '--rotate': `${image.rotate * 90}deg` } as CSSProperties}
            src={photoUrl(image)}
            alt={image.path}
            draggable={false}
          />
        )}
      </div>

      {empty && !image && (
        <div className="empty">
          <p>No photos to show yet.</p>
          <button onClick={rescan}>Rescan picture folder</button>
        </div>
      )}

      {!playing && !controls && image && <div className="paused">❚❚ Paused</div>}

      {!controls && image?.taken && <div className="taken">{formatTaken(image.taken)}</div>}

      {controls && image && (
        <div className="controls" onPointerDown={poke}>
          <div className="caption">{image.path}</div>
          <div className="buttons">
            <button onClick={act(previous)}>◀ Previous</button>
            <button onClick={act(() => setPlaying(p => !p))}>{playing ? '❚❚ Pause' : '▶ Play'}</button>
            <button onClick={act(advance)}>Next ▶</button>
            <span className="gap" />
            <button onClick={rotate(-1)}>↺ Rotate</button>
            <button onClick={rotate(1)}>↻ Rotate</button>
            <span className="gap" />
            <button onClick={hideImage}>Hide photo</button>
            <button onClick={hideDir}>Hide folder</button>
            <button className="danger" onClick={() => setConfirm('image')}>Delete photo</button>
            <button className="danger" onClick={() => image.dir ? setConfirm('dir') : topLevel()}>Delete folder</button>
            <span className="gap" />
            <button onClick={() => setSettingsOpen(true)}>⚙ Settings</button>
          </div>
        </div>
      )}

      {confirm && image && (
        <div className="modal-backdrop">
          <div className="modal">
            {confirm === 'image'
              ? <><p>Move this photo to the trash? It can be restored from Settings for 30 days.</p><code>{image.path}</code></>
              : <><p>Move this whole folder, including its subfolders, to the trash? It can be restored from Settings for 30 days.</p><code>{image.dir}</code></>}
            <div className="modal-buttons">
              <button onClick={() => setConfirm(null)}>Cancel</button>
              <button className="danger" onClick={deleteConfirmed}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {settingsOpen && (
        <Settings
          settings={settings}
          onSettings={setSettings}
          onRescan={rescan}
          onError={error => setMessage(errorText(error))}
          onClose={() => { setSettingsOpen(false); poke() }}
        />
      )}

      {message && <div className="toast">{message}</div>}
    </>
  )
}
