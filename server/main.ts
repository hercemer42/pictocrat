import path from 'node:path'
import { openDb } from './db.ts'
import { scan } from './scan.ts'
import { purgeTrash } from './trash.ts'
import { createApp } from './app.ts'

const root = process.env.PICTURES ?? '/pictures'
const port = Number(process.env.PORT ?? 8095)
const rescanMinutes = Number(process.env.RESCAN_MINUTES ?? 30)
const db = openDb(process.env.DB ?? '/data/pictocrat.db')

/** Rescans the picture folder and empties trash older than 30 days. */
const housekeeping = async () => {
  try {
    const r = await scan(db, root)
    const purged = await purgeTrash(db, root)
    console.log(`scan: ${r.added} added, ${r.removed} removed, ${r.total} images; ${purged} trash entries purged`)
  } catch (error) {
    console.error('housekeeping failed:', error)
  }
}

createApp(db, root, path.join(import.meta.dirname, '../web/dist'))
  .listen(port, () => console.log(`pictocrat listening on :${port}, pictures in ${root}`))

housekeeping()
setInterval(housekeeping, rescanMinutes * 60_000)
