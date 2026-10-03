import { useEffect, useState, type MouseEvent } from 'react'
import { api, type Image } from './api'

type Props = {
  seconds: number
  onSeconds: (seconds: number) => void
  onRescan: () => Promise<void>
  onError: (error: unknown) => void
  onClose: () => void
}

export function Settings({ seconds, onSeconds, onRescan, onError, onClose }: Props) {
  const [hidden, setHidden] = useState<Image[] | null>(null)
  const [input, setInput] = useState(String(seconds))
  const [scanning, setScanning] = useState(false)

  const load = () => api.hidden().then(setHidden, onError)

  useEffect(() => {
    load()
  }, [])

  const saveSeconds = async () => {
    const value = Number(input)

    if (!Number.isInteger(value) || value < 1) {
      setInput(String(seconds))
      return
    }

    try {
      onSeconds((await api.saveSettings({ interval: value })).interval)
    } catch (error) {
      onError(error)
    }
  }

  const rescan = async () => {
    setScanning(true)
    await onRescan()
    setScanning(false)
  }

  const unhide = (image: Image) => api.updateImage(image.id, { hidden: false }).then(load, onError)

  const unhideDir = (e: MouseEvent, dir: string) => {
    e.preventDefault()  // the button sits inside <summary>; don't toggle the group open
    api.setDirHidden(dir, false).then(load, onError)
  }

  const groups = Map.groupBy(hidden ?? [], i => i.dir)

  return (
    <div className="modal-backdrop">
      <div className="modal settings">
        <header>
          <h2>Settings</h2>
          <button onClick={onClose}>Close</button>
        </header>

        <label>
          Seconds per photo
          <input
            type="number"
            min={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onBlur={saveSeconds}
            onKeyDown={e => e.key === 'Enter' && saveSeconds()}
          />
        </label>

        <button disabled={scanning} onClick={rescan}>{scanning ? 'Scanning…' : 'Rescan picture folder'}</button>

        <h3>Hidden photos {hidden && `(${hidden.length})`}</h3>
        {hidden?.length === 0 && <p>None.</p>}

        {[...groups].map(([dir, images]) => (
          <details key={dir}>
            <summary>
              <span>{dir || '(top-level folder)'} ({images.length})</span>
              {dir && <button onClick={e => unhideDir(e, dir)}>Unhide folder</button>}
            </summary>
            <ul>
              {images.map(image => (
                <li key={image.id}>
                  <span>{image.path.split('/').pop()}</span>
                  <button onClick={() => unhide(image)}>Unhide</button>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>
    </div>
  )
}
