import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, Mail, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../AuthContext'

export const Route = createFileRoute('/login/')({
  component: Login,
})

function Login() {
  const { apiFetch } = useAuth()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [devLink, setDevLink] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setLoading(true)
    setError('')
    setMessage('')
    setDevLink('')

    try {
      const data = await apiFetch('/api/auth/send-link', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })

      setMessage(
        'Magic link requested! In a real production environment, you would check your inbox. For development, see the banner below or the server logs.',
      )
      if (data.devMagicLink) {
        setDevLink(data.devMagicLink)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to request magic link'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        minHeight: 'calc(100vh - 73px)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        className="glass-card animate-fade-scale"
        style={{ width: '100%', maxWidth: 420, padding: 40 }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div
            style={{
              display: 'inline-flex',
              padding: 12,
              borderRadius: 12,
              background: 'var(--accent-light)',
              color: 'var(--accent)',
              marginBottom: 16,
            }}
          >
            <Sparkles size={28} />
          </div>
          <h2 style={{ fontSize: '1.75rem', marginBottom: 8 }}>Welcome back</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Enter your email to receive a passwordless magic link
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: 12,
              borderRadius: 8,
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: '#fca5a5',
              fontSize: '0.875rem',
              marginBottom: 20,
            }}
          >
            {error}
          </div>
        )}

        {message && (
          <div
            style={{
              padding: 12,
              borderRadius: 8,
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              color: '#a7f3d0',
              fontSize: '0.875rem',
              marginBottom: 20,
            }}
          >
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="email-input" className="form-label">
              Email address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail
                size={18}
                style={{
                  position: 'absolute',
                  left: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                id="email-input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="input-text"
                style={{ paddingLeft: 44 }}
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', height: 46 }}
          >
            {loading ? (
              <span className="spinner" style={{ width: 18, height: 18, borderWidth: '2px' }} />
            ) : (
              <>
                <span>Send Magic Link</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {devLink && (
          <div className="dev-banner">
            <strong>🔧 Developer Mode:</strong>
            <p>We caught the magic link payload directly from the worker:</p>
            <a href={devLink} style={{ wordBreak: 'break-all' }}>
              Click here to verify and auto-login
            </a>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Link
            to="/"
            style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textDecoration: 'underline' }}
          >
            Back to homepage
          </Link>
        </div>
      </div>
    </div>
  )
}
