import { DatabaseSync } from 'node:sqlite'

export type Image = {
  id: number
  path: string    // relative to the picture root, e.g. "2015/Holiday/IMG_1.jpg"
  dir: string     // relative directory of the image, "" for the root
  hidden: number  // 0 | 1
  rotate: number  // quarter turns clockwise, 0-3
}

export type Settings = { interval: number }  // seconds between slides

const DEFAULT_SETTINGS: Settings = { interval: 10 }

const COLUMNS = 'id, path, dir, hidden, rotate'

export function openDb(file: string) {
  const db = new DatabaseSync(file)
  db.exec(`
    CREATE TABLE IF NOT EXISTS images (
      id INTEGER PRIMARY KEY,
      path TEXT UNIQUE NOT NULL,
      dir TEXT NOT NULL,
      shown INTEGER NOT NULL DEFAULT 0,
      hidden INTEGER NOT NULL DEFAULT 0,
      rotate INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  `)
  return db
}

export type Db = ReturnType<typeof openDb>

/** Matches a directory and everything below it. */
const IN_DIR = '(dir = ? OR substr(dir, 1, length(?) + 1) = ? || \'/\')'
const inDirArgs = (dir: string) => [dir, dir, dir]

/**
 * Picks a random visible image that hasn't been shown this round and marks it shown.
 * Once every visible image has been shown, a new round starts.
 */
export function nextImage(db: Db): Image | undefined {
  const pick = db.prepare(`SELECT ${COLUMNS} FROM images WHERE shown = 0 AND hidden = 0 ORDER BY random() LIMIT 1`)
  let image = pick.get() as Image | undefined

  if (!image) {
    db.exec('UPDATE images SET shown = 0')
    image = pick.get() as Image | undefined
  }

  if (image) {
    db.prepare('UPDATE images SET shown = 1 WHERE id = ?').run(image.id)
  }

  return image
}

export function getImage(db: Db, id: number) {
  return db.prepare(`SELECT ${COLUMNS} FROM images WHERE id = ?`).get(id) as Image | undefined
}

export function updateImage(db: Db, id: number, changes: { hidden?: boolean, rotate?: number }) {
  if (changes.hidden !== undefined) {
    db.prepare('UPDATE images SET hidden = ? WHERE id = ?').run(changes.hidden ? 1 : 0, id)
  }

  if (changes.rotate !== undefined) {
    db.prepare('UPDATE images SET rotate = ? WHERE id = ?').run(((changes.rotate % 4) + 4) % 4, id)
  }

  return getImage(db, id)
}

export function deleteImageRow(db: Db, id: number) {
  db.prepare('DELETE FROM images WHERE id = ?').run(id)
}

export function setDirHidden(db: Db, dir: string, hidden: boolean) {
  return Number(db.prepare(`UPDATE images SET hidden = ? WHERE ${IN_DIR}`).run(hidden ? 1 : 0, ...inDirArgs(dir)).changes)
}

export function deleteDirRows(db: Db, dir: string) {
  return Number(db.prepare(`DELETE FROM images WHERE ${IN_DIR}`).run(...inDirArgs(dir)).changes)
}

export function hiddenImages(db: Db) {
  return db.prepare(`SELECT ${COLUMNS} FROM images WHERE hidden = 1 ORDER BY path`).all() as Image[]
}

export function countImages(db: Db) {
  return (db.prepare('SELECT count(*) AS n FROM images').get() as { n: number }).n
}

export function getSettings(db: Db): Settings {
  const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string, value: string }[]
  return { ...DEFAULT_SETTINGS, ...Object.fromEntries(rows.map(r => [r.key, JSON.parse(r.value)])) }
}

export function saveSettings(db: Db, settings: Partial<Settings>) {
  const upsert = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')

  for (const [key, value] of Object.entries(settings)) {
    if (key in DEFAULT_SETTINGS) {
      upsert.run(key, JSON.stringify(value))
    }
  }

  return getSettings(db)
}
