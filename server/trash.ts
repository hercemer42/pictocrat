import { access, mkdir, rename, rm } from 'node:fs/promises'
import path from 'node:path'
import {
  type Db, type TrashEntry, addTrashEntry, forgetTrash, getTrashEntry, markTrashed, trashEntries, unmarkTrashed,
} from './db.ts'

/** Lives inside the picture folder, so moves are instant renames; scans skip it like any dot-folder. */
export const TRASH_DIR = '.pictocrat-trash'

export const KEEP_DAYS = 30

const prefixFor = (id: number) => `${TRASH_DIR}/${id}`

export class RestoreConflict extends Error {}

/** Moves a photo or folder (relative to root) into the trash; returns how many photos went with it. */
export async function moveToTrash(db: Db, root: string, kind: TrashEntry['kind'], relPath: string, now = Date.now()) {
  const id = addTrashEntry(db, kind, relPath, now)
  const dest = path.join(root, prefixFor(id), relPath)

  try {
    await mkdir(path.dirname(dest), { recursive: true })
    await rename(path.join(root, relPath), dest)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      forgetTrash(db, id)
      throw error
    }

    // already gone from disk: nothing to keep, just forget the rows
    const count = markTrashed(db, id, kind, relPath, prefixFor(id))
    forgetTrash(db, id)
    return count
  }

  return markTrashed(db, id, kind, relPath, prefixFor(id))
}

/** Moves a trash entry back where it came from; null if there's no such entry. */
export async function restoreFromTrash(db: Db, root: string, id: number) {
  const entry = getTrashEntry(db, id)

  if (!entry) {
    return null
  }

  const dest = path.join(root, entry.path)

  if (await access(dest).then(() => true, () => false)) {
    throw new RestoreConflict(`Something called "${entry.path}" is back in the picture folder; move it away to restore this.`)
  }

  await mkdir(path.dirname(dest), { recursive: true })
  await rename(path.join(root, prefixFor(id), entry.path), dest)
  unmarkTrashed(db, id, prefixFor(id))
  await rm(path.join(root, prefixFor(id)), { recursive: true, force: true })

  return entry.count
}

/** Permanently deletes whatever has been in the trash longer than `keepDays`. */
export async function purgeTrash(db: Db, root: string, keepDays = KEEP_DAYS, now = Date.now()) {
  const expired = trashEntries(db, now - keepDays * 86_400_000)

  for (const entry of expired) {
    await rm(path.join(root, prefixFor(entry.id)), { recursive: true, force: true })
    forgetTrash(db, entry.id)
  }

  return expired.length
}
