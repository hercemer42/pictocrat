import sharp from 'sharp'

type PictureOptions = {
  width?: number
  height?: number
  fill?: 'noise' | 'black'  // noise is full of edges (sharp); black is flat
  blur?: number             // gaussian sigma: smears the edges away
  format?: 'jpeg' | 'png'
  camera?: boolean          // write EXIF naming a camera, as phones and cameras do
  seed?: number             // same seed and options, same bytes
}

/** A real image file, for the analysis that decodes pictures. */
export async function picture({ width = 800, height = 600, fill = 'noise', blur, format = 'jpeg', camera = false, seed = 1 }: PictureOptions = {}) {
  let state = seed >>> 0 || 1
  const pixels = Buffer.alloc(width * height, fill === 'black' ? 0 : 128)

  if (fill === 'noise') {
    for (let i = 0; i < pixels.length; i++) {
      state ^= state << 13; state ^= state >>> 17; state ^= state << 5  // xorshift32: deterministic noise
      pixels[i] = (state >>> 0) & 255
    }
  }

  let image = sharp(pixels, { raw: { width, height, channels: 1 } })
  if (blur) image = image.blur(blur)
  if (camera) image = image.withExif({ IFD0: { Make: 'Canon', Model: 'Canon EOS 5D' } })
  return format === 'png' ? image.png().toBuffer() : image.jpeg().toBuffer()
}

/**
 * A minimal JPEG whose EXIF carries `date` ("YYYY:MM:DD HH:MM:SS"): in DateTimeOriginal inside the EXIF
 * sub-directory (where cameras put it), or in IFD0's DateTime (`inIfd0`), little- or big-endian.
 */
export function jpegWithDate(date: string, { littleEndian = true, inIfd0 = false } = {}) {
  const tiff = Buffer.alloc(80)
  const u16 = (offset: number, value: number) => littleEndian ? tiff.writeUInt16LE(value, offset) : tiff.writeUInt16BE(value, offset)
  const u32 = (offset: number, value: number) => littleEndian ? tiff.writeUInt32LE(value, offset) : tiff.writeUInt32BE(value, offset)
  const entry = (at: number, tag: number, type: number, count: number, value: number) => {
    u16(at, tag); u16(at + 2, type); u32(at + 4, count); u32(at + 8, value)
  }

  tiff.write(littleEndian ? 'II' : 'MM', 0, 'latin1')
  u16(2, 42)
  u32(4, 8)                                          // IFD0 at 8

  if (inIfd0) {
    u16(8, 1); entry(10, 0x0132, 2, 20, 26)          // DateTime, ASCII, value at 26
    tiff.write(`${date}\0`, 26, 'latin1')
  } else {
    u16(8, 1); entry(10, 0x8769, 4, 1, 26)           // pointer to the EXIF sub-directory at 26
    u16(26, 1); entry(28, 0x9003, 2, 20, 44)         // DateTimeOriginal, ASCII, value at 44
    tiff.write(`${date}\0`, 44, 'latin1')
  }

  const app1 = Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), tiff])
  const header = Buffer.from([0xff, 0xd8, 0xff, 0xe1, 0, 0])
  header.writeUInt16BE(app1.length + 2, 4)
  return Buffer.concat([header, app1, Buffer.from([0xff, 0xda, 0x00, 0x02])])
}
