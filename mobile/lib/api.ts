const WORKER_URL = 'https://tabsync-worker.rsarans186.workers.dev'

export interface TabData {
  id: number
  windowId: number
  title: string
  url: string
  favIconUrl: string
  active: boolean
  pinned: boolean
}

export interface Session {
  tabs: TabData[]
  updated_at: number
}

export async function fetchSession(code: string): Promise<Session | null> {
  const res = await fetch(`${WORKER_URL}/sessions/${code}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Worker error: ${res.status}`)
  return res.json()
}
