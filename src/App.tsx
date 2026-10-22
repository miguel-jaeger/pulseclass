import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { ImpersonationProvider } from './hooks/useImpersonation'
import { ThemeProvider } from './hooks/useTheme'
import { Layout } from './components/Layout'
import { LoginPage } from './pages/LoginPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { DashboardPage } from './pages/DashboardPage'
import { AdminPage } from './pages/AdminPage'
import { CoursesPage } from './pages/CoursesPage'
import { SessionsPage } from './pages/SessionsPage'
import { RateSessionPage } from './pages/RateSessionPage'
import { SessionDetailPage } from './pages/SessionDetailPage'
import { CourseMembersPage } from './pages/CourseMembersPage'
import { ProfilePage } from './pages/ProfilePage'
import { SuggestionsPage } from './pages/SuggestionsPage'
import { HelpPage } from './pages/HelpPage'
import { HelpAdminPage } from './pages/HelpAdminPage'
import type { ReactNode } from 'react'

const StatisticsPage = lazy(() => import('./pages/StatisticsPage'))

const SPLASH_MIN_MS = 2500

function useSplashReady() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const started = (window as unknown as { __pulseclassSplashStart?: number }).__pulseclassSplashStart ?? Date.now()
    const remaining = Math.max(0, SPLASH_MIN_MS - (Date.now() - started))
    const timer = setTimeout(() => setReady(true), remaining)
    return () => clearTimeout(timer)
  }, [])

  return ready
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-xl">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
    </div>
  )
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return null
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Layout>{children}</Layout>
}

function AppRoutes() {
  const { user, loading } = useAuth()
  const splashReady = useSplashReady()

  useEffect(() => {
    if (loading || !splashReady) return
    document.getElementById('splash')?.remove()
  }, [loading, splashReady])

  if (loading || !splashReady) {
    return null
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/" element={
        <ProtectedRoute>
          <DashboardPage />
        </ProtectedRoute>
      } />
      <Route path="/admin" element={
        <ProtectedRoute>
          <AdminPage />
        </ProtectedRoute>
      } />
      <Route path="/courses" element={
        <ProtectedRoute>
          <CoursesPage />
        </ProtectedRoute>
      } />
      <Route path="/courses/:courseId/sessions" element={
        <ProtectedRoute>
          <SessionsPage />
        </ProtectedRoute>
      } />
      <Route path="/courses/:courseId/members" element={
        <ProtectedRoute>
          <CourseMembersPage />
        </ProtectedRoute>
      } />
      <Route path="/sessions/:sessionId/rate" element={
        <ProtectedRoute>
          <RateSessionPage />
        </ProtectedRoute>
      } />
      <Route path="/sessions/:sessionId" element={
        <ProtectedRoute>
          <SessionDetailPage />
        </ProtectedRoute>
      } />
      <Route path="/statistics" element={
        <ProtectedRoute>
          <Suspense fallback={<LoadingSpinner />}>
            <StatisticsPage />
          </Suspense>
        </ProtectedRoute>
      } />
      <Route path="/profile" element={
        <ProtectedRoute>
          <ProfilePage />
        </ProtectedRoute>
      } />
      <Route path="/suggestions" element={
        <ProtectedRoute>
          <SuggestionsPage />
        </ProtectedRoute>
      } />
      <Route path="/videos" element={
        <ProtectedRoute>
          <HelpPage />
        </ProtectedRoute>
      } />
      <Route path="/admin/videos" element={
        <ProtectedRoute>
          <HelpAdminPage />
        </ProtectedRoute>
      } />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ImpersonationProvider>
          <ThemeWrapper />
        </ImpersonationProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

function ThemeWrapper() {
  const { user } = useAuth()
  return (
    <ThemeProvider userId={user?.id}>
      <AppRoutes />
    </ThemeProvider>
  )
}
