import { useEffect, useState, type MouseEvent } from 'react'
import {
  api, JUNK_KINDS, type DuplicateFolder, type Image, type JunkKind, type Settings as SettingsValues, type TrashEntry,
} from './api'

type Props = {
  settings: SettingsValues
  onSettings: (settings: SettingsValues) => void
  onRescan: () => Promise<void>
  onReview: (kind: JunkKind) => void
  onError: (error: unknown) => void
  onClose: () => void
}

const JUNK_LABELS: Record<JunkKind, [string, string]> = {
  broken: ['Won\'t open', 'Files the browser can\'t display: empty, cut short or corrupt'],
  blurry: ['Blurry', 'Out of focus or shaken'],
  dark: ['Dark', 'Nearly black, like pocket shots'],
  tiny: ['Tiny', 'Under 0.3 megapixels: thumbnails, icons, web images'],
  screenshots: ['Screenshots', 'No camera in the metadata, and a PNG, screenshot name or phone-screen shape'],
}

const day = (ms: number) => new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })

/** A destructive button that needs a second tap within a few seconds. */
function ConfirmButton({ label, onConfirm }: { label: string, onConfirm: () => void }) {
  const [armed, setArmed] = useState(false)

  useEffect(() => {
    if (!armed) return
    const timer = setTimeout(() => setArmed(false), 4000)
    return () => clearTimeout(timer)
  }, [armed])

  const onClick = () => {
    if (!armed) return setArmed(true)
    setArmed(false)
    onConfirm()
  }

  return <button className="danger" onClick={onClick}>{armed ? 'Tap again to confirm' : label}</button>
}

export function Settings({ settings, onSettings, onRescan, onReview, onError, onClose }: Props) {
  const [hidden, setHidden] = useState<Image[] | null>(null)
  const [trash, setTrash] = useState<TrashEntry[] | null>(null)
  const [junk, setJunk] = useState<Record<JunkKind, number> | null>(null)
  const [duplicates, setDuplicates] = useState<{ extraCopies: number, folders: DuplicateFolder[] } | null>(null)
  const [input, setInput] = useState(String(settings.interval))
  const [scanning, setScanning] = useState(false)

  const load = () => {
    api.hidden().then(setHidden, onError)
    api.trash().then(setTrash, onError)
    api.junk().then(setJunk, onError)
    api.duplicates().then(setDuplicates, onError)
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
    load()
  }

  const unhide = (image: Image) => api.updateImage(image.id, { hidden: false }).then(load, onError)

  const unhideDir = (e: MouseEvent, dir: string) => {
    e.preventDefault()  // the button sits inside <summary>; don't toggle the group open
    api.setDirHidden(dir, false).then(load, onError)
  }

  const restore = (entry: TrashEntry) => api.restore(entry.id).then(load, onError)

  const trashCopies = (dir: string) => api.deleteDir(dir).then(load, onError)

  const groups = Map.groupBy(hidden ?? [], i => i.dir)
  const fullCopies = duplicates?.folders.filter(f => f.full) ?? []
  const partCopies = duplicates?.folders.filter(f => !f.full).slice(0, 10) ?? []

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

        <h3>Junk finder</h3>
        <p className="hint">Review suspects one by one: Keep, Hide or Delete each. Kept photos aren't suggested again.</p>
        <ul>
          {JUNK_KINDS.map(kind => (
            <li key={kind}>
              <span>{JUNK_LABELS[kind][0]} {junk && `(${junk[kind]})`}<small> · {JUNK_LABELS[kind][1]}</small></span>
              <button disabled={!junk?.[kind]} onClick={() => onReview(kind)}>Review</button>
            </li>
          ))}
        </ul>

        <h3>Duplicates</h3>
        {duplicates && (
          <p className="hint">
            {duplicates.extraCopies
              ? `${duplicates.extraCopies} photos have identical copies elsewhere. The slideshow shows each photo once.`
              : 'No duplicate photos.'}
          </p>
        )}
        {fullCopies.length > 0 && <p>These folders are entirely copies of photos kept elsewhere:</p>}
        <ul>
          {fullCopies.map(f => (
            <li key={f.dir}>
              <span>{f.dir} <small>({f.total} photos)</small></span>
              <ConfirmButton label="Move to trash" onConfirm={() => trashCopies(f.dir)} />
            </li>
          ))}
        </ul>
        {partCopies.length > 0 && <p className="hint">Partly copies:</p>}
        <ul>
          {partCopies.map(f => (
            <li key={f.dir}><span>{f.dir} <small>({f.duplicated} of {f.total} photos are copies)</small></span></li>
          ))}
        </ul>

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
