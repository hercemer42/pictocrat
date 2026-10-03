import { open } from 'node:fs/promises'

// EXIF sits in the first few KB of a JPEG; 64KB covers it with room for an embedded thumbnail
const HEAD_BYTES = 64 * 1024

/** When a JPEG was taken, from its EXIF (DateTimeOriginal, else DateTime), as "YYYY-MM-DDTHH:MM:SS"; null if absent. */
export async function readTakenDate(file: string) {
  const handle = await open(file, 'r')

  try {
    const { buffer, bytesRead } = await handle.read(Buffer.alloc(HEAD_BYTES), 0, HEAD_BYTES, 0)
    return exifDate(buffer.subarray(0, bytesRead))
  } finally {
    await handle.close()
  }
}

export function exifDate(jpeg: Buffer): string | null {
  try {
    if (jpeg.readUInt16BE(0) !== 0xffd8) return null
    let offset = 2

    while (offset + 4 <= jpeg.length && jpeg[offset] === 0xff) {
      const marker = jpeg[offset + 1]
      const size = jpeg.readUInt16BE(offset + 2)

      if (marker === 0xe1 && jpeg.toString('latin1', offset + 4, offset + 10) === 'Exif\0\0') {
        return tiffDate(jpeg.subarray(offset + 10, offset + 2 + size))
      }

      if (marker === 0xda) return null  // image data starts: there's no EXIF
      offset += 2 + size
    }

    return null
  } catch {
    return null  // truncated or malformed: reads ran past the buffer
  }
}

/** Whether an EXIF block (as sharp returns it, "Exif\0\0" + TIFF) names the camera's make or model. */
export function exifCamera(exif: Buffer | undefined) {
  if (!exif || exif.toString('latin1', 0, 6) !== 'Exif\0\0') return false

  try {
    const { ifd0, ascii } = readTiff(exif.subarray(6))
    return [ifd0.get(0x010f), ifd0.get(0x0110)].some(entry => entry !== undefined && ascii(entry) !== '')
  } catch {
    return false
  }
}

function tiffDate(tiff: Buffer) {
  const { ifd0, exifIfd, ascii } = readTiff(tiff)

  const raw = [exifIfd.get(0x9003), ifd0.get(0x0132)]
    .filter(entry => entry !== undefined)
    .map(entry => ascii(entry))
    .find(value => /^(19|20)\d{2}:\d{2}:\d{2}/.test(value))  // cameras with an unset clock write 0000:00:00

  if (!raw) return null
  const [date, time] = raw.split(' ')
  return date.replaceAll(':', '-') + (time ? `T${time}` : '')
}

/** The first image directory and the EXIF sub-directory of a TIFF block, as tag -> entry offset maps. */
function readTiff(tiff: Buffer) {
  const little = tiff.toString('latin1', 0, 2) === 'II'
  const u16 = (o: number) => little ? tiff.readUInt16LE(o) : tiff.readUInt16BE(o)
  const u32 = (o: number) => little ? tiff.readUInt32LE(o) : tiff.readUInt32BE(o)

  /** tag -> offset of its 12-byte entry in the directory at `ifd` */
  const entries = (ifd: number) => {
    const tags = new Map<number, number>()
    const count = u16(ifd)
    for (let i = 0; i < count; i++) tags.set(u16(ifd + 2 + i * 12), ifd + 2 + i * 12)
    return tags
  }

  // an ASCII value longer than 4 bytes is stored elsewhere, at the offset held in the entry
  const ascii = (entry: number) => {
    const length = u32(entry + 4)
    const start = length > 4 ? u32(entry + 8) : entry + 8
    return tiff.toString('latin1', start, start + length).replace(/\0[\s\S]*$/, '').trim()
  }

  const ifd0 = entries(u32(4))
  const exifPointer = ifd0.get(0x8769)
  const exifIfd = exifPointer === undefined ? new Map<number, number>() : entries(u32(exifPointer + 8))

  return { ifd0, exifIfd, ascii }
}

/**
 * A date written into the path: a full date anywhere ("iCloud/2018/05/09/…", "2014-01-09-Phone/…",
 * "IMG_20190704_…"), else a year in a folder name ("Photos île de Ré 2018/…"). Years in file names are
 * skipped, since "IMG_2014.JPG" is a counter, not a year.
 */
export function dateFromPath(relPath: string) {
  const full = relPath.match(/(?:^|\D)((?:19|20)\d{2})[-/_.]?(0[1-9]|1[0-2])[-/_.]?(0[1-9]|[12]\d|3[01])(?!\d)/)
  if (full) return `${full[1]}-${full[2]}-${full[3]}`

  const folders = relPath.split('/').slice(0, -1).join('/')
  const year = folders.match(/(?:^|\D)((?:19|20)\d{2})(?!\d)/)
  return year ? year[1] : null
}
