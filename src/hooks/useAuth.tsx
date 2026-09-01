import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { insforge } from '../lib/insforge'
import { AuthChangeEvent } from '@insforge/sdk'

interface User {
  id: string
  email: string
  name?: string
  avatar_url?: string
}

interface Profile {
  id: string
  user_id: string
  role: 'admin' | 'teacher' | 'student'
  name: string
  avatar_url?: string
  theme?: string
}

interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string, name: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

const SESSION_KEY = 'pulseclass_session'

function saveSessionToStorage(user: User, accessToken: string, refreshToken?: string) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ user, accessToken, refreshToken }))
}

function loadSessionFromStorage(): { user: User; accessToken: string; refreshToken?: string } | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed?.user?.id && parsed?.accessToken) {
      return { user: parsed.user, accessToken: parsed.accessToken, refreshToken: parsed.refreshToken }
    }
    return null
  } catch {
    return null
  }
}

function clearSessionStorage() {
  localStorage.removeItem(SESSION_KEY)
}

function getSdkRefreshToken(): string | undefined {
  try { return (insforge as any).http?.refreshToken || undefined } catch { return undefined }
}

function isAccessTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return Date.now() >= (payload.exp || 0) * 1000
  } catch {
    return true
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (userId: string) => {
    try {
      const { data } = await insforge.database
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (!data) return null

      const rawRole = data.role || 'student'
      const normalizedRole =
        rawRole === 'Administrador' || rawRole === 'admin' ? 'admin'
        : rawRole === 'Profesor' || rawRole === 'teacher' ? 'teacher'
        : 'student'

      return {
        ...data,
        role: normalizedRole
      } as Profile
    } catch {
      return null
    }
  }

  const refreshProfile = async () => {
    if (!user) return
    const profileData = await fetchProfile(user.id)
    setProfile(profileData)
  }

  useEffect(() => {
    let cancelled = false

    async function hydrateAuth() {
      const saved = loadSessionFromStorage()

      if (saved?.accessToken) {
        try {
          insforge.setAccessToken(saved.accessToken, AuthChangeEvent.TOKEN_REFRESHED)
          if (saved.refreshToken) {
            try { insforge.getHttpClient().setRefreshToken(saved.refreshToken) } catch {}
          }
        } catch {}
      }

      const tokenValid = saved?.accessToken && !isAccessTokenExpired(saved.accessToken)
      const canRefresh = Boolean(saved?.refreshToken)

      if (tokenValid) {
        try {
          const { data, error } = await insforge.auth.getCurrentUser()
          if (cancelled) return
          if (!error && data?.user) {
            setUser(data.user as User)
            const profileData = await fetchProfile(data.user.id)
            if (!cancelled) setProfile(profileData)
            if (!cancelled) setLoading(false)
            return
          }
        } catch {}
      } else if (canRefresh) {
        try {
          const { data, error } = await insforge.auth.getCurrentUser()
          if (cancelled) return
          if (!error && data?.user) {
            setUser(data.user as User)
            const profileData = await fetchProfile(data.user.id)
            if (!cancelled) setProfile(profileData)
            if (!cancelled) setLoading(false)
            return
          }
        } catch {}
      }

      if (cancelled) return

      if (saved?.user) {
        setUser(saved.user)
        const profileData = await fetchProfile(saved.user.id)
        if (!cancelled) setProfile(profileData)
        if (!cancelled) setLoading(false)
        return
      }

      setUser(null)
      setProfile(null)
      if (!cancelled) setLoading(false)
    }

    void hydrateAuth()
    return () => { cancelled = true }
  }, [])

  const signInWithEmail = async (email: string, password: string) => {
    const { data, error } = await insforge.auth.signInWithPassword({ email, password })
    if (error) throw error
    if (data?.user && data?.accessToken) {
      setUser(data.user as User)
      saveSessionToStorage(data.user as User, data.accessToken, data.refreshToken || getSdkRefreshToken())
      const profileData = await fetchProfile(data.user.id)
      setProfile(profileData)
    }
  }

  const signUpWithEmail = async (email: string, password: string, name: string) => {
    const { data, error } = await insforge.auth.signUp({ email, password, name })
    if (error) throw error
    if (data?.user && data?.accessToken) {
      setUser(data.user as User)
      saveSessionToStorage(data.user as User, data.accessToken, data.refreshToken || getSdkRefreshToken())
      const profileData = await fetchProfile(data.user.id)
      setProfile(profileData)
    }
  }

  const signInWithGoogle = async () => {
    const { error } = await insforge.auth.signInWithOAuth('google', {
      redirectTo: window.location.origin
    })
    if (error) throw error
  }

  const signOut = async () => {
    const { error } = await insforge.auth.signOut()
    if (error) throw error
    clearSessionStorage()
    try { insforge.setAccessToken(null as any) } catch {}
    setUser(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signInWithEmail, signUpWithEmail, signInWithGoogle, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}