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

test('deleting an image removes the file and the entry', async (t) => {
  const { api, exists } = await setup(t)
  const image = await (await api('/api/next')).json()

  assert.equal((await api(`/api/images/${image.id}`, 'DELETE')).status, 204)
  assert.equal(await exists(image.path), false)
  assert.equal((await api(`/api/images/${image.id}`, 'DELETE')).status, 404)
})

test('deleting a folder removes it from disk; the root and paths outside it are refused', async (t) => {
  const { api, exists } = await setup(t)

  assert.equal((await (await api('/api/dirs?dir=Holiday', 'DELETE')).json()).deleted, 2)
  assert.equal(await exists('Holiday'), false)
  assert.equal(await exists('Holidays2/f.jpg'), true)

  for (const dir of ['', '.', '..', '../etc', 'Holiday/../..']) {
    assert.equal((await api(`/api/dirs?dir=${encodeURIComponent(dir)}`, 'DELETE')).status, 400, `refuses "${dir}"`)
  }
  assert.equal(await exists('a.jpg'), true)
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

test('settings default to a 10s interval and reject nonsense', async (t) => {
  const { api } = await setup(t)

  assert.deepEqual(await (await api('/api/settings')).json(), { interval: 10 })
  assert.deepEqual(await (await api('/api/settings', 'PUT', { interval: 5 })).json(), { interval: 5 })
  assert.equal((await api('/api/settings', 'PUT', { interval: 0 })).status, 400)
})
