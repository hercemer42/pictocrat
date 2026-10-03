import express from 'express'
import path from 'node:path'
import {
  type Db, nextImage, getImage, updateImage, setDirHidden, hiddenImages, trashEntries, getSettings, saveSettings,
} from './db.ts'
import { scan } from './scan.ts'
import { RestoreConflict, moveToTrash, restoreFromTrash } from './trash.ts'

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
    const image = nextImage(db, getSettings(db))
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

    await moveToTrash(db, root, 'photo', image.path)
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

    res.json({ deleted: await moveToTrash(db, root, 'folder', dir) })
  })

  app.get('/api/hidden', (_req, res) => {
    res.json(hiddenImages(db))
  })

  app.get('/api/trash', (_req, res) => {
    res.json(trashEntries(db))
  })

  app.post('/api/trash/:id/restore', async (req, res) => {
    try {
      const restored = await restoreFromTrash(db, root, Number(req.params.id))
      restored === null ? res.status(404).end() : res.json({ restored })
    } catch (error) {
      if (!(error instanceof RestoreConflict)) throw error
      res.status(409).json({ error: error.message })
    }
  })

  app.post('/api/scan', async (_req, res) => {
    res.json(await scan(db, root))
  })

  app.get('/api/settings', (_req, res) => {
    res.json(getSettings(db))
  })

  // takes any subset of the settings
  app.put('/api/settings', (req, res) => {
    const { interval, newFirst } = req.body ?? {}

    if (interval !== undefined && (!Number.isInteger(interval) || interval < 1)) {
      res.status(400).json({ error: 'interval must be a whole number of seconds, at least 1' })
      return
    }

    if (newFirst !== undefined && typeof newFirst !== 'boolean') {
      res.status(400).json({ error: 'newFirst must be true or false' })
      return
    }

    res.json(saveSettings(db, { interval, newFirst }))
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
