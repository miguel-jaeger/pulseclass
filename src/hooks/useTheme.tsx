import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { insforge } from '../lib/insforge'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | null>(null)

function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

export function ThemeProvider({ children, userId }: { children: ReactNode; userId?: string }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('pulseclass_theme')
    return (saved === 'dark' || saved === 'light') ? saved : 'light'
  })

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const setTheme = useCallback(async (newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem('pulseclass_theme', newTheme)
    applyTheme(newTheme)

    if (userId) {
      await insforge.database
        .from('profiles')
        .update({ theme: newTheme })
        .eq('user_id', userId)
    }
  }, [userId])

  useEffect(() => {
    if (!userId) return

    async function loadTheme() {
      const { data } = await insforge.database
        .from('profiles')
        .select('theme')
        .eq('user_id', userId)
        .single()

      if (data?.theme && (data.theme === 'light' || data.theme === 'dark')) {
        setThemeState(data.theme)
        localStorage.setItem('pulseclass_theme', data.theme)
        applyTheme(data.theme)
      }
    }

    loadTheme()
  }, [userId])

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within ThemeProvider')
  return context
}
