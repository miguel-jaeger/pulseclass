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
}

interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string, name: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signInWithGithub: () => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

const SESSION_KEY = 'pulseclass_session'

function saveSessionToStorage(user: User, accessToken: string) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ user, accessToken }))
}

function loadSessionFromStorage(): { user: User; accessToken: string } | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed?.user?.id && parsed?.accessToken) {
      return { user: parsed.user, accessToken: parsed.accessToken }
    }
    return null
  } catch {
    return null
  }
}

function clearSessionStorage() {
  localStorage.removeItem(SESSION_KEY)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (userId: string) => {
    try {
      const { data: profileData } = await insforge.database
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (!profileData) return null

      return {
        ...profileData,
        role: profileData.role || 'student'
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
      // 1. Try SDK first (session in memory from same tab)
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
      } catch {
        // SDK threw — continue to fallback
      }

      if (cancelled) return

      // 2. SDK failed — try restoring from localStorage
      const saved = loadSessionFromStorage()
      if (saved) {
        // Restore SDK auth state with saved access token
        try {
          insforge.setAccessToken(saved.accessToken, AuthChangeEvent.TOKEN_REFRESHED)
        } catch {
          // setAccessToken failed — continue anyway
        }
        setUser(saved.user)
        const profileData = await fetchProfile(saved.user.id)
        if (!cancelled) setProfile(profileData)
        if (!cancelled) setLoading(false)
        return
      }

      // 3. No saved session
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
      saveSessionToStorage(data.user as User, data.accessToken)
      const profileData = await fetchProfile(data.user.id)
      setProfile(profileData)
    }
  }

  const signUpWithEmail = async (email: string, password: string, name: string) => {
    const { data, error } = await insforge.auth.signUp({ email, password, name })
    if (error) throw error
    if (data?.user && data?.accessToken) {
      setUser(data.user as User)
      saveSessionToStorage(data.user as User, data.accessToken)
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

  const signInWithGithub = async () => {
    const { error } = await insforge.auth.signInWithOAuth('github', {
      redirectTo: window.location.origin
    })
    if (error) throw error
  }

  const signOut = async () => {
    const { error } = await insforge.auth.signOut()
    if (error) throw error
    clearSessionStorage()
    try { insforge.setAccessToken(null) } catch { /* ignore */ }
    setUser(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signInWithEmail, signUpWithEmail, signInWithGoogle, signInWithGithub, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
