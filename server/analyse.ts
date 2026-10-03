import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import sharp from 'sharp'
import { exifCamera } from './exif.ts'

export type Analysis = {
  hash: string               // SHA-1 of the whole file: equal hashes are identical files
  width: number | null       // null when the file can't be decoded
  height: number | null
  brightness: number | null  // mean grey level, 0-255
  sharpness: number | null   // variance of the Laplacian on a small greyscale copy; low means blurry
  camera: number             // 1 if the EXIF names a camera; screenshots and downloads usually don't
}

// measured on a copy this wide, so the numbers compare across photos of any resolution
const SAMPLE_WIDTH = 512

/** Fingerprints a photo and measures what the junk finder looks at, from a single read of the file. */
export async function analyse(file: string): Promise<Analysis> {
  const data = await readFile(file)
  const hash = createHash('sha1').update(data).digest('hex')

  try {
    const image = sharp(data, { failOn: 'error' })
    const meta = await image.metadata()
    const { data: grey, info } = await image
      .resize({ width: SAMPLE_WIDTH, withoutEnlargement: true })
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true })

    return {
      hash,
      width: meta.width ?? null,
      height: meta.height ?? null,
      brightness: mean(grey),
      sharpness: laplacianVariance(grey, info.width, info.height),
      camera: exifCamera(meta.exif) ? 1 : 0,
    }
  } catch {
    return { hash, width: null, height: null, brightness: null, sharpness: null, camera: 0 }
  }
}

function mean(pixels: Buffer) {
  let sum = 0
  for (const p of pixels) sum += p
  return pixels.length ? sum / pixels.length : 0
}

/** How much the picture changes from pixel to pixel: edges give a high variance, blur flattens it. */
export function laplacianVariance(pixels: Buffer, width: number, height: number) {
  let sum = 0
  let sumSquares = 0
  let n = 0

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x
      const v = pixels[i - width] + pixels[i + width] + pixels[i - 1] + pixels[i + 1] - 4 * pixels[i]
      sum += v
      sumSquares += v * v
      n++
    }
  }

  return n ? sumSquares / n - (sum / n) ** 2 : 0
}
