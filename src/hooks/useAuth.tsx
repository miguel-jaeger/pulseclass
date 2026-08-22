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
  signInWithMicrosoft: () => Promise<void>
  signInWithGoogle: () => Promise<void>
  signInWithGithub: () => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

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
      const { data, error } = await insforge.auth.getCurrentUser()
      if (cancelled) return

      if (error || !data?.user) {
        setUser(null)
        setProfile(null)
        setLoading(false)
        return
      }

      setUser(data.user as User)

      // Fetch user profile with role
      const profileData = await fetchProfile(data.user.id)

      if (!cancelled) {
        setProfile(profileData)
      }

      setLoading(false)
    }

    void hydrateAuth()
    return () => { cancelled = true }
  }, [])

  const signInWithMicrosoft = async () => {
    const { error } = await insforge.auth.signInWithOAuth('microsoft', {
      redirectTo: window.location.origin
    })
    if (error) throw error
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
    setUser(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signInWithMicrosoft, signInWithGoogle, signInWithGithub, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
