import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { insforge } from '../lib/insforge'
import { normalizeRole } from '../lib/roles'
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
  signInWithEmail: (email: string, password: string, remember?: boolean) => Promise<void>
  signUpWithEmail: (email: string, password: string, name: string, remember?: boolean) => Promise<void>
  signInWithGoogle: (remember?: boolean) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

const SESSION_KEY = 'pulseclass_session'
const REMEMBER_KEY = 'pulseclass_remember'

type StorageKind = 'local' | 'session'

interface SavedSession {
  user: User
  accessToken: string
  refreshToken?: string
}

function getStorage(kind: StorageKind): Storage {
  return kind === 'local' ? window.localStorage : window.sessionStorage
}

function saveSession(session: SavedSession, kind: StorageKind) {
  try { getStorage(kind).setItem(SESSION_KEY, JSON.stringify(session)) } catch {}
}

function loadSession(kind: StorageKind): SavedSession | null {
  try {
    const raw = getStorage(kind).getItem(SESSION_KEY)
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

function loadAnySession(): SavedSession | null {
  return loadSession('local') || loadSession('session')
}

function clearAllSessions() {
  try { getStorage('local').removeItem(SESSION_KEY) } catch {}
  try { getStorage('session').removeItem(SESSION_KEY) } catch {}
  try { getStorage('local').removeItem(REMEMBER_KEY) } catch {}
  try { getStorage('session').removeItem(REMEMBER_KEY) } catch {}
}

function getStorageKindForRemember(remember: boolean): StorageKind {
  return remember ? 'local' : 'session'
}

function getSdkRefreshToken(): string | undefined {
  try { return (insforge as any).http?.refreshToken || undefined } catch { return undefined }
}

function persistCurrentSession(user: User, kind: StorageKind) {
  try {
    const accessToken = (insforge as any).http?.userToken || ''
    if (accessToken) {
      saveSession({ user, accessToken, refreshToken: getSdkRefreshToken() }, kind)
    }
  } catch {}
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

      return {
        ...data,
        role: normalizeRole(data.role)
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
      const saved = loadAnySession()

      if (saved?.accessToken) {
        try {
          insforge.setAccessToken(saved.accessToken, AuthChangeEvent.TOKEN_REFRESHED)
          if (saved.refreshToken) {
            try { insforge.getHttpClient().setRefreshToken(saved.refreshToken) } catch {}
          }
        } catch {}
      }

      try {
        const { data, error } = await insforge.auth.getCurrentUser()

        if (cancelled) return

        if (!error && data?.user) {
          const freshUser = data.user as User
          setUser(freshUser)
          const profileData = await fetchProfile(freshUser.id)
          if (!cancelled) setProfile(profileData)

          const pendingRemember = getStorage('local').getItem(REMEMBER_KEY)
          const kind: StorageKind = pendingRemember === 'session' ? 'session' : 'local'
          persistCurrentSession(freshUser, kind)
          try { getStorage('session').removeItem(REMEMBER_KEY) } catch {}

          if (!cancelled) setLoading(false)
          return
        }
      } catch {
      }

      if (cancelled) return

      // No session or expired/invalid => clean sign-out
      clearAllSessions()
      try { insforge.setAccessToken(null as any) } catch {}
      setUser(null)
      setProfile(null)
      if (!cancelled) setLoading(false)
    }

    void hydrateAuth()
    return () => { cancelled = true }
  }, [])

  const signInWithEmail = async (email: string, password: string, remember = true) => {
    const kind = getStorageKindForRemember(remember)
    const { data, error } = await insforge.auth.signInWithPassword({ email, password })
    if (error) throw error
    if (data?.user && data?.accessToken) {
      setUser(data.user as User)
      saveSession(
        { user: data.user as User, accessToken: data.accessToken, refreshToken: data.refreshToken || getSdkRefreshToken() },
        kind
      )
      const profileData = await fetchProfile(data.user.id)
      setProfile(profileData)
    }
  }

  const signUpWithEmail = async (email: string, password: string, name: string, remember = true) => {
    const kind = getStorageKindForRemember(remember)
    const { data, error } = await insforge.auth.signUp({ email, password, name })
    if (error) throw error
    if (data?.user && data?.accessToken) {
      setUser(data.user as User)
      saveSession(
        { user: data.user as User, accessToken: data.accessToken, refreshToken: data.refreshToken || getSdkRefreshToken() },
        kind
      )
      const profileData = await fetchProfile(data.user.id)
      setProfile(profileData)
    }
  }

  const signInWithGoogle = async (remember = true) => {
    try { getStorage('local').setItem(REMEMBER_KEY, remember ? 'local' : 'session') } catch {}
    const { error } = await insforge.auth.signInWithOAuth('google', {
      redirectTo: window.location.origin
    })
    if (error) throw error
  }

  const signOut = async () => {
    try { await insforge.auth.signOut() } catch {}
    clearAllSessions()
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