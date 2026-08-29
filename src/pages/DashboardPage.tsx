import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { insforge } from '../lib/insforge'
import { useAuth } from '../hooks/useAuth'
import { useImpersonation } from '../hooks/useImpersonation'
import { Pagination, usePagination } from '../components/Pagination'

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

interface CourseSummary {
  course: Course
  sessionCount: number
  ratingCount: number
  avgScore: number
}

export function DashboardPage() {
  const { profile } = useAuth()
  const { impersonatedRole, isImpersonating } = useImpersonation()
  const effectiveRole = isImpersonating && impersonatedRole ? impersonatedRole : profile?.role
  const [summaries, setSummaries] = useState<CourseSummary[]>([])
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
          setSummaries([])
          setLoading(false)
          return
        }

        const { data: sessionsData, error: sessionsError } = await insforge.database
          .from('sessions')
          .select('id, course_id, title, date')
          .in('course_id', courseIds)

        if (cancelled) return

        if (sessionsError) {
          console.error('Error fetching sessions:', sessionsError)
          setSummaries(courses.map(course => ({
            course,
            sessionCount: 0,
            ratingCount: 0,
            avgScore: 0
          })))
          setLoading(false)
          return
        }

        const sessions = (sessionsData as Session[]) || []
        const sessionIds = sessions.map(s => s.id)

        let ratings: Rating[] = []
        if (sessionIds.length > 0) {
          const { data: ratingsData, error: ratingsError } = await insforge.database
            .from('ratings')
            .select('id, session_id, score')
            .in('session_id', sessionIds)

          if (!ratingsError && ratingsData) {
            ratings = ratingsData as Rating[]
          }
        }

        if (cancelled) return

        const result: CourseSummary[] = courses.map(course => {
          const courseSessions = sessions.filter(s => s.course_id === course.id)
          const courseSessionIds = new Set(courseSessions.map(s => s.id))
          const courseRatings = ratings.filter(r => courseSessionIds.has(r.session_id))
          const avgScore = courseRatings.length > 0
            ? courseRatings.reduce((sum, r) => sum + r.score, 0) / courseRatings.length
            : 0
          return {
            course,
            sessionCount: courseSessions.length,
            ratingCount: courseRatings.length,
            avgScore
          }
        })

        result.sort((a, b) => {
          if (a.course.is_active !== b.course.is_active) return a.course.is_active ? -1 : 1
          return a.course.name.localeCompare(b.course.name)
        })

        setSummaries(result)
      } catch (err) {
        console.error('Error in fetchDashboard:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchDashboard()
    return () => { cancelled = true }
  }, [profile, effectiveRole])

  const totalSessions = summaries.reduce((sum, s) => sum + s.sessionCount, 0)
  const totalRatings = summaries.reduce((sum, s) => sum + s.ratingCount, 0)
  const allAvg = totalRatings > 0
    ? summaries.reduce((sum, s) => sum + s.avgScore * s.ratingCount, 0) / totalRatings
    : 0

  const { page, perPage, setPage, setPerPage, paginatedSlice } = usePagination(summaries.length, 6)
  const paginatedSummaries = paginatedSlice(summaries)

  return (
    <div className="pb-20 md:pb-xl">
      <header className="mb-xl">
        <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary font-bold">Inicio</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-xs">Resumen de tus cursos actuales</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-lg mb-xl">
        <div className="bg-surface border border-outline-variant rounded-xl p-lg">
          <div className="flex items-center gap-sm mb-sm">
            <span className="material-symbols-outlined text-primary">menu_book</span>
            <h3 className="font-label-md text-label-md text-on-surface-variant">Cursos</h3>
          </div>
          <p className="font-headline-lg text-headline-lg text-primary font-bold">{summaries.length}</p>
        </div>
        <div className="bg-surface border border-outline-variant rounded-xl p-lg">
          <div className="flex items-center gap-sm mb-sm">
            <span className="material-symbols-outlined text-primary">event</span>
            <h3 className="font-label-md text-label-md text-on-surface-variant">Sesiones</h3>
          </div>
          <p className="font-headline-lg text-headline-lg text-primary font-bold">{totalSessions}</p>
        </div>
        <div className="bg-surface border border-outline-variant rounded-xl p-lg">
          <div className="flex items-center gap-sm mb-sm">
            <span className="material-symbols-outlined text-primary">trending_up</span>
            <h3 className="font-label-md text-label-md text-on-surface-variant">Promedio General</h3>
          </div>
          <p className="font-headline-lg text-headline-lg text-primary font-bold">{allAvg > 0 ? allAvg.toFixed(1) : '-'}</p>
        </div>
      </div>

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
                <div className="flex items-center gap-xs">
                  <div className="h-4 w-4 bg-surface-container animate-pulse rounded" />
                  <div className="h-4 w-8 bg-surface-container animate-pulse rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : summaries.length === 0 ? (
        <div className="text-center py-xl">
          <span className="material-symbols-outlined text-on-surface-variant text-[48px] mb-md block">school</span>
          <p className="font-body-md text-body-md text-on-surface-variant">No tienes cursos asignados aún.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
          {paginatedSummaries.map(({ course, sessionCount, ratingCount, avgScore }) => (
            <Link
              key={course.id}
              to={`/courses/${course.id}/sessions`}
              className="bg-surface border border-outline-variant border-t-[3px] border-t-primary rounded-xl p-lg flex flex-col hover:shadow-sm hover:scale-[1.01] transition-all duration-200"
            >
              <div className="flex justify-between items-start mb-md">
                <div className="flex-1 min-w-0">
                  <h2 className="font-title-sm text-title-sm text-on-surface truncate" title={course.name}>{course.name}</h2>
                  {course.description && (
                    <p className="font-body-xs text-body-xs text-on-surface-variant mt-1 line-clamp-2">{course.description}</p>
                  )}
                </div>
                <div className="bg-surface-container rounded-full p-sm flex items-center justify-center shrink-0 ml-sm">
                  <span className="material-symbols-outlined text-primary text-xl">menu_book</span>
                </div>
              </div>
              <div className="mt-auto flex items-center justify-between pt-md border-t border-outline-variant">
                <div className="flex items-center gap-xs" title={`${sessionCount} sesiones`}>
                  <span className="material-symbols-outlined text-on-surface-variant text-lg">event</span>
                  <span className="font-body-sm text-body-sm text-on-surface font-medium">{sessionCount}</span>
                </div>
                <div className="flex items-center gap-xs" title={`${ratingCount} evaluaciones`}>
                  <span className="material-symbols-outlined text-on-surface-variant text-lg">rate_review</span>
                  <span className="font-body-sm text-body-sm text-on-surface font-medium">{ratingCount}</span>
                </div>
                <div className="flex items-center gap-xs" title={`Promedio: ${avgScore > 0 ? avgScore.toFixed(1) : '-'}`}>
                  <span className={`material-symbols-outlined text-lg ${avgScore >= 8 ? 'text-primary' : avgScore >= 5 ? 'text-tertiary' : 'text-error'}`}>trending_up</span>
                  <span className={`font-body-sm text-body-sm font-medium ${avgScore >= 8 ? 'text-primary' : avgScore >= 5 ? 'text-tertiary' : 'text-error'}`}>{avgScore > 0 ? avgScore.toFixed(1) : '-'}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {summaries.length > 0 && (
        <Pagination
          totalItems={summaries.length}
          page={page}
          perPage={perPage}
          onPageChange={setPage}
          onPerPageChange={setPerPage}
        />
      )}
    </div>
  )
}
