import { readdir } from 'node:fs/promises'
import path from 'node:path'
import type { Db } from './db.ts'
import { dateFromPath, readTakenDate } from './exif.ts'

// formats every browser can display; HEIC and RAW are skipped
const IMAGE_FILE = /\.(jpe?g|png|gif|webp|avif|bmp)$/i

const DATE_BATCH = 500

/** Lists image paths relative to root, skipping dot-files and dot-directories (.Trash-1000, the trash etc). */
export async function listImages(root: string) {
  const entries = await readdir(root, { recursive: true, withFileTypes: true })

  return entries
    .filter(e => e.isFile() && IMAGE_FILE.test(e.name))
    .map(e => path.relative(root, path.join(e.parentPath, e.name)))
    .filter(p => !p.split(path.sep).some(part => part.startsWith('.')))
    .map(p => p.split(path.sep).join('/'))
}

let running: ReturnType<typeof syncFolder> | undefined

/**
 * Brings the database in line with the picture folder: adds new images, drops vanished ones, then
 * reads when the new ones were taken. A scan requested while one is running shares its result.
 */
export function scan(db: Db, root: string) {
  running ??= syncFolder(db, root).finally(() => { running = undefined })
  return running
}

async function syncFolder(db: Db, root: string) {
  // read the database before the folder: a photo deleted while the folder is being read then counts
  // as vanished (a harmless no-op delete) rather than new, which would resurrect it as a broken entry.
  // Trashed rows are left alone: their files are meant to be missing from the picture folder.
  const known = new Set((db.prepare('SELECT path FROM images WHERE trash_id IS NULL').all() as { path: string }[]).map(r => r.path))
  const firstImport = (db.prepare('SELECT count(*) AS n FROM images').get() as { n: number }).n === 0
  const onDisk = new Set(await listImages(root))

  const added = [...onDisk].filter(p => !known.has(p))
  const removed = [...known].filter(p => !onDisk.has(p))

  // OR IGNORE: a photo restored from the trash mid-scan is already back in the table
  const insert = db.prepare('INSERT OR IGNORE INTO images (path, dir, fresh) VALUES (?, ?, ?)')
  const remove = db.prepare('DELETE FROM images WHERE path = ? AND trash_id IS NULL')

  transaction(db, () => {
    for (const p of added) insert.run(p, path.posix.dirname(p).replace(/^\.$/, ''), firstImport ? 0 : 1)
    for (const p of removed) remove.run(p)
  })

  await fillDates(db, root)

  return { added: added.length, removed: removed.length, total: onDisk.size }
}

/** Records when each photo was taken: its EXIF date, else a date in its path, else '' (unknown). */
async function fillDates(db: Db, root: string) {
  const pending = db.prepare('SELECT id, path FROM images WHERE taken IS NULL AND trash_id IS NULL').all() as { id: number, path: string }[]
  const update = db.prepare('UPDATE images SET taken = ? WHERE id = ?')

  for (let i = 0; i < pending.length; i += DATE_BATCH) {
    const batch = pending.slice(i, i + DATE_BATCH)
    const dates = []

    for (const row of batch) {
      const exif = /\.jpe?g$/i.test(row.path) ? await readTakenDate(path.join(root, row.path)).catch(() => null) : null
      dates.push(exif ?? dateFromPath(row.path) ?? '')
    }

    transaction(db, () => batch.forEach((row, j) => update.run(dates[j], row.id)))
  }
}

function transaction(db: Db, fn: () => void) {
  db.exec('BEGIN')

  try {
    fn()
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}
