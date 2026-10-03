export type Image = {
  id: number
  path: string    // relative to the picture folder
  dir: string     // "" for the picture folder itself
  hidden: number
  rotate: number         // quarter turns clockwise
  taken: string | null   // "2014-08-15T13:22:01", "2014-08-15" or "2014", as much as is known
}

export type Settings = {
  interval: number       // seconds per photo
  newFirst: boolean      // newly added photos play before the random order resumes
}

export const JUNK_KINDS = ['broken', 'blurry', 'dark', 'tiny', 'screenshots'] as const
export type JunkKind = typeof JUNK_KINDS[number]

export type DuplicateFolder = { dir: string, total: number, duplicated: number, full: boolean }

export type TrashEntry = { id: number, kind: 'photo' | 'folder', path: string, deletedAt: number, count: number }

async function call<T>(url: string, method = 'GET', body?: object): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body && JSON.stringify(body),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => null)
    throw new Error(error?.error ?? `${method} ${url} failed (${res.status})`)
  }

  return res.status === 204 ? (undefined as T) : res.json()
}

export const api = {
  next: () => call<Image | undefined>('/api/next'),
  nextSuspect: (kind: JunkKind, afterId: number) => call<Image | undefined>(`/api/next?review=${kind}&after=${afterId}`),
  junk: () => call<Record<JunkKind, number>>('/api/junk'),
  duplicates: () => call<{ extraCopies: number, folders: DuplicateFolder[] }>('/api/duplicates'),
  updateImage: (id: number, changes: { hidden?: boolean, rotate?: number, keep?: boolean }) => call<Image>(`/api/images/${id}`, 'PATCH', changes),
  deleteImage: (id: number) => call<{ deleted: number }>(`/api/images/${id}`, 'DELETE'),  // the photo and all its copies
  setDirHidden: (dir: string, hidden: boolean) => call<{ changed: number }>('/api/dirs', 'PATCH', { dir, hidden }),
  deleteDir: (dir: string) => call<{ deleted: number }>(`/api/dirs?dir=${encodeURIComponent(dir)}`, 'DELETE'),
  hidden: () => call<Image[]>('/api/hidden'),
  trash: () => call<TrashEntry[]>('/api/trash'),
  restore: (id: number) => call<{ restored: number }>(`/api/trash/${id}/restore`, 'POST'),
  scan: () => call<{ added: number, removed: number, total: number }>('/api/scan', 'POST'),
  settings: () => call<Settings>('/api/settings'),
  saveSettings: (settings: Partial<Settings>) => call<Settings>('/api/settings', 'PUT', settings),
}

export const photoUrl = (image: Image) => '/photos/' + image.path.split('/').map(encodeURIComponent).join('/')

export const inDir = (image: Image, dir: string) => image.dir === dir || image.dir.startsWith(dir + '/')
