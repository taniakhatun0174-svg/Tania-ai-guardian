import { useState } from 'react'

type Props = { english: boolean }

type DashboardData = {
  metrics: {
    activeUsers: number
    dailyUsers: number
    totalUsers: number
    ratingCount: number
    averageRating: number
  }
  feedback: {
    id: number
    rating: number | null
    feedback_text: string | null
    created_at: string
  }[]
}

export default function FounderDashboard({ english }: Props) {
  const [opened, setOpened] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [data, setData] = useState<DashboardData | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const loadDashboard = async () => {
    const response = await fetch('/api/founder/dashboard', {
      credentials: 'same-origin'
    })
    const result = await response.json()
    if (!response.ok || !result.ok) {
      throw new Error(result.error || 'Dashboard তথ্য পাওয়া যায়নি।')
    }
    setData(result as DashboardData)
    setLoggedIn(true)
  }

  const openDashboard = async () => {
    setOpened(true)
    setError('')
    setBusy(true)
    try {
      const response = await fetch('/api/founder/me', {
        credentials: 'same-origin'
      })
      if (response.ok) await loadDashboard()
      else setLoggedIn(false)
    } catch {
      setError('সার্ভারের সঙ্গে সংযোগ করা যাচ্ছে না।')
    } finally {
      setBusy(false)
    }
  }

  const login = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/founder/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const result = await response.json()
      if (!response.ok || !result.ok) {
        throw new Error(result.error || 'Login সফল হয়নি।')
      }
      setPassword('')
      await loadDashboard()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login করা যায়নি।')
    } finally {
      setBusy(false)
    }
  }

  const logout = async () => {
    setBusy(true)
    try {
      await fetch('/api/founder/logout', {
        method: 'POST',
        credentials: 'same-origin'
      })
    } finally {
      setLoggedIn(false)
      setData(null)
      setPassword('')
      setBusy(false)
    }
  }

  const labels = english
    ? ['Active Users', 'Daily Users', 'Total Users', 'Ratings', 'Average Rating']
    : ['সক্রিয় ব্যবহারকারী', 'আজকের ব্যবহারকারী', 'মোট ব্যবহারকারী', 'মোট রেটিং', 'গড় রেটিং']

  const values = data ? [
    data.metrics.activeUsers,
    data.metrics.dailyUsers,
    data.metrics.totalUsers,
    data.metrics.ratingCount,
    `${data.metrics.averageRating} / 5`
  ] : []

  return (
    <>
      <button className="founder-open-btn" onClick={openDashboard}>
        {english ? 'Founder Login' : 'Founder Login'}
      </button>

      {opened && (
        <div className="founder-backdrop" onClick={() => setOpened(false)}>
          <section
            className="founder-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Founder Dashboard"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="founder-close"
              onClick={() => setOpened(false)}
              aria-label="Close"
            >×</button>

            <span className="founder-kicker">PRIVATE ACCESS · TANIA</span>
            <h2>TANIA AI GUARDIAN</h2>
            <h3>{english ? 'Founder Dashboard' : 'Founder Dashboard'}</h3>

            {busy && <p className="founder-message">লোড হচ্ছে...</p>}
            {error && <p className="founder-error">{error}</p>}

            {!loggedIn && !busy && (
              <form className="founder-login" onSubmit={login}>
                <label>
                  {english ? 'Founder Email' : 'Founder Email'}
                  <input
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </label>
                <label>
                  {english ? 'Password' : 'Password'}
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                </label>
                <button type="submit" disabled={busy}>
                  {english ? 'Secure Login' : 'নিরাপদে Login করুন'}
                </button>
              </form>
            )}

            {loggedIn && data && (
              <>
                <div className="founder-metrics">
                  {labels.map((label, index) => (
                    <article className="founder-metric" key={label}>
                      <span>{label}</span>
                      <strong>{values[index]}</strong>
                    </article>
                  ))}
                </div>

                <h3>{english ? 'Private User Feedback' : 'ব্যবহারকারীদের ব্যক্তিগত মতামত'}</h3>
                <div className="founder-feedback-list">
                  {data.feedback.length === 0 && (
                    <p>{english ? 'No feedback yet.' : 'এখনো কোনো মতামত জমা হয়নি।'}</p>
                  )}
                  {data.feedback.map((item) => (
                    <article className="founder-feedback" key={item.id}>
                      {item.rating !== null && <strong>★ {item.rating}/5</strong>}
                      {item.feedback_text && <p>{item.feedback_text}</p>}
                      <small>{new Date(item.created_at).toLocaleString(english ? 'en-US' : 'bn-BD')}</small>
                    </article>
                  ))}
                </div>

                <button className="founder-logout" onClick={logout} disabled={busy}>
                  {english ? 'Logout' : 'Logout'}
                </button>
              </>
            )}

            <p className="founder-private-note">
              {english
                ? 'Private founder area. User data is not shown publicly.'
                : 'শুধু Founder-এর জন্য। এই তথ্য সাধারণ ব্যবহারকারীদের দেখানো হয় না।'}
            </p>
          </section>
        </div>
      )}
    </>
  )
}
