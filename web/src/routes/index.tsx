import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/')({ component: LandingPage })

function LandingPage() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = code.trim().toLowerCase()
    if (trimmed) navigate({ to: '/$code', params: { code: trimmed } })
  }

  return (
    <main className="landing">
      <div className="landing-card">
        <div className="brand">
          <span className="brand-icon">⇄</span>
          <h1>TabBridge</h1>
        </div>
        <p className="subtitle">Enter a share code to view someone's open tabs</p>
        <form onSubmit={handleSubmit} className="code-form">
          <input
            type="text"
            className="code-input"
            value={code}
            onChange={e => setCode(e.target.value)}
            placeholder="word-word-word-word"
            autoFocus
            autoComplete="off"
            spellCheck={false}
          />
          <button type="submit" className="go-btn" disabled={!code.trim()}>
            View Tabs
          </button>
        </form>
      </div>
    </main>
  )
}
