import { test, type TestContext } from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import { mkdtemp, mkdir, writeFile, rm, access } from 'node:fs/promises'
import type { AddressInfo } from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { openDb } from './db.ts'
import { scan } from './scan.ts'
import { createApp } from './app.ts'
import { TRASH_DIR, purgeTrash } from './trash.ts'
import { jpegWithDate } from './fixtures.ts'

const DAY = 86_400_000

// ._a.jpg is a macOS AppleDouble sidecar: a .jpg name over non-image bytes, left behind by Mac copies
const FILES = ['a.jpg', '._a.jpg', 'b.PNG', 'notes.txt', 'Holiday/c.jpg', 'Holiday/Beach/d.jpeg', '.Trash-1000/e.jpg', 'Holidays2/f.jpg']
const IMAGES = ['Holiday/Beach/d.jpeg', 'Holiday/c.jpg', 'Holidays2/f.jpg', 'a.jpg', 'b.PNG']

async function setup(t: TestContext) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'pictocrat-'))

  for (const file of FILES) {
    await mkdir(path.dirname(path.join(root, file)), { recursive: true })
    await writeFile(path.join(root, file), 'x')
  }

  const db = openDb(':memory:')
  await scan(db, root)
  const server = createApp(db, root).listen(0)
  await once(server, 'listening')

  t.after(async () => {
    server.close()
    await rm(root, { recursive: true, force: true })
  })

  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  const api = (url: string, method = 'GET', body?: object) =>
    fetch(base + url, { method, headers: { 'content-type': 'application/json' }, body: body && JSON.stringify(body) })
  const next = async () => (await (await api('/api/next')).json()).path as string
  const exists = (file: string) => access(path.join(root, file)).then(() => true, () => false)

  return { root, db, base, api, next, exists }
}

test('scan picks up browser-displayable images only, skipping dot-files and dot-folders', async (t) => {
  const { api } = await setup(t)
  const seen = new Set<string>()

  for (let i = 0; i < 5; i++) {
    seen.add((await (await api('/api/next')).json()).path)
  }

  assert.deepEqual([...seen].sort(), IMAGES)
})

test('the slideshow shows every image once before repeating', async (t) => {
  const { next } = await setup(t)
  const round = [await next(), await next(), await next(), await next(), await next()]

  assert.equal(new Set(round).size, 5)
  assert.ok(IMAGES.includes(await next()), 'a new round starts once all are shown')
})

test('hidden images and folders are skipped; hiding a folder includes subfolders but not lookalike names', async (t) => {
  const { api, next } = await setup(t)
  const a = await (await api('/api/next')).json()

  await api(`/api/images/${a.id}`, 'PATCH', { hidden: true })
  assert.equal((await (await api('/api/dirs', 'PATCH', { dir: 'Holiday', hidden: true })).json()).changed, 2)

  const shown = new Set<string>()
  for (let i = 0; i < 8; i++) shown.add(await next())
  assert.deepEqual([...shown].sort(), IMAGES.filter(p => !p.startsWith('Holiday/') && p !== a.path))

  const hidden = await (await api('/api/hidden')).json()
  assert.ok(hidden.some((i: { path: string }) => i.path === 'Holiday/Beach/d.jpeg'))
})

test('rotation is stored as quarter turns, wrapping around', async (t) => {
  const { api } = await setup(t)
  const image = await (await api('/api/next')).json()

  assert.equal((await (await api(`/api/images/${image.id}`, 'PATCH', { rotate: -1 })).json()).rotate, 3)
  assert.equal((await (await api(`/api/images/${image.id}`, 'PATCH', { rotate: 5 })).json()).rotate, 1)
})

test('deleting a photo moves it to the trash and out of the slideshow; restoring brings it back as it was', async (t) => {
  const { api, next, exists } = await setup(t)
  const image = await (await api('/api/next')).json()
  await api(`/api/images/${image.id}`, 'PATCH', { rotate: 1 })

  assert.equal((await api(`/api/images/${image.id}`, 'DELETE')).status, 204)
  const [entry] = await (await api('/api/trash')).json()
  assert.deepEqual({ kind: entry.kind, path: entry.path, count: entry.count }, { kind: 'photo', path: image.path, count: 1 })
  assert.equal(await exists(image.path), false)
  assert.equal(await exists(`${TRASH_DIR}/${entry.id}/${image.path}`), true)
  assert.equal((await api(`/photos/${TRASH_DIR}/${entry.id}/${image.path}`)).status, 404)

  for (let i = 0; i < 8; i++) assert.notEqual(await next(), image.path)
  assert.equal((await api(`/api/images/${image.id}`, 'DELETE')).status, 404, 'a trashed photo cannot be deleted again')

  assert.deepEqual(await (await api(`/api/trash/${entry.id}/restore`, 'POST')).json(), { restored: 1 })
  assert.equal(await exists(image.path), true)
  assert.equal(await exists(`${TRASH_DIR}/${entry.id}`), false)
  assert.deepEqual(await (await api('/api/trash')).json(), [])
  assert.equal((await (await api(`/api/images/${image.id}`, 'PATCH', {})).json()).rotate, 1, 'keeps its rotation')
})

test('deleting a folder moves it to the trash; the root and paths outside it are refused', async (t) => {
  const { api, exists } = await setup(t)

  assert.equal((await (await api('/api/dirs?dir=Holiday', 'DELETE')).json()).deleted, 2)
  assert.equal(await exists('Holiday'), false)
  assert.equal(await exists('Holidays2/f.jpg'), true)

  for (const dir of ['', '.', '..', '../etc', 'Holiday/../..']) {
    assert.equal((await api(`/api/dirs?dir=${encodeURIComponent(dir)}`, 'DELETE')).status, 400, `refuses "${dir}"`)
  }
  assert.equal(await exists('a.jpg'), true)

  const [entry] = await (await api('/api/trash')).json()
  assert.deepEqual({ kind: entry.kind, path: entry.path, count: entry.count }, { kind: 'folder', path: 'Holiday', count: 2 })
  assert.deepEqual(await (await api(`/api/trash/${entry.id}/restore`, 'POST')).json(), { restored: 2 })
  assert.equal(await exists('Holiday/Beach/d.jpeg'), true)
})

test('restoring refuses to overwrite something that has come back since', async (t) => {
  const { root, api } = await setup(t)
  const image = await (await api('/api/next')).json()
  await api(`/api/images/${image.id}`, 'DELETE')
  await writeFile(path.join(root, image.path), 'a new file, same name')
  const [entry] = await (await api('/api/trash')).json()

  assert.equal((await api(`/api/trash/${entry.id}/restore`, 'POST')).status, 409)
  assert.equal((await (await api('/api/trash')).json()).length, 1, 'still in the trash')
  assert.equal((await api('/api/trash/999/restore', 'POST')).status, 404)
})

test('a rescan leaves trashed photos alone, and the trash empties itself after 30 days', async (t) => {
  const { root, db, api, exists } = await setup(t)
  const image = await (await api('/api/next')).json()
  await api(`/api/images/${image.id}`, 'DELETE')
  const [entry] = await (await api('/api/trash')).json()

  assert.deepEqual(await (await api('/api/scan', 'POST')).json(), { added: 0, removed: 0, total: 4 })
  assert.equal(await purgeTrash(db, root, 30, Date.now() + 29 * DAY), 0)
  assert.equal((await (await api('/api/trash')).json()).length, 1)

  assert.equal(await purgeTrash(db, root, 30, Date.now() + 31 * DAY), 1)
  assert.equal(await exists(`${TRASH_DIR}/${entry.id}`), false)
  assert.deepEqual(await (await api('/api/trash')).json(), [])
  assert.equal((await api(`/api/trash/${entry.id}/restore`, 'POST')).status, 404)
})

test('with "new photos first" on, photos added after the first import play before the random order', async (t) => {
  const { root, db, api, next } = await setup(t)
  const freshCount = () => (db.prepare('SELECT count(*) AS n FROM images WHERE fresh = 1').get() as { n: number }).n

  assert.equal(freshCount(), 0, 'the first import is not "new"')
  await writeFile(path.join(root, 'new1.jpg'), 'x')
  await writeFile(path.join(root, 'new2.jpg'), 'x')
  await api('/api/scan', 'POST')
  assert.equal(freshCount(), 2)

  assert.equal((await (await api('/api/settings', 'PUT', { newFirst: true })).json()).newFirst, true)
  assert.deepEqual([await next(), await next()].sort(), ['new1.jpg', 'new2.jpg'])
  assert.equal(freshCount(), 0, 'shown photos stop being new')
  assert.ok(IMAGES.includes(await next()))
})

test('each photo carries when it was taken: EXIF first, then a date in its path', async (t) => {
  const { root, api } = await setup(t)
  const files: Record<string, Buffer | string> = {
    'exif.jpg': jpegWithDate('2014:08:15 13:22:01'),
    'iCloud/2018/05/09/IMG_2614.JPG': 'x',
    '2011/party.jpg': 'x',
    'Sireaus_07/IMG_2014.JPG': 'x',
  }

  for (const [file, content] of Object.entries(files)) {
    await mkdir(path.dirname(path.join(root, file)), { recursive: true })
    await writeFile(path.join(root, file), content)
  }
  await api('/api/scan', 'POST')

  const taken: Record<string, string | null> = {}
  for (let i = 0; i < 9; i++) {
    const image = await (await api('/api/next')).json()
    taken[image.path] = image.taken
  }

  assert.equal(taken['exif.jpg'], '2014-08-15T13:22:01')
  assert.equal(taken['iCloud/2018/05/09/IMG_2614.JPG'], '2018-05-09')
  assert.equal(taken['2011/party.jpg'], '2011')
  assert.equal(taken['Sireaus_07/IMG_2014.JPG'], null)
})

test('an existing database from before the trash and dates gains the new columns', async (t) => {
  const file = path.join(await mkdtemp(path.join(os.tmpdir(), 'pictocrat-db-')), 'old.db')
  t.after(() => rm(path.dirname(file), { recursive: true, force: true }))
  const { DatabaseSync } = await import('node:sqlite')
  const old = new DatabaseSync(file)
  old.exec(`CREATE TABLE images (id INTEGER PRIMARY KEY, path TEXT UNIQUE NOT NULL, dir TEXT NOT NULL,
    shown INTEGER NOT NULL DEFAULT 0, hidden INTEGER NOT NULL DEFAULT 0, rotate INTEGER NOT NULL DEFAULT 0);
    INSERT INTO images (path, dir, hidden, rotate) VALUES ('a.jpg', '', 1, 2);`)
  old.close()

  const db = openDb(file)
  const row = db.prepare('SELECT path, hidden, rotate, fresh, taken, trash_id FROM images').get()
  assert.deepEqual({ ...row }, { path: 'a.jpg', hidden: 1, rotate: 2, fresh: 0, taken: null, trash_id: null })
})

test('rescan adds new files and drops vanished ones', async (t) => {
  const { root, api } = await setup(t)
  await writeFile(path.join(root, 'new.jpg'), 'x')
  await rm(path.join(root, 'a.jpg'))

  assert.deepEqual(await (await api('/api/scan', 'POST')).json(), { added: 1, removed: 1, total: 5 })
})

test('unknown or malformed image ids are 404s, not errors', async (t) => {
  const { api } = await setup(t)

  for (const id of ['999', 'abc', '1.5', '-1']) {
    assert.equal((await api(`/api/images/${id}`, 'PATCH', { hidden: true })).status, 404, `PATCH ${id}`)
    assert.equal((await api(`/api/images/${id}`, 'DELETE')).status, 404, `DELETE ${id}`)
  }
})

test('malformed JSON is a 400, not a server error', async (t) => {
  const { base } = await setup(t)
  const res = await fetch(`${base}/api/settings`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: '{oops' })

  assert.equal(res.status, 400)
})

test('photos are served by their escaped path; dot-files are not', async (t) => {
  const { root, api } = await setup(t)
  await mkdir(path.join(root, 'Île de Ré'))
  await writeFile(path.join(root, 'Île de Ré', '#1 50% off?.jpg'), 'x')
  await api('/api/scan', 'POST')

  // the same per-segment escaping the web client's photoUrl() uses
  const url = '/photos/' + 'Île de Ré/#1 50% off?.jpg'.split('/').map(encodeURIComponent).join('/')
  assert.equal((await api(url)).status, 200)
  assert.equal((await api('/photos/._a.jpg')).status, 404)
  assert.equal((await api('/photos/.Trash-1000/e.jpg')).status, 404)
})

test('folders can be unhidden; the top-level folder cannot be hidden', async (t) => {
  const { api, next } = await setup(t)

  await api('/api/dirs', 'PATCH', { dir: 'Holiday', hidden: true })
  assert.equal((await (await api('/api/dirs', 'PATCH', { dir: 'Holiday', hidden: false })).json()).changed, 2)
  assert.equal((await api('/api/hidden').then(r => r.json())).length, 0)

  for (const dir of ['', '.', '../x']) {
    assert.equal((await api('/api/dirs', 'PATCH', { dir, hidden: true })).status, 400, `refuses "${dir}"`)
  }
  assert.ok(IMAGES.includes(await next()))
})

test('next has nothing to show when every image is hidden', async (t) => {
  const { api } = await setup(t)

  for (const dir of ['Holiday', 'Holidays2']) await api('/api/dirs', 'PATCH', { dir, hidden: true })
  for (let i = 0; i < 2; i++) {
    const image = await (await api('/api/next')).json()
    await api(`/api/images/${image.id}`, 'PATCH', { hidden: true })
  }

  assert.equal((await api('/api/next')).status, 204)
})

test('scans requested while one is running share its result instead of racing it', async (t) => {
  const { root, db } = await setup(t)
  await writeFile(path.join(root, 'new.jpg'), 'x')

  // without the guard, both would insert new.jpg and the second would fail on the UNIQUE path
  const [first, second] = await Promise.all([scan(db, root), scan(db, root)])
  assert.deepEqual(first, { added: 1, removed: 0, total: 6 })
  assert.equal(second, first)
})

test('settings default to 10s with "new photos first" off, save in parts, and reject nonsense', async (t) => {
  const { api } = await setup(t)

  assert.deepEqual(await (await api('/api/settings')).json(), { interval: 10, newFirst: false })
  assert.deepEqual(await (await api('/api/settings', 'PUT', { interval: 5 })).json(), { interval: 5, newFirst: false })
  assert.deepEqual(await (await api('/api/settings', 'PUT', { newFirst: true })).json(), { interval: 5, newFirst: true })
  assert.equal((await api('/api/settings', 'PUT', { interval: 0 })).status, 400)
  assert.equal((await api('/api/settings', 'PUT', { newFirst: 'yes' })).status, 400)
})
