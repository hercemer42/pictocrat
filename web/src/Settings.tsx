import { useEffect, useState, type MouseEvent } from 'react'
import { api, type Image, type Settings as SettingsValues, type TrashEntry } from './api'

type Props = {
  settings: SettingsValues
  onSettings: (settings: SettingsValues) => void
  onRescan: () => Promise<void>
  onError: (error: unknown) => void
  onClose: () => void
}

const day = (ms: number) => new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })

export function Settings({ settings, onSettings, onRescan, onError, onClose }: Props) {
  const [hidden, setHidden] = useState<Image[] | null>(null)
  const [trash, setTrash] = useState<TrashEntry[] | null>(null)
  const [input, setInput] = useState(String(settings.interval))
  const [scanning, setScanning] = useState(false)

  const load = () => {
    api.hidden().then(setHidden, onError)
    api.trash().then(setTrash, onError)
  }

  useEffect(() => {
    load()
  }, [])

  const save = async (changes: Partial<SettingsValues>) => {
    try {
      onSettings(await api.saveSettings(changes))
    } catch (error) {
      onError(error)
    }
  }

  const saveInterval = () => {
    const value = Number(input)

    if (!Number.isInteger(value) || value < 1) {
      setInput(String(settings.interval))
      return
    }

    save({ interval: value })
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

  const restore = (entry: TrashEntry) => api.restore(entry.id).then(load, onError)

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
            onBlur={saveInterval}
            onKeyDown={e => e.key === 'Enter' && saveInterval()}
          />
        </label>

        <label>
          <input type="checkbox" checked={settings.newFirst} onChange={e => save({ newFirst: e.target.checked })} />
          Show newly added photos first
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

        <h3>Trash {trash && `(${trash.length})`}</h3>
        <p className="hint">Deleted photos and folders are kept for 30 days, then removed for good.</p>
        {trash?.length === 0 && <p>Empty.</p>}

        <ul>
          {trash?.map(entry => (
            <li key={entry.id}>
              <span>
                {entry.kind === 'folder' ? `Folder "${entry.path}" (${entry.count} photos)` : entry.path}
                <small> · deleted {day(entry.deletedAt)}</small>
              </span>
              <button onClick={() => restore(entry)}>Restore</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
