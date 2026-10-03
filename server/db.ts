import { DatabaseSync } from 'node:sqlite'

export type Image = {
  id: number
  path: string          // relative to the picture root, e.g. "2015/Holiday/IMG_1.jpg"
  dir: string           // relative directory of the image, "" for the root
  hidden: number        // 0 | 1
  rotate: number        // quarter turns clockwise, 0-3
  taken: string | null  // when it was taken, as much as is known: "2014-08-15T13:22:01", "2014-08-15" or "2014"
}

export type Settings = {
  interval: number      // seconds between slides
  newFirst: boolean     // show newly added photos before the random order resumes
}

export type TrashEntry = { id: number, kind: 'photo' | 'folder', path: string, deletedAt: number, count: number }

const DEFAULT_SETTINGS: Settings = { interval: 10, newFirst: false }

const COLUMNS = 'id, path, dir, hidden, rotate, nullif(taken, \'\') AS taken'

/** Rows whose file is in the picture folder rather than the trash. */
const LIVE = 'trash_id IS NULL'

export function openDb(file: string) {
  const db = new DatabaseSync(file)
  db.exec(`
    CREATE TABLE IF NOT EXISTS images (
      id INTEGER PRIMARY KEY,
      path TEXT UNIQUE NOT NULL,             -- where the file is now, inside the trash folder while trashed
      dir TEXT NOT NULL,
      shown INTEGER NOT NULL DEFAULT 0,
      hidden INTEGER NOT NULL DEFAULT 0,
      rotate INTEGER NOT NULL DEFAULT 0,
      fresh INTEGER NOT NULL DEFAULT 0,      -- added by a scan after the first import, not shown yet
      taken TEXT,                            -- NULL until read, '' when unknown
      trash_id INTEGER,                      -- set while the file is in the trash
      hash TEXT,                             -- SHA-1 of the file, NULL until analysed (see analyse.ts)
      width INTEGER,                         -- NULL once analysed means the file couldn't be decoded
      height INTEGER,
      brightness REAL,
      sharpness REAL,
      camera INTEGER,
      keep INTEGER NOT NULL DEFAULT 0        -- kept in a junk review: don't suggest it again
    );
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS trash (
      id INTEGER PRIMARY KEY,
      kind TEXT NOT NULL,                    -- 'photo' | 'folder'
      path TEXT NOT NULL,                    -- where it was, relative to the picture root
      deleted_at INTEGER NOT NULL            -- ms since epoch
    );
  `)

  // databases created before these columns existed
  const columns = new Set((db.prepare('PRAGMA table_info(images)').all() as { name: string }[]).map(c => c.name))
  const added = [
    ['fresh', 'INTEGER NOT NULL DEFAULT 0'], ['taken', 'TEXT'], ['trash_id', 'INTEGER'], ['hash', 'TEXT'],
    ['width', 'INTEGER'], ['height', 'INTEGER'], ['brightness', 'REAL'], ['sharpness', 'REAL'], ['camera', 'INTEGER'],
    ['keep', 'INTEGER NOT NULL DEFAULT 0'],
  ]
  for (const [name, type] of added) {
    if (!columns.has(name)) db.exec(`ALTER TABLE images ADD COLUMN ${name} ${type}`)
  }

  db.exec('CREATE INDEX IF NOT EXISTS images_hash ON images (hash)')
  return db
}

export type Db = ReturnType<typeof openDb>

/** Matches a directory and everything below it. */
const IN_DIR = '(dir = ? OR substr(dir, 1, length(?) + 1) = ? || \'/\')'
const inDirArgs = (dir: string) => [dir, dir, dir]

/** Identical files are one photo: only the first visible copy of each plays. */
const FIRST_COPY = `(hash IS NULL OR width IS NULL OR id = (SELECT min(c.id) FROM images c
  WHERE c.hash = images.hash AND c.hidden = 0 AND c.trash_id IS NULL))`

/**
 * Picks the next image and marks it shown: the oldest new arrival if `newFirst` is on and there is one,
 * otherwise a random visible image not yet shown this round. Once all have been shown, a new round starts.
 */
export function nextImage(db: Db, { newFirst = false } = {}): Image | undefined {
  const visible = `hidden = 0 AND ${LIVE} AND ${FIRST_COPY}`
  const pick = db.prepare(`SELECT ${COLUMNS} FROM images WHERE shown = 0 AND ${visible} ORDER BY random() LIMIT 1`)
  let image = newFirst
    ? db.prepare(`SELECT ${COLUMNS} FROM images WHERE fresh = 1 AND ${visible} ORDER BY id LIMIT 1`).get() as Image | undefined
    : undefined

  image ??= pick.get() as Image | undefined

  if (!image) {
    db.exec('UPDATE images SET shown = 0')
    image = pick.get() as Image | undefined
  }

  if (image) {
    db.prepare('UPDATE images SET shown = 1, fresh = 0 WHERE id = ?').run(image.id)
  }

  return image
}

export function getImage(db: Db, id: number) {
  return db.prepare(`SELECT ${COLUMNS} FROM images WHERE id = ? AND ${LIVE}`).get(id) as Image | undefined
}

/** The live copies of a photo, itself included: other files with identical contents. */
export function copiesOf(db: Db, id: number) {
  return db.prepare(`SELECT ${COLUMNS} FROM images WHERE ${LIVE} AND (id = ? OR (width IS NOT NULL AND hash =
    (SELECT hash FROM images WHERE id = ? AND width IS NOT NULL))) ORDER BY id`).all(id, id) as Image[]
}

/** Hiding, rotating or keeping a photo applies to all its copies, so another copy doesn't stand in for it. */
export function updateImage(db: Db, id: number, changes: { hidden?: boolean, rotate?: number, keep?: boolean }) {
  const ids = copiesOf(db, id).map(i => i.id)
  const set = (column: string, value: number) => {
    for (const copy of ids) db.prepare(`UPDATE images SET ${column} = ? WHERE id = ?`).run(value, copy)
  }

  if (changes.hidden !== undefined) set('hidden', changes.hidden ? 1 : 0)
  if (changes.rotate !== undefined) set('rotate', ((changes.rotate % 4) + 4) % 4)
  if (changes.keep !== undefined) set('keep', changes.keep ? 1 : 0)

  return getImage(db, id)
}

// --- junk finder: thresholds over the measurements from analyse.ts ---

export const JUNK = {
  broken: 'hash IS NOT NULL AND width IS NULL',
  blurry: 'sharpness < 30',  // checked by eye on the 15,000-photo library: obvious blur still scored 20-27
  dark: 'brightness < 20',
  tiny: 'width * height < 300000',
  screenshots: `camera = 0 AND width IS NOT NULL AND (lower(path) LIKE '%screenshot%' OR lower(path) LIKE '%.png'
    OR max(width, height) >= 1.9 * min(width, height))`,
} as const

export type JunkKind = keyof typeof JUNK

const suspects = (kind: JunkKind) => `keep = 0 AND hidden = 0 AND ${LIVE} AND (${JUNK[kind]})`

export function junkCounts(db: Db) {
  return Object.fromEntries(Object.keys(JUNK).map(kind =>
    [kind, (db.prepare(`SELECT count(*) AS n FROM images WHERE ${suspects(kind as JunkKind)}`).get() as { n: number }).n],
  )) as Record<JunkKind, number>
}

/** The next suspect to review after `afterId`, in a stable order so the page can fetch one ahead. */
export function nextSuspect(db: Db, kind: JunkKind, afterId = 0) {
  return db.prepare(`SELECT ${COLUMNS} FROM images WHERE ${suspects(kind)} AND id > ? ORDER BY id LIMIT 1`).get(afterId) as Image | undefined
}

// --- duplicates ---

export type DuplicateFolder = { dir: string, total: number, duplicated: number, full: boolean }

const isIn = (dir: string, folder: string) => dir === folder || dir.startsWith(folder + '/')

/**
 * Folders holding photos that also exist elsewhere. `full` folders are entirely copies of photos kept
 * outside them, so moving one to the trash loses no photo. Nested full folders are reported once, at the top.
 */
export function duplicateFolders(db: Db) {
  const rows = db.prepare(`SELECT id, dir, hash FROM images WHERE ${LIVE} AND width IS NOT NULL`).all() as { id: number, dir: string, hash: string }[]
  const byHash = Map.groupBy(rows, r => r.hash)
  const extraCopies = [...byHash.values()].reduce((n, group) => n + group.length - 1, 0)

  const folders = new Set<string>()
  for (const { dir } of rows) {
    const parts = dir.split('/')
    for (let i = 1; i <= parts.length; i++) if (parts[0]) folders.add(parts.slice(0, i).join('/'))
  }

  const report: DuplicateFolder[] = []
  for (const folder of folders) {
    const inside = rows.filter(r => isIn(r.dir, folder))
    const duplicated = inside.filter(r => byHash.get(r.hash)!.some(other => !isIn(other.dir, folder))).length
    if (duplicated) report.push({ dir: folder, total: inside.length, duplicated, full: duplicated === inside.length })
  }

  const fullFolders = report.filter(f => f.full).map(f => f.dir)
  const shown = report.filter(f => !fullFolders.some(parent => parent !== f.dir && isIn(f.dir, parent)))
  shown.sort((a, b) => Number(b.full) - Number(a.full) || b.duplicated - a.duplicated)

  return { extraCopies, folders: shown.slice(0, 50) }
}

export function setDirHidden(db: Db, dir: string, hidden: boolean) {
  return Number(db.prepare(`UPDATE images SET hidden = ? WHERE ${LIVE} AND ${IN_DIR}`).run(hidden ? 1 : 0, ...inDirArgs(dir)).changes)
}

export function saveAnalysis(db: Db, id: number, a: { hash: string, width: number | null, height: number | null,
  brightness: number | null, sharpness: number | null, camera: number }) {
  db.prepare('UPDATE images SET hash = ?, width = ?, height = ?, brightness = ?, sharpness = ?, camera = ? WHERE id = ?')
    .run(a.hash, a.width, a.height, a.brightness, a.sharpness, a.camera, id)
}

export function hiddenImages(db: Db) {
  return db.prepare(`SELECT ${COLUMNS} FROM images WHERE hidden = 1 AND ${LIVE} ORDER BY path`).all() as Image[]
}

export function countImages(db: Db) {
  return (db.prepare('SELECT count(*) AS n FROM images').get() as { n: number }).n
}

// --- trash: the files move on disk (see trash.ts); these keep the rows in step ---

export function addTrashEntry(db: Db, kind: TrashEntry['kind'], path: string, deletedAt: number) {
  return Number(db.prepare('INSERT INTO trash (kind, path, deleted_at) VALUES (?, ?, ?)').run(kind, path, deletedAt).lastInsertRowid)
}

/** Points the rows of a trashed photo or folder at their new home, `prefix/<old path>`. */
export function markTrashed(db: Db, trashId: number, kind: TrashEntry['kind'], path: string, prefix: string) {
  const where = kind === 'photo' ? 'path = ?' : IN_DIR
  const args = kind === 'photo' ? [path] : inDirArgs(path)
  return Number(db.prepare(`UPDATE images SET trash_id = ?, path = ? || '/' || path WHERE ${LIVE} AND ${where}`)
    .run(trashId, prefix, ...args).changes)
}

/** Points restored rows back at their original paths and drops the trash entry. */
export function unmarkTrashed(db: Db, trashId: number, prefix: string) {
  db.prepare('UPDATE images SET trash_id = NULL, path = substr(path, length(?) + 2) WHERE trash_id = ?').run(prefix, trashId)
  db.prepare('DELETE FROM trash WHERE id = ?').run(trashId)
}

/** Forgets a trash entry and its rows (after purging its files, or when there was nothing to move). */
export function forgetTrash(db: Db, trashId: number) {
  db.prepare('DELETE FROM images WHERE trash_id = ?').run(trashId)
  db.prepare('DELETE FROM trash WHERE id = ?').run(trashId)
}

const TRASH_COLUMNS = 't.id, t.kind, t.path, t.deleted_at AS deletedAt, count(i.id) AS count'

export function trashEntries(db: Db, deletedBefore = Infinity) {
  return db.prepare(`SELECT ${TRASH_COLUMNS} FROM trash t LEFT JOIN images i ON i.trash_id = t.id
    WHERE t.deleted_at < ? GROUP BY t.id ORDER BY t.deleted_at DESC`).all(deletedBefore) as TrashEntry[]
}

export function getTrashEntry(db: Db, id: number) {
  return db.prepare(`SELECT ${TRASH_COLUMNS} FROM trash t LEFT JOIN images i ON i.trash_id = t.id
    WHERE t.id = ? GROUP BY t.id`).get(id) as TrashEntry | undefined
}

// --- settings ---

export function getSettings(db: Db): Settings {
  const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string, value: string }[]
  return { ...DEFAULT_SETTINGS, ...Object.fromEntries(rows.map(r => [r.key, JSON.parse(r.value)])) }
}

export function saveSettings(db: Db, settings: Partial<Settings>) {
  const upsert = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')

  for (const [key, value] of Object.entries(settings)) {
    if (key in DEFAULT_SETTINGS && value !== undefined) {
      upsert.run(key, JSON.stringify(value))
    }
  }

  return getSettings(db)
}
