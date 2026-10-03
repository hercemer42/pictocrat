import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { analyse } from './analyse.ts'
import { picture } from './fixtures.ts'

async function analyseBytes(t: test.TestContext, bytes: Buffer | string, name = 'p.jpg') {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'pictocrat-analyse-'))
  t.after(() => rm(dir, { recursive: true, force: true }))
  await writeFile(path.join(dir, name), bytes)
  return analyse(path.join(dir, name))
}

test('a detailed photo scores far sharper than the same photo blurred', async (t) => {
  const sharp = await analyseBytes(t, await picture())
  const blurred = await analyseBytes(t, await picture({ blur: 8 }))

  assert.ok(sharp.sharpness! > 1000, `sharp: ${sharp.sharpness}`)
  assert.ok(blurred.sharpness! < 15, `blurred: ${blurred.sharpness}`)
})

test('brightness is the mean grey level', async (t) => {
  assert.ok((await analyseBytes(t, await picture({ fill: 'black' }))).brightness! < 5)
  const noise = (await analyseBytes(t, await picture())).brightness!
  assert.ok(noise > 100 && noise < 156, `noise: ${noise}`)
})

test('records the size, and whether the EXIF names a camera', async (t) => {
  const phone = await analyseBytes(t, await picture({ width: 600, height: 1300, camera: true }))
  const screenshot = await analyseBytes(t, await picture({ width: 600, height: 1300, format: 'png' }), 'shot.png')

  assert.deepEqual([phone.width, phone.height, phone.camera], [600, 1300, 1])
  assert.equal(screenshot.camera, 0)
})

test('identical files share a hash; a file that will not decode still gets one, with no measurements', async (t) => {
  const bytes = await picture({ seed: 7 })
  assert.equal((await analyseBytes(t, bytes)).hash, (await analyseBytes(t, Buffer.from(bytes))).hash)

  const broken = await analyseBytes(t, 'not an image')
  assert.equal(broken.hash, createHash('sha1').update('not an image').digest('hex'))
  assert.deepEqual([broken.width, broken.brightness, broken.sharpness], [null, null, null])
})
