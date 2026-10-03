import { test } from 'node:test'
import assert from 'node:assert/strict'
import { prefetcher } from './prefetch.ts'

/** A fake fetch handing out 1, 2, 3... and counting how often it was called. */
function counter(fail = false) {
  let calls = 0
  const fetchNext = async () => {
    calls++
    if (fail && calls === 1) throw new Error('network down')
    return calls
  }
  return { fetchNext, calls: () => calls }
}

test('take hands over the prefetched photo without fetching again', async () => {
  const fake = counter()
  const p = prefetcher(fake.fetchNext)

  p.start()
  assert.equal(await p.take(), 1)
  assert.equal(fake.calls(), 1)
})

test('take fetches a fresh photo when nothing was prefetched', async () => {
  const fake = counter()
  const p = prefetcher(fake.fetchNext)

  p.start()
  await p.take()
  assert.equal(await p.take(), 2)
})

test('starting twice only fetches once', async () => {
  const fake = counter()
  const p = prefetcher(fake.fetchNext)

  p.start()
  p.start()
  await p.take()
  assert.equal(fake.calls(), 1)
})

test('a discarded prefetch is never shown', async () => {
  const fake = counter()
  const p = prefetcher(fake.fetchNext)

  p.start()
  p.discard()
  assert.equal(await p.take(), 2)
})

test('a failed prefetch surfaces on take, and the next take tries again', async () => {
  const fake = counter(true)
  const p = prefetcher(fake.fetchNext)

  p.start()
  await assert.rejects(p.take(), /network down/)
  assert.equal(await p.take(), 2)
})
