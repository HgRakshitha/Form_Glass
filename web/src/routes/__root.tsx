import { createRootRoute, Link, Outlet, useLocation, useNavigate } from '@tanstack/react-router'
import { LayoutDashboard, LogOut, Sparkles } from 'lucide-react'
import { useAuth } from '../AuthContext'

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const isPublicSurvey = location.pathname.startsWith('/s/')

  const handleLogout = () => {
    logout()
    navigate({ to: '/' })
  }

  if (isPublicSurvey) {
    return (
      <div className="public-survey-root">
        <Outlet />
      </div>
    )
  }

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="header-container">
          <Link to="/" className="brand-logo">
            <Sparkles size={20} style={{ color: 'var(--accent)' }} />
            <span>FormGlass</span>
          </Link>
          <nav className="header-nav">
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <Link
                  to="/"
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <LayoutDashboard size={14} />
                  <span>Dashboard</span>
                </Link>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {user.email}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="btn btn-danger btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <LogOut size={14} />
                  <span>Sign out</span>
                </button>
              </div>
            ) : (
              location.pathname !== '/login' && (
                <Link to="/login" className="btn btn-primary btn-sm">
                  Sign in
                </Link>
              )
            )}
          </nav>
        </div>
      </header>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
