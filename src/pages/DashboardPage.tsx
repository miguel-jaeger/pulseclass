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

interface TodaySession {
  id: string
  course_id: string
  courseName: string
  title: string
  date: string
  sessionCount: number
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
        if (sessions.length === 0) {
          setSessionsToday([])
          setLoading(false)
          return
        }

        const todayCourseIds = [...new Set(sessions.map(s => s.course_id))]

        const [courseStatsRes, ratingStatsRes] = await Promise.all([
          insforge.database
            .from('course_stats')
            .select('course_id, session_count')
            .in('course_id', todayCourseIds),
          insforge.database
            .from('course_rating_stats')
            .select('course_id, rating_count, avg_score')
            .in('course_id', todayCourseIds)
        ])

        if (cancelled) return

        const sessionCounts = new Map(
          (courseStatsRes.data as { course_id: string; session_count: number }[] || []).map(r => [r.course_id, r.session_count])
        )
        const ratingStats = new Map(
          (ratingStatsRes.data as { course_id: string; rating_count: number; avg_score: number | string }[] || []).map(r => [r.course_id, r])
        )

        const courseNameById = new Map(courses.map(c => [c.id, c.name]))
        const result: TodaySession[] = sessions.map(session => {
          const rs = ratingStats.get(session.course_id)
          return {
            id: session.id,
            course_id: session.course_id,
            courseName: courseNameById.get(session.course_id) || 'Curso',
            title: session.title,
            date: session.date,
            sessionCount: sessionCounts.get(session.course_id) ?? 0,
            ratingCount: rs?.rating_count ?? 0,
            avgScore: Number(rs?.avg_score ?? 0)
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

  const courseRows = Array.from(new Map(sessionsToday.map(s => [s.course_id, s])).values())
    .sort((a, b) => b.avgScore - a.avgScore)
  const totalEvaluaciones = courseRows.reduce((sum, r) => sum + r.ratingCount, 0)
  const avgGeneral = totalEvaluaciones > 0
    ? courseRows.reduce((sum, r) => sum + r.avgScore * r.ratingCount, 0) / totalEvaluaciones
    : 0
  const nivelLabel = avgGeneral >= 8 ? 'Alto' : avgGeneral >= 5 ? 'Medio' : 'Bajo'
  const nivelColor = avgGeneral >= 8 ? 'text-primary' : avgGeneral >= 5 ? 'text-tertiary' : 'text-error'
  const nivelIcon = avgGeneral >= 8 ? 'sentiment_satisfied' : avgGeneral >= 5 ? 'sentiment_neutral' : 'sentiment_dissatisfied'

  return (
    <div className="pb-20 md:pb-xl">
      <header className="mb-xl">
        <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary font-bold">Inicio</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-xs">Sesiones de hoy con el resumen de evaluaciones de sus cursos</p>
      </header>

      {sessionsToday.length > 0 && (
        <div className="bg-surface border border-outline-variant rounded-xl p-lg mb-lg overflow-hidden">
          <h3 className="font-headline-sm text-headline-sm text-on-surface mb-lg">Resumen de evaluaciones de los cursos del día</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-md mb-lg">
            <div className="bg-surface-container-low rounded-xl p-md text-center">
              <p className="font-headline-sm text-headline-sm text-primary">{totalEvaluaciones}</p>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-xs">Total evaluaciones</p>
            </div>
            <div className="bg-surface-container-low rounded-xl p-md text-center">
              <p className="font-headline-sm text-headline-sm text-primary">{avgGeneral > 0 ? avgGeneral.toFixed(1) : '-'}</p>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-xs">Promedio general</p>
            </div>
            <div className="bg-surface-container-low rounded-xl p-md text-center">
              <span className={`material-symbols-outlined block mx-auto text-[36px] md:text-[40px] ${nivelColor}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                {nivelIcon}
              </span>
              <p className={`font-headline-sm text-headline-sm ${nivelColor}`}>{nivelLabel}</p>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-xs">Nivel de satisfacción</p>
            </div>
          </div>

          {courseRows.length > 0 && (
            <>
              <div className="hidden md:block">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-outline-variant">
                      <th className="text-left font-body-sm text-body-sm text-on-surface-variant pb-sm pr-md">Curso</th>
                      <th className="text-right font-body-sm text-body-sm text-on-surface-variant pb-sm pr-md">Evaluaciones</th>
                      <th className="text-right font-body-sm text-body-sm text-on-surface-variant pb-sm">Promedio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courseRows.map(r => (
                      <tr key={r.course_id} className="border-b border-outline-variant last:border-0">
                        <td className="py-sm pr-md font-body-sm text-body-sm text-on-surface font-medium truncate max-w-[200px]">{r.courseName}</td>
                        <td className="py-sm pr-md font-body-md text-body-md text-on-surface text-right">{r.ratingCount}</td>
                        <td className="py-sm font-body-md text-body-md text-on-surface text-right font-semibold">{r.avgScore > 0 ? r.avgScore.toFixed(1) : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="md:hidden space-y-md">
                {courseRows.map(r => (
                  <div key={r.course_id} className="border border-outline-variant rounded-xl p-md">
                    <p className="font-body-md text-body-md text-on-surface font-medium mb-sm text-center">{r.courseName}</p>
                    <div className="flex justify-between items-center px-sm">
                      <span className="font-body-sm text-body-sm text-on-surface-variant">Evaluaciones</span>
                      <span className="font-headline-sm text-headline-sm text-primary font-bold">{r.ratingCount}</span>
                    </div>
                    <div className="flex justify-between items-center px-sm">
                      <span className="font-body-sm text-body-sm text-on-surface-variant">Promedio</span>
                      <span className="font-headline-sm text-headline-sm text-primary font-bold">{r.avgScore > 0 ? r.avgScore.toFixed(1) : '-'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

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
              to={`/courses/${session.course_id}/sessions`}
              className="bg-secondary-container border border-outline-variant border-t-[3px] border-t-secondary rounded-xl p-lg flex flex-col hover:shadow-sm hover:scale-[1.01] transition-all duration-200"
            >
              <div className="flex justify-between items-start mb-md">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-sm mb-1">
                    <span className="material-symbols-outlined text-secondary text-lg">menu_book</span>
                    <h2 className="font-title-sm text-title-sm text-on-secondary-container truncate" title={session.courseName}>{session.courseName}</h2>
                  </div>
                  <p className="font-body-xs text-body-xs text-on-secondary-container mt-1 line-clamp-2">{session.title}</p>
                </div>
                <span className="inline-flex items-center gap-1 bg-secondary text-on-secondary text-[11px] font-bold rounded-full px-2 py-0.5 shrink-0">
                  <span className="material-symbols-outlined text-[14px]">today</span>
                  Hoy
                </span>
              </div>
              <div className="mt-auto flex items-center justify-between pt-md border-t border-outline-variant">
                <div className="flex items-center gap-xs" title={`${session.sessionCount} sesiones del curso`}>
                  <span className="material-symbols-outlined text-on-secondary-container text-lg">event</span>
                  <span className="font-body-sm text-body-sm text-on-secondary-container font-medium">{session.sessionCount}</span>
                </div>
                <div className="flex items-center gap-xs" title={`${session.ratingCount} evaluaciones del curso`}>
                  <span className="material-symbols-outlined text-on-secondary-container text-lg">rate_review</span>
                  <span className="font-body-sm text-body-sm text-on-secondary-container font-medium">{session.ratingCount}</span>
                </div>
                <div className="flex items-center gap-xs" title={`Promedio del curso: ${session.avgScore > 0 ? session.avgScore.toFixed(1) : '-'}`}>
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