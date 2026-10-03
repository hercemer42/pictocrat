import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { Image } from './api.ts'
import { EMPTY_SHOW, append, back, drop, forward, replace, type Show } from './history.ts'

const image = (id: number, dir = ''): Image => ({ id, path: `${dir ? dir + '/' : ''}${id}.jpg`, dir, hidden: 0, rotate: 0 })
const showOf = (history: Image[], pos: number): Show => ({ history, pos })
const ids = (show: Show) => show.history.map(i => i.id)

test('append shows the new photo and forgets the oldest beyond the limit', () => {
  let show = EMPTY_SHOW
  for (let id = 1; id <= 4; id++) show = append(show, image(id), 3)

  assert.deepEqual(ids(show), [2, 3, 4])
  assert.equal(show.pos, 2)
})

test('forward and back move one step and stop at the ends', () => {
  const show = showOf([image(1), image(2)], 0)

  assert.equal(back(show), show)
  assert.equal(forward(show).pos, 1)
  assert.equal(forward(forward(show)).pos, 1)
})

test('dropping the current photo moves on to the one that followed it', () => {
  const { show, needsNext } = drop(showOf([image(1), image(2), image(3)], 1), i => i.id === 2)

  assert.deepEqual(ids(show), [1, 3])
  assert.equal(show.history[show.pos].id, 3)
  assert.equal(needsNext, false)
})

test('dropping the last photo in the history asks for a new one', () => {
  const { show, needsNext } = drop(showOf([image(1), image(2)], 1), i => i.id === 2)

  assert.deepEqual(ids(show), [1])
  assert.equal(needsNext, true)
  assert.deepEqual(ids(append(show, image(9))), [1, 9])
})

test('dropping a folder also removes its earlier photos, keeping the position on the right photo', () => {
  const history = [image(1, 'Holiday'), image(2), image(3, 'Holiday/Beach'), image(4, 'Holidays2'), image(5)]
  const { show } = drop(showOf(history, 2), i => i.dir === 'Holiday' || i.dir.startsWith('Holiday/'))

  assert.deepEqual(ids(show), [2, 4, 5])
  assert.equal(show.history[show.pos].id, 4)
})

test('a rotated photo is updated wherever it appears in the history', () => {
  const show = replace(showOf([image(1), image(2), image(1)], 2), { ...image(1), rotate: 1 })

  assert.deepEqual(show.history.map(i => i.rotate), [1, 0, 1])
})
