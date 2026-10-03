import { test } from 'node:test'
import assert from 'node:assert/strict'
import { inDir, photoUrl, type Image } from './api.ts'

const image = (path: string): Image => ({ id: 1, path, dir: path.split('/').slice(0, -1).join('/'), hidden: 0, rotate: 0 })

test('photoUrl escapes each path segment but keeps the slashes', () => {
  assert.equal(
    photoUrl(image('Île de Ré/#1 50% off?.jpg')),
    '/photos/%C3%8Ele%20de%20R%C3%A9/%231%2050%25%20off%3F.jpg',
  )
})

test('inDir matches a folder and its subfolders, not folders that merely start with the same name', () => {
  assert.equal(inDir(image('Holiday/a.jpg'), 'Holiday'), true)
  assert.equal(inDir(image('Holiday/Beach/a.jpg'), 'Holiday'), true)
  assert.equal(inDir(image('Holidays2/a.jpg'), 'Holiday'), false)
  assert.equal(inDir(image('a.jpg'), 'Holiday'), false)
})
