import { readdir } from 'node:fs/promises'
import path from 'node:path'
import type { Db } from './db.ts'

// formats every browser can display; HEIC and RAW are skipped
const IMAGE_FILE = /\.(jpe?g|png|gif|webp|avif|bmp)$/i

/** Lists image paths relative to root, skipping dot-files and dot-directories (.Trash-1000 etc). */
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
 * Brings the database in line with the picture folder: adds new images, drops vanished ones.
 * A scan requested while one is running shares its result instead of racing it.
 */
export function scan(db: Db, root: string) {
  running ??= syncFolder(db, root).finally(() => { running = undefined })
  return running
}

async function syncFolder(db: Db, root: string) {
  // read the database before the folder: a photo deleted while the folder is being read then counts
  // as vanished (a harmless no-op delete) rather than new, which would resurrect it as a broken entry
  const known = new Set((db.prepare('SELECT path FROM images').all() as { path: string }[]).map(r => r.path))
  const onDisk = new Set(await listImages(root))

  const added = [...onDisk].filter(p => !known.has(p))
  const removed = [...known].filter(p => !onDisk.has(p))

  const insert = db.prepare('INSERT INTO images (path, dir) VALUES (?, ?)')
  const remove = db.prepare('DELETE FROM images WHERE path = ?')

  db.exec('BEGIN')
  try {
    for (const p of added) insert.run(p, path.posix.dirname(p).replace(/^\.$/, ''))
    for (const p of removed) remove.run(p)
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }

  return { added: added.length, removed: removed.length, total: onDisk.size }
}
