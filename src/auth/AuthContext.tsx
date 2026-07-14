import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { apiClient, STORAGE_KEYS } from '../api/client'
import type { LoginResponse } from '../api/types'

export interface AuthUser {
  userId: string
  email: string
  username: string
  displayName: string
}

interface AuthContextValue {
  user: AuthUser | null
  signIn: (response: LoginResponse) => void
  signOut: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function readStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(STORAGE_KEYS.user)
  if (!raw || !localStorage.getItem(STORAGE_KEYS.token)) {
    return null
  }
  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(readStoredUser)

  const signIn = useCallback((response: LoginResponse) => {
    const nextUser: AuthUser = {
      userId: response.userId,
      email: response.email,
      username: response.username,
      displayName: response.displayName,
    }
    localStorage.setItem(STORAGE_KEYS.token, response.token)
    localStorage.setItem(STORAGE_KEYS.refreshToken, response.refreshToken)
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(nextUser))
    setUser(nextUser)
  }, [])

  const signOut = useCallback(() => {
    const refreshToken = localStorage.getItem(STORAGE_KEYS.refreshToken)
    if (refreshToken) {
      // Best-effort revocation; the local session ends regardless.
      void apiClient.post('/users/logout', { refreshToken }).catch(() => {})
    }
    localStorage.removeItem(STORAGE_KEYS.token)
    localStorage.removeItem(STORAGE_KEYS.refreshToken)
    localStorage.removeItem(STORAGE_KEYS.user)
    setUser(null)
  }, [])

  const value = useMemo(() => ({ user, signIn, signOut }), [user, signIn, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
