import { useState, useEffect, useMemo } from 'react'
import { insforge } from '../lib/insforge'
import { useAuth } from '../hooks/useAuth'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

interface Course {
  id: string
  name: string
  description: string
  created_by: string
  created_at: string
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
  student_id: string
  score: number
  comment: string
  suggestion: string
  created_at: string
}

interface SessionStat {
  id: string
  courseName: string
  dateRange: string
  count: number
  avg: number
}

interface RatedItem {
  id: string
  sessionTitle: string
  date: string
  score: number
  text: string
  createdAt: string
}

function getDefaultDateStart(): string {
  const d = new Date()
  d.setMonth(d.getMonth() - 3)
  return d.toISOString().split('T')[0]
}

function getDefaultDateEnd(): string {
  return new Date().toISOString().split('T')[0]
}

export function StatisticsPage() {
  const { profile } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [ratings, setRatings] = useState<Rating[]>([])
  const [loading, setLoading] = useState(true)

  const [dateStart, setDateStart] = useState(getDefaultDateStart)
  const [dateEnd, setDateEnd] = useState(getDefaultDateEnd)
  const [selectedCourse, setSelectedCourse] = useState('all')

  const [activeTab, setActiveTab] = useState<'overview' | 'comments' | 'suggestions'>('overview')

  useEffect(() => {
    if (profile?.role === 'student' && courses.length === 1) {
      setSelectedCourse(courses[0].id)
    }
  }, [courses, profile])

  useEffect(() => {
    async function fetchCourses() {
      if (!profile) return
      if (profile.role === 'admin') {
        const { data } = await insforge.database
          .from('courses')
          .select('id, name, description, created_by, created_at, is_active')
          .order('name')
        if (data) setCourses(data as Course[])
      } else if (profile.role === 'teacher') {
        const { data: owned } = await insforge.database
          .from('courses')
          .select('id, name, description, created_by, created_at, is_active')
          .eq('created_by', profile.user_id)
        const { data: memberRows } = await insforge.database
          .from('course_members')
          .select('course_id')
          .eq('user_id', profile.user_id)
        const memberIds = (memberRows as { course_id: string }[] || []).map(r => r.course_id)
        let memberCourses: Course[] = []
        if (memberIds.length > 0) {
          const { data } = await insforge.database
            .from('courses')
            .select('id, name, description, created_by, created_at, is_active')
            .in('id', memberIds)
          memberCourses = (data as Course[]) || []
        }
        const all = [...(owned as Course[] || []), ...memberCourses]
        const unique = all.filter((c, i, arr) => arr.findIndex(x => x.id === c.id) === i)
        unique.sort((a, b) => a.name.localeCompare(b.name))
        setCourses(unique)
      } else {
        const { data: memberRows } = await insforge.database
          .from('course_members')
          .select('course_id')
          .eq('user_id', profile?.user_id)
        const memberIds = (memberRows as { course_id: string }[] || []).map(r => r.course_id)
        if (memberIds.length > 0) {
          const { data } = await insforge.database
            .from('courses')
            .select('id, name, description, created_by, created_at, is_active')
            .in('id', memberIds)
          if (data) setCourses(data as Course[])
        }
      }
    }
    fetchCourses()
  }, [profile])

  useEffect(() => {
    let cancelled = false

    async function fetchData() {
      setLoading(true)

      let sessionQuery = insforge.database
        .from('sessions')
        .select('id, course_id, title, date')

      if (selectedCourse !== 'all') {
        sessionQuery = sessionQuery.eq('course_id', selectedCourse)
      } else if (profile?.role !== 'admin' && courses.length > 0) {
        sessionQuery = sessionQuery.in('course_id', courses.map(c => c.id))
      }

      sessionQuery = sessionQuery.gte('date', dateStart).lte('date', dateEnd)

      const { data: sessionsData, error: sessionsError } = await sessionQuery

      if (cancelled) return

      if (sessionsError || !sessionsData || sessionsData.length === 0) {
        setSessions([])
        setRatings([])
        setLoading(false)
        return
      }

      const sessionIds = (sessionsData as Session[]).map(s => s.id)

      const { data: ratingsData } = await insforge.database
        .from('ratings')
        .select('*')
        .in('session_id', sessionIds)

      if (cancelled) return

      setSessions(sessionsData as Session[])
      setRatings((ratingsData as Rating[]) || [])
      setLoading(false)
    }

    fetchData()
    return () => { cancelled = true }
  }, [dateStart, dateEnd, selectedCourse, courses, profile])

  const avgScore = useMemo(() => {
    if (ratings.length === 0) return 0
    return ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length
  }, [ratings])

  const scoreDistribution = useMemo(() => {
    return Array.from({ length: 10 }, (_, i) => ({
      score: i + 1,
      count: ratings.filter(r => r.score === i + 1).length
    }))
  }, [ratings])

  const categoryData = useMemo(() => {
    const alto = ratings.filter(r => r.score >= 9).length
    const medio = ratings.filter(r => r.score >= 7 && r.score <= 8).length
    const bajo = ratings.filter(r => r.score <= 6).length
    return [
      { name: 'Satisfecho (9-10)', value: alto },
      { name: 'Neutral (7-8)', value: medio },
      { name: 'Insatisfecho (1-6)', value: bajo }
    ]
  }, [ratings])

  const sessionStats = useMemo<SessionStat[]>(() => {
    const map = new Map<string, { courseName: string; count: number; sum: number }>()
    for (const r of ratings) {
      const s = sessions.find(sess => sess.id === r.session_id)
      if (!s) continue
      const course = courses.find(c => c.id === s.course_id)
      const key = s.course_id
      const existing = map.get(key)
      if (existing) {
        existing.count++
        existing.sum += r.score
      } else {
        map.set(key, { courseName: course?.name ?? 'Sin curso', count: 1, sum: r.score })
      }
    }
    const dStart = new Date(dateStart).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
    const dEnd = new Date(dateEnd).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
    const dateRange = `${dStart} - ${dEnd}`
    return Array.from(map.entries())
      .map(([id, v]) => ({ id, courseName: v.courseName, dateRange, count: v.count, avg: v.sum / v.count }))
      .sort((a, b) => b.avg - a.avg)
  }, [ratings, sessions, courses, dateStart, dateEnd])

  const commentsWithSession = useMemo<RatedItem[]>(() => {
    return ratings
      .filter(r => r.comment)
      .map(r => {
        const s = sessions.find(sess => sess.id === r.session_id)
        return {
          id: r.id,
          sessionTitle: s?.title ?? 'Sin sesión',
          date: s?.date ?? '',
          score: r.score,
          text: r.comment,
          createdAt: r.created_at
        }
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [ratings, sessions])

  const suggestionsWithSession = useMemo<RatedItem[]>(() => {
    return ratings
      .filter(r => r.suggestion)
      .map(r => {
        const s = sessions.find(sess => sess.id === r.session_id)
        return {
          id: r.id,
          sessionTitle: s?.title ?? 'Sin sesión',
          date: s?.date ?? '',
          score: r.score,
          text: r.suggestion,
          createdAt: r.created_at
        }
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [ratings, sessions])

  const totalEvaluaciones = ratings.length

  const nivelLabel = avgScore >= 8 ? 'Alto' : avgScore >= 5 ? 'Medio' : 'Bajo'
  const nivelColor = avgScore >= 8 ? 'text-primary' : avgScore >= 5 ? 'text-tertiary' : 'text-error'

  return (
    <div className="pb-20 md:pb-0">
      <header className="mb-xl">
        <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface">Estadísticas</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-xs">Análisis de satisfacción por rango de fechas</p>
      </header>

      {/* Filters */}
      <div className="bg-surface border border-outline-variant rounded-xl p-lg mb-xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
          <div>
            <label className="block font-body-sm text-body-sm text-on-surface-variant mb-xs">Fecha inicio</label>
            <input
              type="date"
              value={dateStart}
              onChange={e => setDateStart(e.target.value)}
              className="w-full border border-outline-variant rounded-xl px-md py-2 bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block font-body-sm text-body-sm text-on-surface-variant mb-xs">Fecha fin</label>
            <input
              type="date"
              value={dateEnd}
              onChange={e => setDateEnd(e.target.value)}
              className="w-full border border-outline-variant rounded-xl px-md py-2 bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary"
            />
          </div>
          {courses.length > 1 && (
          <div>
            <label className="block font-body-sm text-body-sm text-on-surface-variant mb-xs">Curso</label>
            <div className="relative">
              <select
                value={selectedCourse}
                onChange={e => setSelectedCourse(e.target.value)}
                className="w-full border border-outline-variant rounded-xl px-md py-2 bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary appearance-none pr-10"
              >
                <option value="all">Todos los cursos</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-lg">
                filter_list
              </span>
            </div>
          </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="p-lg font-body-md text-body-md text-on-surface-variant">Cargando estadísticas...</div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-lg mb-xl">
            <div className="bg-surface border border-outline-variant rounded-xl p-lg">
              <div className="flex items-center gap-sm mb-sm">
                <span className="material-symbols-outlined text-primary">assessment</span>
                <h3 className="font-label-md text-label-md text-on-surface-variant">Total Evaluaciones</h3>
              </div>
              <p className="font-headline-lg text-headline-lg text-primary font-bold">{totalEvaluaciones}</p>
            </div>
            <div className="bg-surface border border-outline-variant rounded-xl p-lg">
              <div className="flex items-center gap-sm mb-sm">
                <span className="material-symbols-outlined text-primary">trending_up</span>
                <h3 className="font-label-md text-label-md text-on-surface-variant">Promedio</h3>
              </div>
              <p className="font-headline-lg text-headline-lg text-primary font-bold">{avgScore.toFixed(1)}</p>
            </div>
            <div className="bg-surface border border-outline-variant rounded-xl p-lg">
              <div className="flex items-center gap-sm mb-sm">
                <span className="material-symbols-outlined text-primary">emoji_emotions</span>
                <h3 className="font-label-md text-label-md text-on-surface-variant">Nivel</h3>
              </div>
              <p className={`font-headline-lg text-headline-lg font-bold ${nivelColor}`}>{nivelLabel}</p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg mb-xl">
            <div className="bg-surface border border-outline-variant rounded-xl p-lg">
              <h3 className="font-headline-sm text-headline-sm text-on-surface mb-lg">Distribución de Puntuaciones</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={scoreDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5bdbb" />
                  <XAxis dataKey="score" stroke="#5c403f" />
                  <YAxis stroke="#5c403f" />
                  <Tooltip formatter={(value: number) => [value, 'Cant']} />
                  <Bar dataKey="count" fill="#9e001f" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-surface border border-outline-variant rounded-xl p-lg overflow-hidden">
              <h3 className="font-headline-sm text-headline-sm text-on-surface mb-lg">Distribución por Categorías</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    innerRadius={40}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    <Cell fill="#2e7d32" />
                    <Cell fill="#f9a825" />
                    <Cell fill="#c62828" />
                  </Pie>
                  <Tooltip />
                  <Legend
                    formatter={(value: string) => value}
                    iconType="circle"
                    wrapperStyle={{ fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Session Breakdown */}
          {sessionStats.length > 0 && (
            <div className="bg-surface border border-outline-variant rounded-xl p-lg mb-xl">
              <h3 className="font-headline-sm text-headline-sm text-on-surface mb-lg">Desglose por Curso</h3>
              <div className="space-y-sm md:space-y-0">
                {/* Desktop table */}
                <table className="w-full hidden md:table">
                  <thead>
                    <tr className="border-b border-outline-variant">
                      <th className="text-left font-body-sm text-body-sm text-on-surface-variant pb-sm pr-md">Curso</th>
                      <th className="text-left font-body-sm text-body-sm text-on-surface-variant pb-sm pr-md">Período</th>
                      <th className="text-right font-body-sm text-body-sm text-on-surface-variant pb-sm pr-md">Evaluaciones</th>
                      <th className="text-right font-body-sm text-body-sm text-on-surface-variant pb-sm">Promedio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessionStats.map(s => (
                      <tr key={s.id} className="border-b border-outline-variant last:border-0">
                        <td className="py-sm pr-md font-body-sm text-body-sm text-on-surface font-medium truncate max-w-[200px]">{s.courseName}</td>
                        <td className="py-sm pr-md font-body-sm text-body-sm text-on-surface-variant">{s.dateRange}</td>
                        <td className="py-sm pr-md font-body-md text-body-md text-on-surface text-right">{s.count}</td>
                        <td className="py-sm font-body-md text-body-md text-on-surface text-right font-semibold">{s.avg.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {/* Mobile cards */}
                <div className="md:hidden space-y-sm">
                  {sessionStats.map(s => (
                    <div key={s.id} className="border border-outline-variant rounded-xl p-md">
                      <p className="font-body-sm text-body-sm text-on-surface font-medium truncate">{s.courseName}</p>
                      <div className="flex justify-between items-center mt-xs">
                        <span className="font-body-xs text-body-xs text-on-surface-variant">{s.dateRange}</span>
                        <div className="flex gap-md">
                          <span className="font-body-xs text-body-xs text-on-surface-variant">{s.count} eval.</span>
                          <span className="font-body-xs text-body-xs text-on-surface font-semibold">Prom: {s.avg.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Comments / Suggestions Tabs */}
          <div className="bg-surface border border-outline-variant rounded-xl p-lg">
            <div className="flex gap-sm mb-lg flex-wrap justify-center">
              <button
                title="Resumen"
                onClick={() => setActiveTab('overview')}
                className={`flex items-center gap-xs px-md py-2 rounded-xl font-body-sm text-body-sm transition-colors ${
                  activeTab === 'overview'
                    ? 'bg-primary-container text-on-primary-container font-bold'
                    : 'text-on-surface-variant hover:bg-secondary-container'
                }`}
              >
                <span className="material-symbols-outlined text-lg">summarize</span>
                <span className="hidden sm:inline">Resumen</span>
              </button>
              <button
                title="Comentarios"
                onClick={() => setActiveTab('comments')}
                className={`flex items-center gap-xs px-md py-2 rounded-xl font-body-sm text-body-sm transition-colors ${
                  activeTab === 'comments'
                    ? 'bg-primary-container text-on-primary-container font-bold'
                    : 'text-on-surface-variant hover:bg-secondary-container'
                }`}
              >
                <span className="material-symbols-outlined text-lg">comment</span>
                <span className="hidden sm:inline">Comentarios</span>
              </button>
              <button
                title="Sugerencias"
                onClick={() => setActiveTab('suggestions')}
                className={`flex items-center gap-xs px-md py-2 rounded-xl font-body-sm text-body-sm transition-colors ${
                  activeTab === 'suggestions'
                    ? 'bg-primary-container text-on-primary-container font-bold'
                    : 'text-on-surface-variant hover:bg-secondary-container'
                }`}
              >
                <span className="material-symbols-outlined text-lg">lightbulb</span>
                <span className="hidden sm:inline">Sugerencias</span>
              </button>
            </div>

            {activeTab === 'overview' && (
              <div className="space-y-md">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
                  <div className="bg-surface-container-low rounded-xl p-md text-center">
                    <p className="font-headline-sm text-headline-sm text-primary">{totalEvaluaciones}</p>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-xs">Total evaluaciones</p>
                  </div>
                  <div className="bg-surface-container-low rounded-xl p-md text-center">
                    <p className="font-headline-sm text-headline-sm text-primary">{avgScore.toFixed(1)}</p>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-xs">Promedio general</p>
                  </div>
                  <div className="bg-surface-container-low rounded-xl p-md text-center">
                    <p className={`font-headline-sm text-headline-sm ${nivelColor}`}>{nivelLabel}</p>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-xs">Nivel de satisfacción</p>
                  </div>
                </div>
                {sessionStats.length > 0 && (
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    {sessionStats.length} curso{sessionStats.length !== 1 ? 's' : ''} con evaluaciones en el rango seleccionado.
                  </p>
                )}
              </div>
            )}

            {activeTab === 'comments' && (
              <div className="space-y-md">
                {commentsWithSession.length === 0 ? (
                  <p className="font-body-md text-body-md text-on-surface-variant">No hay comentarios disponibles.</p>
                ) : (
                  commentsWithSession.map(item => (
                    <div key={item.id} className="border-l-[3px] border-primary pl-md py-sm overflow-hidden">
                      <div className="flex items-center gap-sm mb-xs flex-wrap">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary text-on-primary font-body-sm text-body-sm font-bold shrink-0">
                          {item.score}
                        </span>
                        <span className="font-body-sm text-body-sm text-on-surface font-medium truncate">{item.sessionTitle}</span>
                      </div>
                      <p className="font-body-md text-body-md text-on-surface break-words">{item.text}</p>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'suggestions' && (
              <div className="space-y-md">
                {suggestionsWithSession.length === 0 ? (
                  <p className="font-body-md text-body-md text-on-surface-variant">No hay sugerencias disponibles.</p>
                ) : (
                  suggestionsWithSession.map(item => (
                    <div key={item.id} className="border-l-[3px] border-tertiary pl-md py-sm overflow-hidden">
                      <div className="flex items-center gap-sm mb-xs flex-wrap">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary text-on-primary font-body-sm text-body-sm font-bold shrink-0">
                          {item.score}
                        </span>
                        <span className="font-body-sm text-body-sm text-on-surface font-medium truncate">{item.sessionTitle}</span>
                      </div>
                      <p className="font-body-md text-body-md text-on-surface break-words">{item.text}</p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default StatisticsPage
