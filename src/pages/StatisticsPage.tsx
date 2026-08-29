import { useState, useEffect, useMemo, useRef } from 'react'
import { insforge } from '../lib/insforge'
import { useAuth } from '../hooks/useAuth'
import { useImpersonation } from '../hooks/useImpersonation'
import { useRatingVotes } from '../hooks/useRatingVotes'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

interface Course {
  id: string
  name: string
  description: string
  created_by: string
  created_at: string
  is_active: boolean
}

interface Profile {
  id: string
  user_id: string
  name: string
  role: string
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
  studentId: string
  sessionTitle: string
  date: string
  score: number
  text: string
  createdAt: string
}

interface Reply {
  id: string
  rating_id: string
  user_id: string
  content: string
  created_at: string
  user_name: string
}

function getDefaultDateStart(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getDefaultDateEnd(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function StatisticsPage() {
  const { profile } = useAuth()
  const { impersonatedRole, isImpersonating } = useImpersonation()
  const effectiveRole = isImpersonating && impersonatedRole ? impersonatedRole : profile?.role
  const [courses, setCourses] = useState<Course[]>([])
  const [teachers, setTeachers] = useState<Profile[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [ratings, setRatings] = useState<Rating[]>([])
  const [loading, setLoading] = useState(true)
  const [coursesLoading, setCoursesLoading] = useState(true)

  const [dateStart, setDateStart] = useState(getDefaultDateStart)
  const [dateEnd, setDateEnd] = useState(getDefaultDateEnd)
  const [selectedCourse, setSelectedCourse] = useState('all')
  const [selectedTeacher, setSelectedTeacher] = useState('all')
  const [teacherSearch, setTeacherSearch] = useState('')
  const [teacherDropdownOpen, setTeacherDropdownOpen] = useState(false)
  const teacherRef = useRef<HTMLDivElement>(null)
  const [courseDropdownOpen, setCourseDropdownOpen] = useState(false)
  const [courseSearch, setCourseSearch] = useState('')
  const courseRef = useRef<HTMLDivElement>(null)

  const [activeTab, setActiveTab] = useState<'overview' | 'comments' | 'suggestions'>('overview')

  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editingCommentText, setEditingCommentText] = useState('')
  const [editingSuggestionId, setEditingSuggestionId] = useState<string | null>(null)
  const [editingSuggestionText, setEditingSuggestionText] = useState('')

  const [repliesMap, setRepliesMap] = useState<Record<string, Reply[]>>({})
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [editingReply, setEditingReply] = useState<string | null>(null)
  const [editReplyText, setEditReplyText] = useState('')

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const { voteCounts, userVotes, fetchVotes, vote } = useRatingVotes()

  useEffect(() => {
    if (effectiveRole === 'student' && courses.length === 1) {
      setSelectedCourse(courses[0].id)
    }
  }, [courses, profile])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (teacherRef.current && !teacherRef.current.contains(e.target as Node)) {
        setTeacherDropdownOpen(false)
      }
      if (courseRef.current && !courseRef.current.contains(e.target as Node)) {
        setCourseDropdownOpen(false)
        const course = courses.find(c => c.id === selectedCourse)
        setCourseSearch(course?.name || '')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [courses, selectedCourse])

  useEffect(() => {
    async function fetchCourses() {
      if (!profile) return
      setCoursesLoading(true)
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
      setCoursesLoading(false)
    }
    fetchCourses()
  }, [profile])

  useEffect(() => {
    async function fetchTeachers() {
      if (!profile || profile.role !== 'admin') return
      const { data } = await insforge.database
        .from('profiles')
        .select('id, user_id, name, role')
        .eq('role', 'teacher')
        .order('name')
      if (data) setTeachers(data as Profile[])
    }
    fetchTeachers()
  }, [profile])

  useEffect(() => {
    let cancelled = false

    async function fetchData() {
      setLoading(true)

      let courseIds: string[] | null = null

      if (selectedTeacher !== 'all') {
        const { data: teacherCourses } = await insforge.database
          .from('courses')
          .select('id')
          .eq('created_by', selectedTeacher)
        courseIds = (teacherCourses as { id: string }[] || []).map(c => c.id)
      }

      let sessionQuery = insforge.database
        .from('sessions')
        .select('id, course_id, title, date')

      if (selectedCourse !== 'all') {
        sessionQuery = sessionQuery.eq('course_id', selectedCourse)
      } else if (courseIds && courseIds.length > 0) {
        sessionQuery = sessionQuery.in('course_id', courseIds)
      } else if (effectiveRole !== 'admin' && courses.length > 0) {
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

      const ratingIds = (ratingsData as Rating[] || []).map(r => r.id)
      fetchVotes(ratingIds)

      if (ratingIds.length > 0) {
        const { data: repliesData } = await insforge.database
          .from('comment_replies')
          .select('*')
          .in('rating_id', ratingIds)

        if (cancelled) return

        const userIds = [...new Set((repliesData || []).map(r => r.user_id))]
        let userNames: Record<string, string> = {}
        if (userIds.length > 0) {
          const { data: profilesData } = await insforge.database
            .from('profiles')
            .select('user_id, name')
            .in('user_id', userIds)
          for (const p of (profilesData || []) as { user_id: string; name: string }[]) {
            userNames[p.user_id] = p.name
          }
        }

        const newRepliesMap: Record<string, Reply[]> = {}
        for (const reply of repliesData || []) {
          if (!newRepliesMap[reply.rating_id]) {
            newRepliesMap[reply.rating_id] = []
          }
          newRepliesMap[reply.rating_id].push({
            ...reply,
            user_name: userNames[reply.user_id] || 'Usuario'
          })
        }
        setRepliesMap(newRepliesMap)
      }
    }

    fetchData()
    return () => { cancelled = true }
  }, [dateStart, dateEnd, selectedCourse, selectedTeacher, courses, profile])

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
    const [yS, mS, dS] = dateStart.split('-').map(Number)
    const [yE, mE, dE] = dateEnd.split('-').map(Number)
    const dStart = `${String(dS).padStart(2, '0')}/${String(mS).padStart(2, '0')}/${yS}`
    const dEnd = `${String(dE).padStart(2, '0')}/${String(mE).padStart(2, '0')}/${yE}`
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
          studentId: r.student_id,
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
          studentId: r.student_id,
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

  const canEdit = (studentId: string) => {
    if (effectiveRole === 'admin') return true
    if (effectiveRole === 'teacher') return true
    return profile?.user_id === studentId
  }

  const handleSaveComment = async (ratingId: string) => {
    const { error } = await insforge.database
      .from('ratings')
      .update({ comment: editingCommentText })
      .eq('id', ratingId)

    if (error) {
      showToast('No se pudo guardar el comentario', 'error')
    } else {
      setRatings(prev => prev.map(r => r.id === ratingId ? { ...r, comment: editingCommentText } : r))
      setEditingCommentId(null)
      setEditingCommentText('')
      showToast('Comentario guardado')
    }
  }

  const handleDeleteComment = async (ratingId: string) => {
    if (!confirm('¿Eliminar este comentario?')) return
    const { error } = await insforge.database
      .from('ratings')
      .update({ comment: '' })
      .eq('id', ratingId)

    if (error) {
      showToast('No se pudo eliminar el comentario', 'error')
    } else {
      setRatings(prev => prev.map(r => r.id === ratingId ? { ...r, comment: '' } : r))
      showToast('Comentario eliminado')
    }
  }

  const handleSaveSuggestion = async (ratingId: string) => {
    const { error } = await insforge.database
      .from('ratings')
      .update({ suggestion: editingSuggestionText })
      .eq('id', ratingId)

    if (error) {
      showToast('No se pudo guardar la sugerencia', 'error')
    } else {
      setRatings(prev => prev.map(r => r.id === ratingId ? { ...r, suggestion: editingSuggestionText } : r))
      setEditingSuggestionId(null)
      setEditingSuggestionText('')
      showToast('Sugerencia guardada')
    }
  }

  const handleDeleteSuggestion = async (ratingId: string) => {
    if (!confirm('¿Eliminar esta sugerencia?')) return
    const { error } = await insforge.database
      .from('ratings')
      .update({ suggestion: '' })
      .eq('id', ratingId)

    if (error) {
      showToast('No se pudo eliminar la sugerencia', 'error')
    } else {
      setRatings(prev => prev.map(r => r.id === ratingId ? { ...r, suggestion: '' } : r))
      showToast('Sugerencia eliminada')
    }
  }

  const addReply = async (ratingId: string) => {
    if (!profile || !replyText.trim()) return

    const content = replyText.trim()
    const tempId = `temp-${Date.now()}`
    const userName = profile.name || 'Tú'

    setRepliesMap(prev => ({
      ...prev,
      [ratingId]: [
        ...(prev[ratingId] || []),
        { id: tempId, rating_id: ratingId, user_id: profile.user_id, content, created_at: new Date().toISOString(), user_name: userName }
      ]
    }))
    setReplyText('')
    setReplyingTo(null)

    const { data, error } = await insforge.database
      .from('comment_replies')
      .insert([{ rating_id: ratingId, user_id: profile.user_id, content }])
      .select('id, created_at')
      .single()

    if (error) {
      setRepliesMap(prev => ({
        ...prev,
        [ratingId]: (prev[ratingId] || []).filter(r => r.id !== tempId)
      }))
      showToast('No se pudo enviar la respuesta', 'error')
    } else {
      setRepliesMap(prev => ({
        ...prev,
        [ratingId]: (prev[ratingId] || []).map(r =>
          r.id === tempId ? { ...r, id: data.id, created_at: data.created_at } : r
        )
      }))
      showToast('Respuesta enviada')
    }
  }

  const updateReply = async (replyId: string, ratingId: string) => {
    const { error } = await insforge.database
      .from('comment_replies')
      .update({ content: editReplyText })
      .eq('id', replyId)

    if (error) {
      showToast('No se pudo editar la respuesta', 'error')
    } else {
      setRepliesMap(prev => ({
        ...prev,
        [ratingId]: (prev[ratingId] || []).map(r => r.id === replyId ? { ...r, content: editReplyText } : r)
      }))
      setEditingReply(null)
      showToast('Respuesta editada')
    }
  }

  const deleteReply = async (replyId: string, ratingId: string) => {
    const { error } = await insforge.database
      .from('comment_replies')
      .delete()
      .eq('id', replyId)

    if (error) {
      showToast('No se pudo eliminar la respuesta', 'error')
    } else {
      setRepliesMap(prev => ({
        ...prev,
        [ratingId]: (prev[ratingId] || []).filter(r => r.id !== replyId)
      }))
      showToast('Respuesta eliminada')
    }
  }

  return (
    <div className="pb-20 md:pb-xl w-full max-w-full overflow-x-hidden">
      <header className="mb-xl">
        <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary font-bold">Estadísticas</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-xs">Visualiza gráficos de calificaciones, comenta y responde a los comentarios de los estudiantes.</p>
      </header>

      {/* Filters */}
      <div className="bg-surface border border-outline-variant rounded-xl p-lg mb-xl">
        <div className="flex flex-col md:flex-row gap-lg items-end">
          <div className="w-full md:w-auto">
            <label htmlFor="date-start" className="block font-body-sm text-body-sm text-on-surface-variant mb-xs">Inicio</label>
            <input
              id="date-start"
              name="dateStart"
              type="date"
              value={dateStart}
              onChange={e => setDateStart(e.target.value)}
              className="w-full border border-outline-variant rounded-xl px-md py-2 bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary"
            />
          </div>
          <div className="w-full md:w-auto">
            <label htmlFor="date-end" className="block font-body-sm text-body-sm text-on-surface-variant mb-xs">Fin</label>
            <input
              id="date-end"
              name="dateEnd"
              type="date"
              value={dateEnd}
              onChange={e => setDateEnd(e.target.value)}
              className="w-full border border-outline-variant rounded-xl px-md py-2 bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary"
            />
          </div>
          {effectiveRole === 'admin' && teachers.length > 0 && (
          <div className="w-full md:w-auto" ref={teacherRef}>
            <label htmlFor="teacher-search" className="block font-body-sm text-body-sm text-on-surface-variant mb-xs">Docente</label>
            <div className="relative">
              <input
                id="teacher-search"
                name="teacherSearch"
                type="text"
                value={teacherSearch}
                onChange={e => { setTeacherSearch(e.target.value); setTeacherDropdownOpen(true) }}
                onFocus={() => setTeacherDropdownOpen(true)}
                placeholder="Buscar..."
                className="w-full border border-outline-variant rounded-xl px-md py-2 bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary pr-10 truncate"
              />
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-lg">
                search
              </span>
              {teacherDropdownOpen && (
                <div className="absolute z-50 left-0 right-0 mt-1 bg-surface border border-outline-variant rounded-xl shadow-lg max-h-60 overflow-y-auto">
                  <button
                    onClick={() => { setSelectedTeacher('all'); setTeacherSearch(''); setTeacherDropdownOpen(false) }}
                    className={`w-full text-left px-md py-2 font-body-sm text-body-sm hover:bg-secondary-container transition-colors truncate ${
                      selectedTeacher === 'all' ? 'bg-primary-container text-on-primary-container font-bold' : 'text-on-surface'
                    }`}
                  >
                    Todos los docentes
                  </button>
                  {teachers
                    .filter(t => t.name.toLowerCase().includes(teacherSearch.toLowerCase()))
                    .map(t => (
                      <button
                        key={t.user_id}
                        onClick={() => { setSelectedTeacher(t.user_id); setTeacherSearch(t.name); setTeacherDropdownOpen(false); setSelectedCourse('all') }}
                        className={`w-full text-left px-md py-2 font-body-sm text-body-sm hover:bg-secondary-container transition-colors truncate ${
                          selectedTeacher === t.user_id ? 'bg-primary-container text-on-primary-container font-bold' : 'text-on-surface'
                        }`}
                      >
                        {t.name}
                      </button>
                    ))
                  }
                  {teachers.filter(t => t.name.toLowerCase().includes(teacherSearch.toLowerCase())).length === 0 && (
                    <div className="px-md py-2 font-body-sm text-body-sm text-on-surface-variant">No se encontraron docentes</div>
                  )}
                </div>
              )}
            </div>
          </div>
          )}
          {courses.length > 1 && (
          <div className="w-full md:w-auto" ref={courseRef}>
            <label className="block font-body-sm text-body-sm text-on-surface-variant mb-xs">Curso</label>
            <div className="relative">
              <input
                type="text"
                value={courseSearch}
                onChange={e => { setCourseSearch(e.target.value); setCourseDropdownOpen(true) }}
                onFocus={() => setCourseDropdownOpen(true)}
                placeholder={selectedCourse === 'all' ? 'Buscar...' : courses.find(c => c.id === selectedCourse)?.name || 'Buscar...'}
                className="w-full border border-outline-variant rounded-xl px-md py-2 bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary pr-10 truncate"
              />
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-lg">
                search
              </span>
              {courseDropdownOpen && (
                <div className="absolute z-50 left-0 right-0 mt-1 bg-surface border border-outline-variant rounded-xl shadow-lg max-h-60 overflow-y-auto">
                  <button
                    onClick={() => { setSelectedCourse('all'); setCourseSearch(''); setCourseDropdownOpen(false) }}
                    className={`w-full text-left px-md py-2 font-body-sm text-body-sm hover:bg-secondary-container transition-colors truncate ${
                      selectedCourse === 'all' ? 'bg-primary-container text-on-primary-container font-bold' : 'text-on-surface'
                    }`}
                  >
                    Todos los cursos
                  </button>
                  {courses
                    .filter(c => c.name.toLowerCase().includes(courseSearch.toLowerCase()))
                    .map(c => (
                      <button
                        key={c.id}
                        onClick={() => { setSelectedCourse(c.id); setCourseSearch(c.name); setCourseDropdownOpen(false) }}
                        className={`w-full text-left px-md py-2 font-body-sm text-body-sm hover:bg-secondary-container transition-colors truncate ${
                          selectedCourse === c.id ? 'bg-primary-container text-on-primary-container font-bold' : 'text-on-surface'
                        }`}
                      >
                        {c.name}
                      </button>
                    ))
                  }
                  {courses.filter(c => c.name.toLowerCase().includes(courseSearch.toLowerCase())).length === 0 && (
                    <div className="px-md py-2 font-body-sm text-body-sm text-on-surface-variant">No se encontraron cursos</div>
                  )}
                </div>
              )}
            </div>
          </div>
          )}
        </div>
      </div>

      {coursesLoading ? (
        <div className="space-y-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-surface border border-outline-variant rounded-xl p-lg flex flex-col items-center text-center">
                <div className="h-8 w-16 bg-surface-container animate-pulse rounded mb-sm" />
                <div className="h-4 w-32 bg-surface-container animate-pulse rounded" />
              </div>
            ))}
          </div>
          <div className="bg-surface border border-outline-variant rounded-xl p-lg">
            <div className="h-6 w-48 bg-surface-container animate-pulse rounded mb-lg" />
            <div className="h-[300px] bg-surface-container animate-pulse rounded-xl" />
          </div>
        </div>
      ) : courses.length === 0 ? (
        <div className="bg-surface border border-outline-variant rounded-xl p-xl text-center">
          <span className="material-symbols-outlined text-on-surface-variant text-[48px] mb-md block">school</span>
          <p className="font-body-md text-body-md text-on-surface-variant">
            {effectiveRole === 'student' ? 'No estás inscrito en ningún curso.' : 'No hay cursos disponibles.'}
          </p>
        </div>
      ) : loading ? (
        <div className="space-y-lg">
          {/* Skeleton Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-surface border border-outline-variant rounded-xl p-lg flex flex-col items-center text-center">
                <div className="h-8 w-16 bg-surface-container animate-pulse rounded mb-sm" />
                <div className="h-4 w-32 bg-surface-container animate-pulse rounded" />
              </div>
            ))}
          </div>
          {/* Skeleton Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
            <div className="bg-surface border border-outline-variant rounded-xl p-lg">
              <div className="h-5 w-48 bg-surface-container animate-pulse rounded mb-lg" />
              <div className="h-[300px] bg-surface-container animate-pulse rounded-xl" />
            </div>
            <div className="bg-surface border border-outline-variant rounded-xl p-lg">
              <div className="h-5 w-48 bg-surface-container animate-pulse rounded mb-lg" />
              <div className="h-[300px] bg-surface-container animate-pulse rounded-xl" />
            </div>
          </div>
          {/* Skeleton Table */}
          <div className="bg-surface border border-outline-variant rounded-xl p-lg">
            <div className="h-5 w-40 bg-surface-container animate-pulse rounded mb-lg" />
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-lg py-sm border-b border-outline-variant last:border-0">
                <div className="h-4 flex-1 bg-surface-container animate-pulse rounded" />
                <div className="h-4 w-24 bg-surface-container animate-pulse rounded" />
                <div className="h-4 w-16 bg-surface-container animate-pulse rounded" />
                <div className="h-4 w-16 bg-surface-container animate-pulse rounded" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-lg mb-xl">
            <div className="bg-surface border border-outline-variant rounded-xl p-lg flex flex-col items-center text-center">
              <p className="font-headline-lg text-headline-lg text-primary font-bold">{totalEvaluaciones}</p>
              <div className="flex items-center gap-xs mt-xs">
                <span className="material-symbols-outlined text-primary text-base">assessment</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">Total de evaluaciones</span>
              </div>
            </div>
            <div className="bg-surface border border-outline-variant rounded-xl p-lg flex flex-col items-center text-center">
              <p className="font-headline-lg text-headline-lg text-primary font-bold">{avgScore.toFixed(1)}</p>
              <div className="flex items-center gap-xs mt-xs">
                <span className="material-symbols-outlined text-primary text-base">trending_up</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">Promedio general</span>
              </div>
            </div>
            <div className="bg-surface border border-outline-variant rounded-xl p-lg flex flex-col items-center text-center">
              <p className={`font-headline-lg text-headline-lg font-bold ${nivelColor}`}>{nivelLabel}</p>
              <div className="flex items-center gap-xs mt-xs">
                <span className="material-symbols-outlined text-primary text-base">emoji_emotions</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">Nivel de satisfacción</span>
              </div>
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
            <div className="bg-surface border border-outline-variant rounded-xl p-lg mb-xl overflow-hidden">
              <h3 className="font-headline-sm text-headline-sm text-on-surface mb-lg">Desglose por Curso</h3>
              <div className="space-y-sm md:space-y-0 overflow-x-auto">
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
                <div className="md:hidden space-y-md">
                  {sessionStats.map(s => (
                    <div key={s.id} className="border border-outline-variant rounded-xl p-md">
                      <p className="font-body-md text-body-md text-on-surface font-medium mb-sm text-center">{s.courseName}</p>
                      <div className="space-y-sm">
                        <div className="flex justify-between items-center px-sm">
                          <span className="font-body-sm text-body-sm text-on-surface-variant">Período</span>
                          <span className="font-body-sm text-sm text-primary font-bold">{s.dateRange}</span>
                        </div>
                        <div className="flex justify-between items-center px-sm">
                          <span className="font-body-sm text-body-sm text-on-surface-variant">Evaluaciones</span>
                          <span className="font-headline-sm text-headline-sm text-primary font-bold">{s.count}</span>
                        </div>
                        <div className="flex justify-between items-center px-sm">
                          <span className="font-body-sm text-body-sm text-on-surface-variant">Promedio</span>
                          <span className="font-headline-sm text-headline-sm text-primary font-bold">{s.avg.toFixed(1)}</span>
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
                        {canEdit(item.studentId) && (
                          <div className="ml-auto flex gap-sm shrink-0">
                            {editingCommentId === item.id ? (
                              <>
                                <button
                                  onClick={() => handleSaveComment(item.id)}
                                  className="w-8 h-8 flex items-center justify-center rounded-full bg-primary text-on-primary transition-colors"
                                  title="Guardar"
                                >
                                  <span className="material-symbols-outlined text-base">check</span>
                                </button>
                                <button
                                  onClick={() => { setEditingCommentId(null); setEditingCommentText('') }}
                                  className="w-8 h-8 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-secondary-container transition-colors"
                                  title="Cancelar"
                                >
                                  <span className="material-symbols-outlined text-base">close</span>
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => { setEditingCommentId(item.id); setEditingCommentText(item.text) }}
                                  className="w-8 h-8 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-secondary-container transition-colors"
                                  title="Editar"
                                >
                                  <span className="material-symbols-outlined text-base">edit</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteComment(item.id)}
                                  className="w-8 h-8 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-error-container hover:text-error transition-colors"
                                  title="Eliminar"
                                >
                                  <span className="material-symbols-outlined text-base">delete</span>
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                      {editingCommentId === item.id ? (
                        <textarea
                          id="edit-comment"
                          name="comment"
                          aria-label="Editar comentario"
                          value={editingCommentText}
                          onChange={e => setEditingCommentText(e.target.value)}
                          rows={3}
                          className="w-full border border-outline-variant rounded-xl px-md py-2 bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary resize-none mt-sm"
                        />
                      ) : (
                        <p className="font-body-md text-body-md text-on-surface break-words">{item.text}</p>
                      )}
                      <div className="flex items-center gap-md mt-sm">
                        <button
                          onClick={() => vote(item.id, 'like')}
                          className={`flex items-center gap-xs px-sm py-xs rounded-full font-label-sm text-label-sm transition-colors ${
                            userVotes[item.id] === 'like'
                              ? 'bg-primary-container text-on-primary-container'
                              : 'text-on-surface-variant hover:bg-secondary-container'
                          }`}
                        >
                          <span className="material-symbols-outlined text-xl" style={userVotes[item.id] === 'like' ? { fontVariationSettings: "'FILL' 1" } : undefined}>thumb_up</span>
                          <span>{voteCounts[item.id]?.likes || 0}</span>
                        </button>
                        <button
                          onClick={() => vote(item.id, 'dislike')}
                          className={`flex items-center gap-xs px-sm py-xs rounded-full font-label-sm text-label-sm transition-colors ${
                            userVotes[item.id] === 'dislike'
                              ? 'bg-error-container text-on-error-container'
                              : 'text-on-surface-variant hover:bg-secondary-container'
                          }`}
                        >
                          <span className="material-symbols-outlined text-xl" style={userVotes[item.id] === 'dislike' ? { fontVariationSettings: "'FILL' 1" } : undefined}>thumb_down</span>
                          <span>{voteCounts[item.id]?.dislikes || 0}</span>
                        </button>
                      </div>

                      {(repliesMap[item.id]?.length || 0) > 0 && (
                        <div className="mt-md space-y-sm border-t border-outline-variant pt-md">
                          {repliesMap[item.id]?.map(reply => (
                            <div key={reply.id} className="flex gap-sm items-start">
                              <span className="material-symbols-outlined text-sm text-on-surface-variant mt-[2px]">reply</span>
                              <div className="flex-1">
                                <div className="flex items-center gap-xs">
                                  <span className="font-label-sm text-label-sm text-on-surface font-semibold">{reply.user_name}</span>
                                  <span className="font-body-xs text-body-xs text-on-surface-variant">
                                    {new Date(reply.created_at).toLocaleDateString('es-ES')}
                                  </span>
                                  {canEdit(reply.user_id) && (
                                    <>
                                      <button
                                        onClick={() => { setEditingReply(reply.id); setEditReplyText(reply.content) }}
                                        className="p-[2px] rounded-full text-on-surface-variant hover:text-primary transition-colors"
                                      >
                                        <span className="material-symbols-outlined text-sm">edit</span>
                                      </button>
                                      <button
                                        onClick={() => deleteReply(reply.id, item.id)}
                                        className="p-[2px] rounded-full text-on-surface-variant hover:text-error transition-colors"
                                      >
                                        <span className="material-symbols-outlined text-sm">delete</span>
                                      </button>
                                    </>
                                  )}
                                </div>
                                {editingReply === reply.id ? (
                                  <div className="mt-xs flex flex-col gap-xs">
                                    <textarea
                                      value={editReplyText}
                                      onChange={e => setEditReplyText(e.target.value)}
                                      rows={2}
                                      className="w-full bg-surface-container-low rounded-xl px-md py-xs font-body-sm text-body-sm text-on-surface outline-none focus:ring-1 focus:ring-primary resize-none"
                                    />
                                    <div className="flex gap-xs justify-end">
                                      <button
                                        onClick={() => updateReply(reply.id, item.id)}
                                        className="px-sm py-[2px] rounded-full bg-primary text-on-primary font-label-xs text-label-xs"
                                      >
                                        Guardar
                                      </button>
                                      <button
                                        onClick={() => setEditingReply(null)}
                                        className="px-sm py-[2px] rounded-full bg-surface-container text-on-surface-variant font-label-xs text-label-xs"
                                      >
                                        Cancelar
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="font-body-sm text-body-sm text-primary font-bold">{reply.content}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {replyingTo === item.id ? (
                        <div className="mt-md flex flex-col gap-sm">
                          <textarea
                            value={replyText}
                            onChange={e => setReplyText(e.target.value)}
                            placeholder="Escribe una respuesta..."
                            rows={3}
                            autoFocus
                            className="w-full bg-surface-container-low rounded-xl px-md py-sm font-body-sm text-body-sm text-on-surface outline-none focus:ring-1 focus:ring-primary resize-none"
                          />
                          <div className="flex gap-sm justify-end">
                            <button
                              onClick={() => addReply(item.id)}
                              disabled={!replyText.trim()}
                              className="px-md py-xs rounded-full bg-primary text-on-primary font-label-sm text-label-sm disabled:opacity-50"
                            >
                              Enviar
                            </button>
                            <button
                              onClick={() => { setReplyingTo(null); setReplyText('') }}
                              className="px-md py-xs rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setReplyingTo(item.id)}
                          className="mt-md flex items-center gap-xs text-on-surface-variant hover:text-primary font-label-sm text-label-sm transition-colors"
                        >
                          <span className="material-symbols-outlined text-lg">chat_bubble_outline</span>
                          Responder
                        </button>
                      )}
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
                        {canEdit(item.studentId) && (
                          <div className="ml-auto flex gap-sm shrink-0">
                            {editingSuggestionId === item.id ? (
                              <>
                                <button
                                  onClick={() => handleSaveSuggestion(item.id)}
                                  className="w-8 h-8 flex items-center justify-center rounded-full bg-primary text-on-primary transition-colors"
                                  title="Guardar"
                                >
                                  <span className="material-symbols-outlined text-base">check</span>
                                </button>
                                <button
                                  onClick={() => { setEditingSuggestionId(null); setEditingSuggestionText('') }}
                                  className="w-8 h-8 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-secondary-container transition-colors"
                                  title="Cancelar"
                                >
                                  <span className="material-symbols-outlined text-base">close</span>
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => { setEditingSuggestionId(item.id); setEditingSuggestionText(item.text) }}
                                  className="w-8 h-8 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-secondary-container transition-colors"
                                  title="Editar"
                                >
                                  <span className="material-symbols-outlined text-base">edit</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteSuggestion(item.id)}
                                  className="w-8 h-8 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-error-container hover:text-error transition-colors"
                                  title="Eliminar"
                                >
                                  <span className="material-symbols-outlined text-base">delete</span>
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                      {editingSuggestionId === item.id ? (
                        <textarea
                          id="edit-suggestion"
                          name="suggestion"
                          aria-label="Editar sugerencia"
                          value={editingSuggestionText}
                          onChange={e => setEditingSuggestionText(e.target.value)}
                          rows={3}
                          className="w-full border border-outline-variant rounded-xl px-md py-2 bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary resize-none mt-sm"
                        />
                      ) : (
                        <p className="font-body-md text-body-md text-on-surface break-words">{item.text}</p>
                      )}
                      <div className="flex items-center gap-md mt-sm">
                        <button
                          onClick={() => vote(item.id, 'like')}
                          className={`flex items-center gap-xs px-sm py-xs rounded-full font-label-sm text-label-sm transition-colors ${
                            userVotes[item.id] === 'like'
                              ? 'bg-primary-container text-on-primary-container'
                              : 'text-on-surface-variant hover:bg-secondary-container'
                          }`}
                        >
                          <span className="material-symbols-outlined text-xl" style={userVotes[item.id] === 'like' ? { fontVariationSettings: "'FILL' 1" } : undefined}>thumb_up</span>
                          <span>{voteCounts[item.id]?.likes || 0}</span>
                        </button>
                        <button
                          onClick={() => vote(item.id, 'dislike')}
                          className={`flex items-center gap-xs px-sm py-xs rounded-full font-label-sm text-label-sm transition-colors ${
                            userVotes[item.id] === 'dislike'
                              ? 'bg-error-container text-on-error-container'
                              : 'text-on-surface-variant hover:bg-secondary-container'
                          }`}
                        >
                          <span className="material-symbols-outlined text-xl" style={userVotes[item.id] === 'dislike' ? { fontVariationSettings: "'FILL' 1" } : undefined}>thumb_down</span>
                          <span>{voteCounts[item.id]?.dislikes || 0}</span>
                        </button>
                      </div>

                      {(repliesMap[item.id]?.length || 0) > 0 && (
                        <div className="mt-md space-y-sm border-t border-outline-variant pt-md">
                          {repliesMap[item.id]?.map(reply => (
                            <div key={reply.id} className="flex gap-sm items-start">
                              <span className="material-symbols-outlined text-sm text-on-surface-variant mt-[2px]">reply</span>
                              <div className="flex-1">
                                <div className="flex items-center gap-xs">
                                  <span className="font-label-sm text-label-sm text-on-surface font-semibold">{reply.user_name}</span>
                                  <span className="font-body-xs text-body-xs text-on-surface-variant">
                                    {new Date(reply.created_at).toLocaleDateString('es-ES')}
                                  </span>
                                  {canEdit(reply.user_id) && (
                                    <>
                                      <button
                                        onClick={() => { setEditingReply(reply.id); setEditReplyText(reply.content) }}
                                        className="p-[2px] rounded-full text-on-surface-variant hover:text-primary transition-colors"
                                      >
                                        <span className="material-symbols-outlined text-sm">edit</span>
                                      </button>
                                      <button
                                        onClick={() => deleteReply(reply.id, item.id)}
                                        className="p-[2px] rounded-full text-on-surface-variant hover:text-error transition-colors"
                                      >
                                        <span className="material-symbols-outlined text-sm">delete</span>
                                      </button>
                                    </>
                                  )}
                                </div>
                                {editingReply === reply.id ? (
                                  <div className="mt-xs flex flex-col gap-xs">
                                    <textarea
                                      value={editReplyText}
                                      onChange={e => setEditReplyText(e.target.value)}
                                      rows={2}
                                      className="w-full bg-surface-container-low rounded-xl px-md py-xs font-body-sm text-body-sm text-on-surface outline-none focus:ring-1 focus:ring-primary resize-none"
                                    />
                                    <div className="flex gap-xs justify-end">
                                      <button
                                        onClick={() => updateReply(reply.id, item.id)}
                                        className="px-sm py-[2px] rounded-full bg-primary text-on-primary font-label-xs text-label-xs"
                                      >
                                        Guardar
                                      </button>
                                      <button
                                        onClick={() => setEditingReply(null)}
                                        className="px-sm py-[2px] rounded-full bg-surface-container text-on-surface-variant font-label-xs text-label-xs"
                                      >
                                        Cancelar
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="font-body-sm text-body-sm text-primary font-bold">{reply.content}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {replyingTo === item.id ? (
                        <div className="mt-md flex flex-col gap-sm">
                          <textarea
                            value={replyText}
                            onChange={e => setReplyText(e.target.value)}
                            placeholder="Escribe una respuesta..."
                            rows={3}
                            autoFocus
                            className="w-full bg-surface-container-low rounded-xl px-md py-sm font-body-sm text-body-sm text-on-surface outline-none focus:ring-1 focus:ring-primary resize-none"
                          />
                          <div className="flex gap-sm justify-end">
                            <button
                              onClick={() => addReply(item.id)}
                              disabled={!replyText.trim()}
                              className="px-md py-xs rounded-full bg-primary text-on-primary font-label-sm text-label-sm disabled:opacity-50"
                            >
                              Enviar
                            </button>
                            <button
                              onClick={() => { setReplyingTo(null); setReplyText('') }}
                              className="px-md py-xs rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setReplyingTo(item.id)}
                          className="mt-md flex items-center gap-xs text-on-surface-variant hover:text-primary font-label-sm text-label-sm transition-colors"
                        >
                          <span className="material-symbols-outlined text-lg">chat_bubble_outline</span>
                          Responder
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </>
      )}

      {toast && (
        <div className={`fixed bottom-20 md:bottom-lg left-1/2 -translate-x-1/2 z-50 max-w-[calc(100vw-2rem)] px-lg py-sm rounded-xl border shadow-lg font-body-sm text-body-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis transition-all ${
          toast.type === 'success' ? 'bg-success-container text-on-success-container' : 'bg-error-container text-on-error-container'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  )
}

export default StatisticsPage
