import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { AlertCircle, ShieldCheck } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../AuthContext'

export const Route = createFileRoute('/login_/verify')({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      token: (search.token as string) || '',
    }
  },
  component: LoginVerify,
})

function LoginVerify() {
  const { token: searchToken } = Route.useSearch()
  const { login, apiFetch } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [status, setStatus] = useState('Verifying your magic link...')
  const verifyStarted = useRef(false)

  useEffect(() => {
    if (!searchToken) {
      setError('No verification token found in URL.')
      return
    }

    // React 18/19 StrictMode runs useEffect twice. Prevent dual calls.
    if (verifyStarted.current) return
    verifyStarted.current = true

    const verifyToken = async () => {
      try {
        const data = await apiFetch('/api/auth/verify', {
          method: 'POST',
          body: JSON.stringify({ token: searchToken }),
        })

        setStatus('Successfully verified! Redirecting to dashboard...')
        login(data.token, data.user)

        // Short delay to let the user see the success status before navigating
        setTimeout(() => {
          navigate({ to: '/' })
        }, 1000)
      } catch (err) {
        const errorMsg =
          err instanceof Error
            ? err.message
            : 'Verification failed. The link might be expired or invalid.'
        setError(errorMsg)
      }
    }

    verifyToken()
  }, [searchToken, login, navigate, apiFetch])

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
        style={{ width: '100%', maxWidth: 420, padding: 40, textAlign: 'center' }}
      >
        {error ? (
          <div>
            <div
              style={{
                display: 'inline-flex',
                padding: 12,
                borderRadius: 12,
                background: 'rgba(239, 68, 68, 0.1)',
                color: 'var(--error)',
                marginBottom: 16,
              }}
            >
              <AlertCircle size={32} />
            </div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: 12 }}>Verification Failed</h2>
            <p
              style={{
                color: 'var(--text-secondary)',
                fontSize: '0.9rem',
                marginBottom: 24,
                lineHeight: 1.5,
              }}
            >
              {error}
            </p>
            <Link to="/login" className="btn btn-primary" style={{ width: '100%' }}>
              Request new link
            </Link>
          </div>
        ) : (
          <div>
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
              <ShieldCheck
                size={32}
                className="spinner"
                style={{ animation: 'spin 2s linear infinite' }}
              />
            </div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: 12 }}>Securing Session</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{status}</p>
          </div>
        )}
      </div>
    </div>
  )
}
