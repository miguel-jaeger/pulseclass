import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { insforge } from '../lib/insforge'

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

function saveSession(user: User, accessToken: string, refreshToken?: string) {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify({ user, accessToken, refreshToken })) } catch {}
}

function loadSession(): { user: User; accessToken: string; refreshToken?: string } | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const p = JSON.parse(raw)
    if (p?.user?.id && p?.accessToken) return { user: p.user, accessToken: p.accessToken, refreshToken: p.refreshToken }
  } catch {}
  return null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await insforge.database
        .from('profiles').select('*').eq('user_id', userId).single()
      if (error || !data) return null
      const r = data.role || 'student'
      const normalized = r === 'Administrador' || r === 'admin' ? 'admin'
        : r === 'Profesor' || r === 'teacher' ? 'teacher' : 'student'
      return { ...data, role: normalized } as Profile
    } catch { return null }
  }

  const refreshProfile = async () => {
    if (!user) return
    setProfile(await fetchProfile(user.id))
  }

  useEffect(() => {
    let cancelled = false

    const saved = loadSession()
    if (saved?.user && saved?.accessToken) {
      setUser(saved.user)
      try { insforge.setAccessToken(saved.accessToken) } catch {}
      if (saved.refreshToken) {
        try { (insforge as any).http?.setRefreshToken(saved.refreshToken) } catch {}
      }
      fetchProfile(saved.user.id).then(p => { if (!cancelled) setProfile(p) })
    }
    if (!cancelled) setLoading(false)

    return () => { cancelled = true }
  }, [])

  const signInWithEmail = async (email: string, password: string) => {
    const { data, error } = await insforge.auth.signInWithPassword({ email, password })
    if (error) throw error
    if (data?.user) {
      setUser(data.user as User)
      saveSession(data.user as User, data.accessToken || '', data.refreshToken)
      const p = await fetchProfile(data.user.id)
      setProfile(p)
    }
  }

  const signUpWithEmail = async (email: string, password: string, name: string) => {
    const { data, error } = await insforge.auth.signUp({ email, password, name })
    if (error) throw error
    if (data?.user) {
      setUser(data.user as User)
      saveSession(data.user as User, data.accessToken || '', data.refreshToken)
      const p = await fetchProfile(data.user.id)
      setProfile(p)
    }
  }

  const signInWithGoogle = async () => {
    const { error } = await insforge.auth.signInWithOAuth('google', {
      redirectTo: window.location.origin
    })
    if (error) throw error
  }

  const signOut = async () => {
    try { await insforge.auth.signOut() } catch {}
    try { sessionStorage.removeItem(SESSION_KEY) } catch {}
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
