import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dateFromPath, exifDate } from './exif.ts'
import { jpegWithDate } from './fixtures.ts'

test('reads DateTimeOriginal from the EXIF sub-directory, in either byte order', () => {
  assert.equal(exifDate(jpegWithDate('2014:08:15 13:22:01')), '2014-08-15T13:22:01')
  assert.equal(exifDate(jpegWithDate('2014:08:15 13:22:01', { littleEndian: false })), '2014-08-15T13:22:01')
})

test('falls back to DateTime in the first directory', () => {
  assert.equal(exifDate(jpegWithDate('2009:12:24 18:00:00', { inIfd0: true })), '2009-12-24T18:00:00')
})

test('ignores the zero date written by cameras with an unset clock', () => {
  assert.equal(exifDate(jpegWithDate('0000:00:00 00:00:00')), null)
})

test('anything that is not a readable JPEG with EXIF gives null rather than throwing', () => {
  const good = jpegWithDate('2014:08:15 13:22:01')

  assert.equal(exifDate(Buffer.from('not a jpeg')), null)
  assert.equal(exifDate(Buffer.from([0xff, 0xd8, 0xff, 0xda, 0, 2])), null)  // JPEG without EXIF
  assert.equal(exifDate(good.subarray(0, 30)), null)                        // truncated mid-EXIF
  assert.equal(exifDate(Buffer.alloc(0)), null)
})

test('dates in paths: full dates anywhere, years only in folder names', () => {
  assert.equal(dateFromPath('iCloud/2018/05/09/IMG_2614.JPG'), '2018-05-09')
  assert.equal(dateFromPath('2014-01-09-Phone/IMG_1.jpg'), '2014-01-09')
  assert.equal(dateFromPath('Camera/IMG_20190704_101500.jpg'), '2019-07-04')
  assert.equal(dateFromPath('Photos île de Ré 2018/Photos MEHDI/ile-de-re-1.jpg'), '2018')
  assert.equal(dateFromPath('Sireaus_07/IMG_2014.JPG'), null)  // a file counter, not a year
  assert.equal(dateFromPath('Emilie/scan.jpg'), null)
})
