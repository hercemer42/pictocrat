import express from 'express'
import { rm, unlink } from 'node:fs/promises'
import path from 'node:path'
import {
  type Db, nextImage, getImage, updateImage, deleteImageRow, setDirHidden, deleteDirRows,
  hiddenImages, getSettings, saveSettings,
} from './db.ts'
import { scan } from './scan.ts'

export function createApp(db: Db, root: string, webDir?: string) {
  const app = express()
  app.use(express.json())

  /** Normalises a folder path from the client; null unless it's a real subfolder of the picture root. */
  const subfolder = (dir: unknown) => {
    if (typeof dir !== 'string' || !dir) {
      return null
    }

    const abs = path.resolve(root, dir)
    return abs.startsWith(path.resolve(root) + path.sep) ? path.relative(root, abs).split(path.sep).join('/') : null
  }

  const badFolder = { error: 'That folder is not inside the picture folder (the picture folder itself cannot be hidden or deleted)' }

  app.get('/api/next', (_req, res) => {
    const image = nextImage(db)
    image ? res.json(image) : res.status(204).end()
  })

  app.patch('/api/images/:id', (req, res) => {
    const { hidden, rotate } = req.body ?? {}
    const image = updateImage(db, Number(req.params.id), {
      hidden: typeof hidden === 'boolean' ? hidden : undefined,
      rotate: Number.isInteger(rotate) ? rotate : undefined,
    })
    image ? res.json(image) : res.status(404).end()
  })

  app.delete('/api/images/:id', async (req, res) => {
    const image = getImage(db, Number(req.params.id))

    if (!image) {
      res.status(404).end()
      return
    }

    await unlink(path.join(root, image.path)).catch(error => {
      if (error.code !== 'ENOENT') throw error
    })
    deleteImageRow(db, image.id)
    res.status(204).end()
  })

  app.patch('/api/dirs', (req, res) => {
    const dir = subfolder(req.body?.dir)

    if (dir === null || typeof req.body.hidden !== 'boolean') {
      res.status(400).json(badFolder)
      return
    }

    res.json({ changed: setDirHidden(db, dir, req.body.hidden) })
  })

  app.delete('/api/dirs', async (req, res) => {
    const dir = subfolder(req.query.dir)

    if (dir === null) {
      res.status(400).json(badFolder)
      return
    }

    await rm(path.join(root, dir), { recursive: true, force: true })
    res.json({ deleted: deleteDirRows(db, dir) })
  })

  app.get('/api/hidden', (_req, res) => {
    res.json(hiddenImages(db))
  })

  app.post('/api/scan', async (_req, res) => {
    res.json(await scan(db, root))
  })

  app.get('/api/settings', (_req, res) => {
    res.json(getSettings(db))
  })

  app.put('/api/settings', (req, res) => {
    const { interval } = req.body ?? {}

    if (!Number.isInteger(interval) || interval < 1) {
      res.status(400).json({ error: 'interval must be a whole number of seconds, at least 1' })
      return
    }

    res.json(saveSettings(db, { interval }))
  })

  app.use('/photos', express.static(root, { dotfiles: 'ignore', index: false, maxAge: '7d' }))

  if (webDir) {
    app.use(express.static(webDir))
  }

  // errors raised by express itself (malformed JSON etc) carry their own 4xx status
  app.use((error: Error & { status?: number }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const status = error.status ?? 500
    if (status >= 500) console.error(error)
    res.status(status).json({ error: error.message })
  })

  return app
}
