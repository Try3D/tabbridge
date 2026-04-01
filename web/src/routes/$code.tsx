import { createFileRoute, Link } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
import { fetchSession, type TabData } from '../lib/api'

export const Route = createFileRoute('/$code')({
  component: SessionPage,
  notFoundComponent: () => (
    <main className="landing">
      <div className="landing-card">
        <p className="not-found-title">Session not found</p>
        <p className="not-found-sub">This code has expired or doesn't exist.</p>
        <Link to="/" className="back-link">← Enter a new code</Link>
      </div>
    </main>
  ),
})

const POLL_INTERVAL = 30_000

function SessionPage() {
  const { code } = Route.useParams()
  const [tabs, setTabs] = useState<TabData[]>([])
  const [updatedAt, setUpdatedAt] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const session = await fetchSession(code)
      if (!session) {
        setNotFound(true)
      } else {
        setTabs(session.tabs)
        setUpdatedAt(session.updated_at)
        setNotFound(false)
      }
    } finally {
      setLoading(false)
    }
  }, [code])

  useEffect(() => {
    load()
    const id = setInterval(load, POLL_INTERVAL)
    const onVisible = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [load])

  if (notFound) {
    return (
      <main className="landing">
        <div className="landing-card">
          <p className="not-found-title">Session not found</p>
          <p className="not-found-sub">This code has expired or doesn't exist.</p>
          <Link to="/" className="back-link">← Enter a new code</Link>
        </div>
      </main>
    )
  }

  const windows: Record<number, TabData[]> = {}
  for (const tab of tabs) {
    if (!windows[tab.windowId]) windows[tab.windowId] = []
    windows[tab.windowId].push(tab)
  }
  const windowGroups = Object.entries(windows)
  const multiWindow = windowGroups.length > 1

  return (
    <main className="session-page">
      <header className="session-header">
        <div className="session-header-left">
          <Link to="/" className="brand-link">
            <span className="brand-icon">⇄</span>
            <span className="brand-name">TabBridge</span>
          </Link>
          <span className="session-code">{code}</span>
        </div>
        <div className="session-header-right">
          {updatedAt && (
            <span className="updated-at">
              Updated {new Date(updatedAt * 1000).toLocaleTimeString()}
            </span>
          )}
          <button onClick={load} disabled={loading} className="refresh-btn">
            {loading ? '…' : 'Refresh'}
          </button>
        </div>
      </header>

      <div className="tab-list-wrap">
        {loading && tabs.length === 0 ? (
          <p className="loading-text">Loading…</p>
        ) : (
          windowGroups.map(([windowId, windowTabs], i) => (
            <section key={windowId} className="window-group">
              {multiWindow && (
                <p className="window-label">Window {i + 1}</p>
              )}
              <ul className="tab-list">
                {windowTabs.map(tab => (
                  <li key={`${tab.windowId}-${tab.id}`} className="tab-item">
                    <TabFavicon url={tab.favIconUrl} />
                    <div className="tab-info">
                      <p className="tab-title">{tab.title || '(untitled)'}</p>
                      <p className="tab-url">{hostname(tab.url)}</p>
                    </div>
                    {tab.active && <span className="tab-active-dot" />}
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>

      <p className="tab-count">{tabs.length} tab{tabs.length !== 1 ? 's' : ''}</p>
    </main>
  )
}

function TabFavicon({ url }: { url: string }) {
  const [failed, setFailed] = useState(false)
  if (!url || failed) return <div className="tab-favicon-placeholder" />
  return <img src={url} className="tab-favicon" alt="" onError={() => setFailed(true)} />
}

function hostname(url: string) {
  try { return new URL(url).hostname } catch { return url }
}
