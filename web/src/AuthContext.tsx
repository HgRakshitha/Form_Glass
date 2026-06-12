import type React from 'react'
import { createContext, useContext, useEffect, useState } from 'react'

interface User {
  id: string
  email: string
}

interface AuthContextType {
  token: string | null
  user: User | null
  loading: boolean
  login: (token: string, user: User) => void
  logout: () => void
  // biome-ignore lint/suspicious/noExplicitAny: generic default any is required to support flexible fetch results
  apiFetch: <T = any>(path: string, options?: RequestInit) => Promise<T>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // biome-ignore lint/correctness/useExhaustiveDependencies: initial load only
  useEffect(() => {
    const storedToken = localStorage.getItem('sb_session_token')
    const storedUser = localStorage.getItem('sb_session_user')

    if (storedToken && storedUser) {
      setToken(storedToken)
      try {
        setUser(JSON.parse(storedUser))
      } catch {
        setUser(null)
      }

      // Verify token with backend
      fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${storedToken}`,
        },
      })
        .then((res) => {
          if (res.status === 401) {
            handleLogout()
          } else {
            return res.json()
          }
        })
        .then((data) => {
          if (data?.user) {
            setUser({ id: data.user.userId, email: data.user.email })
          }
        })
        .catch((err) => {
          console.error('Failed to verify session:', err)
        })
        .finally(() => {
          setLoading(false)
        })
    } else {
      setLoading(false)
    }
  }, [])

  const handleLogin = (newToken: string, newUser: User) => {
    setToken(newToken)
    setUser(newUser)
    localStorage.setItem('sb_session_token', newToken)
    localStorage.setItem('sb_session_user', JSON.stringify(newUser))
  }

  const handleLogout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('sb_session_token')
    localStorage.removeItem('sb_session_user')
  }

  // biome-ignore lint/suspicious/noExplicitAny: generic default any is required to support flexible fetch results
  const apiFetch = async <T = any>(path: string, options: RequestInit = {}): Promise<T> => {
    const headers = new Headers(options.headers || {})
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }

    // Auto-detect JSON payload and set header
    if (options.body && typeof options.body === 'string' && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }

    const response = await fetch(path, { ...options, headers })

    if (response.status === 401) {
      handleLogout()
      throw new Error('Session expired. Please sign in again.')
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
    }

    return response.json() as Promise<T>
  }

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        loading,
        login: handleLogin,
        logout: handleLogout,
        apiFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
