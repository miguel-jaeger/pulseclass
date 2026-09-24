import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { insforge } from '../lib/insforge'
import { useAuth } from '../hooks/useAuth'
import { useImpersonation } from '../hooks/useImpersonation'

interface Course {
  id: string
  name: string
  description: string
  created_by: string
  is_active: boolean
}

interface Session {
  id: string
  course_id: string
  title: string
  date: string
}

interface Rating {
  id: string
  session_id: string
  score: number
}

interface TodaySession {
  id: string
  course_id: string
  courseName: string
  title: string
  date: string
  ratingCount: number
  avgScore: number
}

export function DashboardPage() {
  const { profile } = useAuth()
  const { impersonatedRole, isImpersonating } = useImpersonation()
  const effectiveRole = isImpersonating && impersonatedRole ? impersonatedRole : profile?.role
  const [sessionsToday, setSessionsToday] = useState<TodaySession[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return

    let cancelled = false

    async function fetchDashboard() {
      try {
        let courses: Course[] = []

        if (effectiveRole === 'admin') {
          const { data, error } = await insforge.database
            .from('courses')
            .select('id, name, description, created_by, is_active')
            .eq('is_active', true)
            .order('created_at', { ascending: false })
          if (!error && data) courses = data as Course[]
        } else if (effectiveRole === 'teacher') {
          const { data: owned, error: ownedError } = await insforge.database
            .from('courses')
            .select('id, name, description, created_by, is_active')
            .eq('created_by', profile!.user_id)
            .eq('is_active', true)

          const { data: memberRows, error: memberError } = await insforge.database
            .from('course_members')
            .select('course_id')
            .eq('user_id', profile!.user_id)

          if (!ownedError && owned) {
            courses = owned as Course[]
          }

          if (!memberError && memberRows) {
            const memberIds = (memberRows as { course_id: string }[]).map(r => r.course_id)
            if (memberIds.length > 0) {
              const { data: memberCourses } = await insforge.database
                .from('courses')
                .select('id, name, description, created_by, is_active')
                .in('id', memberIds)
                .eq('is_active', true)
              if (memberCourses) {
                const existing = new Set(courses.map(c => c.id))
                for (const mc of memberCourses as Course[]) {
                  if (!existing.has(mc.id)) courses.push(mc)
                }
              }
            }
          }
        } else {
          const { data: memberRows, error: memberError } = await insforge.database
            .from('course_members')
            .select('course_id')
            .eq('user_id', profile!.user_id)

          if (!memberError && memberRows) {
            const memberIds = (memberRows as { course_id: string }[]).map(r => r.course_id)
            if (memberIds.length > 0) {
              const { data } = await insforge.database
                .from('courses')
                .select('id, name, description, created_by, is_active')
                .in('id', memberIds)
                .eq('is_active', true)
              if (data) courses = data as Course[]
            }
          }
        }

        if (cancelled) return

        const courseIds = courses.map(c => c.id)
        if (courseIds.length === 0) {
          setSessionsToday([])
          setLoading(false)
          return
        }

        const today = new Date()
        const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

        const { data: sessionsData, error: sessionsError } = await insforge.database
          .from('sessions')
          .select('id, course_id, title, date')
          .in('course_id', courseIds)
          .eq('date', dateStr)

        if (cancelled) return

        if (sessionsError) {
          console.error('Error fetching sessions:', sessionsError)
          setSessionsToday([])
          setLoading(false)
          return
        }

        const sessions = (sessionsData as Session[]) || []
        const sessionIds = sessions.map(s => s.id)

        let ratings: Rating[] = []
        if (sessionIds.length > 0) {
          const { data: ratingsData } = await insforge.database
            .from('ratings')
            .select('id, session_id, score')
            .in('session_id', sessionIds)
          if (ratingsData) ratings = ratingsData as Rating[]
        }

        if (cancelled) return

        const courseNameById = new Map(courses.map(c => [c.id, c.name]))
        const result: TodaySession[] = sessions.map(session => {
          const sessionRatings = ratings.filter(r => r.session_id === session.id)
          const avgScore = sessionRatings.length > 0
            ? sessionRatings.reduce((sum, r) => sum + r.score, 0) / sessionRatings.length
            : 0
          return {
            id: session.id,
            course_id: session.course_id,
            courseName: courseNameById.get(session.course_id) || 'Curso',
            title: session.title,
            date: session.date,
            ratingCount: sessionRatings.length,
            avgScore
          }
        })

        result.sort((a, b) => a.courseName.localeCompare(b.courseName))

        setSessionsToday(result)
      } catch (err) {
        console.error('Error in fetchDashboard:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchDashboard()
    return () => { cancelled = true }
  }, [profile, effectiveRole])

  return (
    <div className="pb-20 md:pb-xl">
      <header className="mb-xl">
        <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary font-bold">Inicio</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-xs">Sesiones de hoy</p>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-surface border border-outline-variant rounded-xl p-lg">
              <div className="flex justify-between items-start mb-md">
                <div className="flex-1">
                  <div className="h-5 w-32 bg-surface-container animate-pulse rounded mb-sm" />
                  <div className="h-3 w-48 bg-surface-container animate-pulse rounded" />
                </div>
                <div className="h-8 w-8 bg-surface-container animate-pulse rounded-full" />
              </div>
              <div className="flex gap-lg mt-auto">
                <div className="flex items-center gap-xs">
                  <div className="h-4 w-4 bg-surface-container animate-pulse rounded" />
                  <div className="h-4 w-8 bg-surface-container animate-pulse rounded" />
                </div>
                <div className="flex items-center gap-xs">
                  <div className="h-4 w-4 bg-surface-container animate-pulse rounded" />
                  <div className="h-4 w-8 bg-surface-container animate-pulse rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : sessionsToday.length === 0 ? (
        <div className="text-center py-xl">
          <span className="material-symbols-outlined text-on-surface-variant text-[48px] mb-md block">event</span>
          <p className="font-body-md text-body-md text-on-surface-variant">No hay sesiones programadas para hoy.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
          {sessionsToday.map(session => (
            <Link
              key={session.id}
              to={`/sessions/${session.id}`}
              className="bg-success-container/60 border border-success/70 border-t-[3px] border-t-success rounded-xl p-lg flex flex-col hover:shadow-sm hover:scale-[1.01] transition-all duration-200"
            >
              <div className="flex justify-between items-start mb-md">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-sm mb-1">
                    <span className="material-symbols-outlined text-success text-lg">menu_book</span>
                    <h2 className="font-title-sm text-title-sm text-on-success-container truncate" title={session.courseName}>{session.courseName}</h2>
                  </div>
                  <p className="font-body-xs text-body-xs text-on-success-container mt-1 line-clamp-2">{session.title}</p>
                </div>
                <span className="inline-flex items-center gap-1 bg-success text-on-success text-[11px] font-bold rounded-full px-2 py-0.5 shrink-0">
                  <span className="material-symbols-outlined text-[14px]">today</span>
                  Hoy
                </span>
              </div>
              <div className="mt-auto flex items-center justify-between pt-md border-t border-success/40">
                <div className="flex items-center gap-xs" title={`${session.ratingCount} evaluaciones`}>
                  <span className="material-symbols-outlined text-on-success-container text-lg">rate_review</span>
                  <span className="font-body-sm text-body-sm text-on-success-container font-medium">{session.ratingCount}</span>
                </div>
                <div className="flex items-center gap-xs" title={`Promedio: ${session.avgScore > 0 ? session.avgScore.toFixed(1) : '-'}`}>
                  <span className={`material-symbols-outlined text-lg ${session.avgScore >= 8 ? 'text-success' : session.avgScore >= 5 ? 'text-tertiary' : 'text-error'}`}>trending_up</span>
                  <span className={`font-body-sm text-body-sm font-medium ${session.avgScore >= 8 ? 'text-success' : session.avgScore >= 5 ? 'text-tertiary' : 'text-error'}`}>{session.avgScore > 0 ? session.avgScore.toFixed(1) : '-'}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
