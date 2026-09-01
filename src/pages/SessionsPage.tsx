import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { insforge } from '../lib/insforge'
import { useAuth } from '../hooks/useAuth'
import { useImpersonation } from '../hooks/useImpersonation'
import { Pagination, usePagination } from '../components/Pagination'

interface Course {
  id: string
  name: string
  description: string
}

interface Session {
  id: string
  course_id: string
  title: string
  date: string
  created_by: string
  created_at: string
}

function getWeekRange(date: Date): { start: Date; end: Date } {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const start = new Date(d)
  start.setDate(diff)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

function categorizeSession(session: Session, now: Date): 'current' | 'past' | 'future' {
  const sessionDate = new Date(session.date + 'T12:00:00')
  const { start, end } = getWeekRange(now)
  if (sessionDate >= start && sessionDate <= end) return 'current'
  if (sessionDate < start) return 'past'
  return 'future'
}

function isSessionToday(session: Session): boolean {
  const today = new Date()
  const todayStr = today.getFullYear() + '-' +
    String(today.getMonth() + 1).padStart(2, '0') + '-' +
    String(today.getDate()).padStart(2, '0')
  return session.date === todayStr
}

function SessionRow({ session, index, profile, onEdit, onDelete }: {
  session: Session
  index: number
  profile: { user_id: string; role: string } | null
  onEdit: (s: Session) => void
  onDelete: (id: string) => void
}) {
  const canRate = isSessionToday(session) || profile?.role === 'admin'
  return (
    <>
      {/* Desktop */}
      <tr className="border-b border-outline-variant last:border-0 hover:bg-surface-container-low transition-colors">
        <td className="px-md py-sm font-body-sm text-body-sm text-on-surface-variant">{index + 1}</td>
        <td className="px-md py-sm font-body-sm text-body-sm text-on-surface-variant">
          {new Date(session.date + 'T12:00:00').toLocaleDateString('es-ES', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          })}
        </td>
        <td className="px-md py-sm">
          <div className="flex gap-sm justify-end">
            <Link
              to={`/sessions/${session.id}`}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-surface-container text-on-surface-variant hover:bg-secondary-container transition-colors"
              title="Detalles"
            >
              <span className="material-symbols-outlined text-xl">visibility</span>
            </Link>
            {canRate ? (
              <Link
                to={`/sessions/${session.id}/rate`}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-primary text-on-primary hover:opacity-90 transition-opacity"
                title="Evaluar"
              >
                <span className="material-symbols-outlined text-xl">rate_review</span>
              </Link>
            ) : (
              <span className="inline-flex items-center gap-xs px-sm py-1 rounded-full bg-tertiary-container text-on-tertiary-container text-xs font-label-sm cursor-not-allowed" title="Solo se puede evaluar el mismo día de la sesión">
                <span className="material-symbols-outlined text-sm">info</span>
                Hoy no
              </span>
            )}
            {(profile?.role === 'admin' || session.created_by === profile?.user_id) && (
              <>
                <button
                  onClick={() => onEdit(session)}
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-surface-container text-on-surface-variant hover:bg-secondary-container transition-colors"
                  title="Editar"
                >
                  <span className="material-symbols-outlined text-xl">edit</span>
                </button>
                <button
                  onClick={() => onDelete(session.id)}
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-surface-container text-on-surface-variant hover:bg-error-container hover:text-on-error-container transition-colors"
                  title="Eliminar"
                >
                  <span className="material-symbols-outlined text-xl">delete</span>
                </button>
              </>
            )}
          </div>
        </td>
      </tr>
    </>
  )
}

function SessionCard({ session, index, profile, onEdit, onDelete }: {
  session: Session
  index: number
  profile: { user_id: string; role: string } | null
  onEdit: (s: Session) => void
  onDelete: (id: string) => void
}) {
  const canRate = isSessionToday(session) || profile?.role === 'admin'
  return (
    <div className="bg-surface border border-outline-variant rounded-xl p-md flex items-center gap-md">
      <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-label-md text-label-md font-bold shrink-0">
        {index + 1}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-body-xs text-body-xs text-on-surface-variant">
          {new Date(session.date + 'T12:00:00').toLocaleDateString('es-ES', {
            weekday: 'short',
            day: 'numeric',
            month: 'short'
          })}
        </p>
      </div>
      <div className="flex gap-sm shrink-0">
        <Link
          to={`/sessions/${session.id}`}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-surface-container text-on-surface-variant hover:bg-secondary-container transition-colors"
          title="Detalles"
        >
          <span className="material-symbols-outlined text-xl">visibility</span>
        </Link>
        {canRate ? (
          <Link
            to={`/sessions/${session.id}/rate`}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-primary text-on-primary hover:opacity-90 transition-opacity"
            title="Evaluar"
          >
            <span className="material-symbols-outlined text-xl">rate_review</span>
          </Link>
        ) : (
          <span className="inline-flex items-center gap-xs px-sm py-1 rounded-full bg-tertiary-container text-on-tertiary-container text-xs font-label-sm cursor-not-allowed" title="Solo se puede evaluar el mismo día de la sesión">
            <span className="material-symbols-outlined text-sm">info</span>
            Hoy no
          </span>
        )}
        {(profile?.role === 'admin' || session.created_by === profile?.user_id) && (
          <>
            <button
              onClick={() => onEdit(session)}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-surface-container text-on-surface-variant hover:bg-secondary-container transition-colors"
              title="Editar"
            >
              <span className="material-symbols-outlined text-xl">edit</span>
            </button>
            <button
              onClick={() => onDelete(session.id)}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-surface-container text-on-surface-variant hover:bg-error-container hover:text-on-error-container transition-colors"
              title="Eliminar"
            >
              <span className="material-symbols-outlined text-xl">delete</span>
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export function SessionsPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const { profile } = useAuth()
  const { impersonatedRole, isImpersonating } = useImpersonation()
  const effectiveRole = isImpersonating && impersonatedRole ? impersonatedRole : profile?.role
  const [course, setCourse] = useState<Course | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newSession, setNewSession] = useState({ date: '' })
  const [editingSession, setEditingSession] = useState<Session | null>(null)
  const [editDate, setEditDate] = useState('')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    past: true,
    current: false,
    future: true
  })
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  const effectiveProfile = profile ? { ...profile, role: effectiveRole || profile.role } : null

  const now = new Date()

  const sortedSessions = [...sessions].sort((a, b) => {
    const order = { current: 0, future: 1, past: 2 }
    const catA = order[categorizeSession(a, now)]
    const catB = order[categorizeSession(b, now)]
    if (catA !== catB) return catA - catB
    return new Date(b.date).getTime() - new Date(a.date).getTime()
  })

  const { page, perPage, setPage, setPerPage, paginatedSlice } = usePagination(sortedSessions.length, 10)
  const paginatedSessions = paginatedSlice(sortedSessions)
  const byDateDesc = (a: Session, b: Session) => new Date(b.date).getTime() - new Date(a.date).getTime()
  const currentSessions = paginatedSessions.filter(s => categorizeSession(s, now) === 'current').sort(byDateDesc)
  const futureSessions = paginatedSessions.filter(s => categorizeSession(s, now) === 'future').sort(byDateDesc)
  const pastSessions = paginatedSessions.filter(s => categorizeSession(s, now) === 'past').sort(byDateDesc)

  useEffect(() => {
    if (courseId) {
      fetchCourse()
      fetchSessions()
    }
  }, [courseId])

  const fetchCourse = async () => {
    const { data, error } = await insforge.database
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single()

    if (!error && data) {
      setCourse(data as Course)
    }
  }

  const fetchSessions = async () => {
    const { data, error } = await insforge.database
      .from('sessions')
      .select('*')
      .eq('course_id', courseId)
      .order('date', { ascending: false })

    if (!error && data) {
      setSessions(data as Session[])
    }
    setLoading(false)
  }

  const createSession = async () => {
    const d = new Date(newSession.date + 'T00:00:00')
    const title = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
    const { error } = await insforge.database
      .from('sessions')
      .insert([{
        course_id: courseId,
        title,
        date: newSession.date,
        created_by: profile?.user_id
      }])

    if (!error) {
      setShowCreateModal(false)
      setNewSession({ date: '' })
      fetchSessions()
    }
  }

  const deleteSession = async (sessionId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta sesión?')) return

    const { error } = await insforge.database
      .from('sessions')
      .delete()
      .eq('id', sessionId)

    if (error) {
      showToast('Sin permiso para eliminar la sesión', 'error')
    } else {
      fetchSessions()
    }
  }

  const openEditModal = (session: Session) => {
    setEditingSession(session)
    setEditDate(session.date)
  }

  const updateSession = async () => {
    if (!editingSession) return
    const d = new Date(editDate + 'T00:00:00')
    const title = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
    const { error } = await insforge.database
      .from('sessions')
      .update({ title, date: editDate })
      .eq('id', editingSession.id)

    if (error) {
      showToast('Sin permiso para editar la sesión', 'error')
    } else {
      setEditingSession(null)
      setEditDate('')
      fetchSessions()
    }
  }

  const toggleSection = (section: string) => {
    setCollapsed(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const renderSection = (
    title: string,
    icon: string,
    sectionKey: string,
    sectionSessions: Session[],
    isHighlighted: boolean
  ) => {
    if (sectionSessions.length === 0) return null

    const isCollapsed = collapsed[sectionKey]

    return (
      <div className={`rounded-xl border overflow-hidden transition-all ${
        isHighlighted
          ? 'border-primary bg-primary-container/20'
          : 'border-outline-variant bg-surface'
      }`}>
        <button
          onClick={() => toggleSection(sectionKey)}
          className="w-full flex items-center justify-between px-md py-sm hover:bg-secondary-container/30 transition-colors"
        >
          <div className="flex items-center gap-sm">
            <span className="material-symbols-outlined text-lg text-on-surface-variant">
              {isCollapsed ? 'chevron_right' : 'expand_more'}
            </span>
            <span className="font-label-md text-label-md text-primary font-bold">{title}</span>
            <span className="font-body-xs text-body-xs text-on-surface-variant bg-surface-container rounded-full px-sm py-0.5">
              {sectionSessions.length}
            </span>
          </div>
          <span className="material-symbols-outlined text-lg text-on-surface-variant">{icon}</span>
        </button>

        {!isCollapsed && (
          <div className="px-md pb-md">
            {/* Desktop: Table */}
            <div className="hidden md:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-outline-variant">
                    <th className="text-left font-body-sm text-body-sm text-on-surface-variant px-md py-sm">#</th>
                    <th className="text-left font-body-sm text-body-sm text-on-surface-variant px-md py-sm">Fecha</th>
                    <th className="text-right font-body-sm text-body-sm text-on-surface-variant px-md py-sm">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {sectionSessions.map((session, index) => {
                    return (
                       <SessionRow
                         key={session.id}
                         session={session}
                         index={index}
                         profile={effectiveProfile}
                         onEdit={openEditModal}
                         onDelete={deleteSession}
                       />
                    )
                  })}
                </tbody>
              </table>
            </div>
            {/* Mobile: Cards */}
            <div className="md:hidden space-y-sm">
              {sectionSessions.map((session, index) => {
                return (
                   <SessionCard
                     key={session.id}
                     session={session}
                     index={index}
                     profile={effectiveProfile}
                     onEdit={openEditModal}
                     onDelete={deleteSession}
                   />
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return <div className="p-lg font-body-md text-body-md text-on-surface-variant">Cargando sesiones...</div>
  }

  if (!course) {
    return (
      <div className="p-lg">
        <Link to="/courses" className="flex items-center gap-xs text-primary font-body-sm text-body-sm hover:underline mb-lg">
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          Volver a cursos
        </Link>
        <div className="bg-error-container border border-error rounded-xl p-lg">
          <p className="font-body-md text-body-md text-on-error-container">
            No tienes acceso a este curso.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-28 md:pb-0">
      <div className="mb-lg">
        <Link to="/courses" className="flex items-center gap-xs text-primary font-body-sm text-body-sm hover:underline mb-md">
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          Volver a cursos
        </Link>
      </div>

      <header className="mb-xl">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-md">
          <div className="min-w-0">
            <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary font-bold truncate">{course?.name}</h1>
            <p className="font-body-sm md:font-body-md text-body-sm md:text-body-md text-on-surface-variant mt-xs line-clamp-2">Gestiona las sesiones de calificación de este curso.</p>
          </div>
          {(effectiveRole === 'admin' || effectiveRole === 'teacher') && (
            <div className="flex gap-sm flex-shrink-0 self-end md:self-auto">
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-primary text-on-primary font-bold py-1 px-md md:px-lg rounded-full font-label-sm md:font-label-md text-label-sm md:text-label-md hover:opacity-90 transition-opacity flex items-center gap-xs"
              >
                <span className="material-symbols-outlined text-base md:text-lg">event</span>
                Crear
              </button>
            </div>
          )}
        </div>
      </header>

      {sessions.length === 0 ? (
        <div className="text-center py-xl">
          <span className="material-symbols-outlined text-on-surface-variant text-[48px] mb-md block">event</span>
          <p className="font-body-md text-body-md text-on-surface-variant">No hay sesiones creadas aún.</p>
        </div>
      ) : (
        <div className="space-y-md">
          {renderSection('Esta semana', 'today', 'current', currentSessions, true)}
          {renderSection('Próximamente', 'schedule', 'future', futureSessions, false)}
          {renderSection('Pasadas', 'history', 'past', pastSessions, false)}
        </div>
      )}

      <Pagination
        totalItems={sessions.length}
        page={page}
        perPage={perPage}
        onPageChange={setPage}
        onPerPageChange={setPerPage}
      />

      {/* Create Session Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-scrim/60 flex items-center justify-center z-50 p-margin-mobile">
          <div className="bg-surface-container-lowest rounded-xl p-lg w-full max-w-md border border-outline-variant">
            <h3 className="font-headline-sm text-headline-sm text-on-surface mb-lg">Crear Sesión</h3>
            <input
              type="date"
              value={newSession.date}
              onChange={(e) => setNewSession({ ...newSession, date: e.target.value })}
              className="w-full border border-outline-variant rounded-xl px-md py-2 mb-lg bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary"
            />
            <div className="flex justify-end gap-sm">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-lg py-2 text-on-surface-variant font-label-md text-label-md hover:bg-secondary-container rounded-full transition-colors flex items-center gap-xs"
              >
                <span className="material-symbols-outlined text-lg">close</span>
                Cancelar
              </button>
              <button
                onClick={createSession}
                className="bg-primary text-on-primary font-bold px-lg py-2 rounded-full font-label-md text-label-md hover:opacity-90 transition-opacity flex items-center gap-xs"
              >
                <span className="material-symbols-outlined text-lg">event</span>
                Crear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Session Modal */}
      {editingSession && (
        <div className="fixed inset-0 bg-scrim/60 flex items-center justify-center z-50 p-margin-mobile">
          <div className="bg-surface-container-lowest rounded-xl p-lg w-full max-w-md border border-outline-variant">
            <h3 className="font-headline-sm text-headline-sm text-on-surface mb-lg">Editar Sesión</h3>
            <label className="block font-body-sm text-body-sm text-on-surface-variant mb-xs">Fecha</label>
            <input
              type="date"
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
              className="w-full border border-outline-variant rounded-xl px-md py-2 mb-lg bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary"
            />
            <div className="flex justify-end gap-sm">
              <button
                onClick={() => { setEditingSession(null); setEditDate('') }}
                className="px-lg py-2 text-on-surface-variant font-label-md text-label-md hover:bg-secondary-container rounded-full transition-colors flex items-center gap-xs"
              >
                <span className="material-symbols-outlined text-lg">close</span>
                Cancelar
              </button>
              <button
                onClick={updateSession}
                className="bg-primary text-on-primary font-bold px-lg py-2 rounded-full font-label-md text-label-md hover:opacity-90 transition-opacity flex items-center gap-xs"
              >
                <span className="material-symbols-outlined text-lg">save</span>
                Guardar
              </button>
            </div>
          </div>
        </div>
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
