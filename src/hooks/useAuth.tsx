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

const TOKEN_KEY = 'insforge_access_token'

function persistToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
}

function getPersistedToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (userId: string) => {
    const { data: profileData } = await insforge.database
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    return profileData as Profile | null
  }

  const refreshProfile = async () => {
    if (!user) return
    const profileData = await fetchProfile(user.id)
    setProfile(profileData)
  }

  useEffect(() => {
    let cancelled = false

    async function hydrateAuth() {
      const savedToken = getPersistedToken()

      if (savedToken) {
        try {
          const response = await fetch(
            `${import.meta.env.VITE_INSFORGE_URL}/auth/v1/user`,
            {
              headers: { Authorization: `Bearer ${savedToken}` },
            }
          )

          if (response.ok) {
            const userData = await response.json()
            if (!cancelled) {
              setUser(userData as User)
              const profileData = await fetchProfile(userData.id)
              if (!cancelled) setProfile(profileData)
            }
          } else {
            persistToken(null)
            if (!cancelled) {
              setUser(null)
              setProfile(null)
            }
          }
        } catch {
          persistToken(null)
          if (!cancelled) {
            setUser(null)
            setProfile(null)
          }
        }
      } else {
        const { data, error } = await insforge.auth.getCurrentUser()
        if (cancelled) return

        if (error || !data?.user) {
          setUser(null)
          setProfile(null)
        } else {
          setUser(data.user as User)
          const profileData = await fetchProfile(data.user.id)
          if (!cancelled) setProfile(profileData)
        }
      }

      if (!cancelled) setLoading(false)
    }

    void hydrateAuth()
    return () => { cancelled = true }
  }, [])

  const signInWithEmail = async (email: string, password: string) => {
    const { data, error } = await insforge.auth.signInWithPassword({ email, password })
    if (error) throw error
    if (data?.user) {
      persistToken(data.accessToken)
      setUser(data.user as User)
      const profileData = await fetchProfile(data.user.id)
      setProfile(profileData)
    }
  }

  const signUpWithEmail = async (email: string, password: string, name: string) => {
    const { data, error } = await insforge.auth.signUp({ email, password, name })
    if (error) throw error
    if (data?.user) {
      persistToken(data.accessToken)
      setUser(data.user as User)
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
    persistToken(null)
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
