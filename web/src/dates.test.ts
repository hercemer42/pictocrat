import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatTaken } from './dates.ts'

test('shows as much of the date as is known, in the given locale', () => {
  assert.equal(formatTaken('2014-08-15T13:22:01', 'en-GB'), '15 August 2014')
  assert.equal(formatTaken('2014-08-15', 'en-GB'), '15 August 2014')
  assert.equal(formatTaken('2014-08', 'en-GB'), 'August 2014')
  assert.equal(formatTaken('2014', 'en-GB'), '2014')
  assert.equal(formatTaken('2014-08-15', 'fr-FR'), '15 août 2014')
})
