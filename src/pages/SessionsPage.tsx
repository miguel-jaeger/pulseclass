import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { insforge } from '../lib/insforge'
import { useAuth } from '../hooks/useAuth'
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

export function SessionsPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [course, setCourse] = useState<Course | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newSession, setNewSession] = useState({ date: '' })
  const [editingSession, setEditingSession] = useState<Session | null>(null)
  const [editDate, setEditDate] = useState('')

  const { page, perPage, setPage, setPerPage, paginatedSlice } = usePagination(sessions.length)
  const paginatedSessions = paginatedSlice(sessions)

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

    if (!error) {
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

    if (!error) {
      setEditingSession(null)
      setEditDate('')
      fetchSessions()
    }
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
    <div className="pb-20 md:pb-0">
      <div className="mb-lg">
        <Link to="/courses" className="flex items-center gap-xs text-primary font-body-sm text-body-sm hover:underline mb-md">
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          Volver a cursos
        </Link>
      </div>

      <header className="mb-xl">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-md">
          <div className="min-w-0">
            <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface truncate">{course?.name}</h1>
            <p className="font-body-sm md:font-body-md text-body-sm md:text-body-md text-on-surface-variant mt-xs line-clamp-2">{course?.description}</p>
          </div>
          {(profile?.role === 'admin' || profile?.role === 'teacher') && (
            <div className="flex gap-sm flex-shrink-0">
              <button
                onClick={() => navigate('/statistics')}
                className="bg-surface-container border border-outline-variant text-on-surface font-bold py-1 px-md md:px-lg rounded-full font-label-sm md:font-label-md text-label-sm md:text-label-md hover:bg-surface-container-high transition-colors flex items-center gap-xs"
              >
                <span className="material-symbols-outlined text-base md:text-lg">bar_chart</span>
                <span className="hidden sm:inline">Estadísticas</span>
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-primary text-on-primary font-bold py-1 px-md md:px-lg rounded-full font-label-sm md:font-label-md text-label-sm md:text-label-md hover:opacity-90 transition-opacity flex items-center gap-xs"
              >
                <span className="material-symbols-outlined text-base md:text-lg">add</span>
                <span className="hidden sm:inline">Crear Sesión</span>
                <span className="sm:hidden">Crear</span>
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="space-y-md">
        {sessions.length === 0 ? (
          <div className="text-center py-xl">
            <span className="material-symbols-outlined text-on-surface-variant text-[48px] mb-md block">event</span>
            <p className="font-body-md text-body-md text-on-surface-variant">No hay sesiones creadas aún.</p>
          </div>
        ) : (
          <>
            {/* Desktop: Table */}
            <div className="hidden md:block bg-surface border border-outline-variant rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-outline-variant bg-surface-container-low">
                    <th className="text-left font-body-sm text-body-sm text-on-surface-variant px-md py-sm">#</th>
                    <th className="text-left font-body-sm text-body-sm text-on-surface-variant px-md py-sm">Fecha</th>
                    <th className="text-right font-body-sm text-body-sm text-on-surface-variant px-md py-sm">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedSessions.map((session, index) => {
                    const globalIndex = perPage === 0 ? sessions.length - index : sessions.indexOf(session)
                    return (
                    <tr key={session.id} className="border-b border-outline-variant last:border-0 hover:bg-surface-container-low transition-colors">
                      <td className="px-md py-sm font-body-sm text-body-sm text-on-surface-variant">{globalIndex + 1}</td>
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
                          <Link
                            to={`/sessions/${session.id}/rate`}
                            className="w-9 h-9 flex items-center justify-center rounded-full bg-primary text-on-primary hover:opacity-90 transition-opacity"
                            title="Evaluar"
                          >
                            <span className="material-symbols-outlined text-xl">rate_review</span>
                          </Link>
                          {(profile?.role === 'admin' || session.created_by === profile?.user_id) && (
                            <>
                              <button
                                onClick={() => openEditModal(session)}
                                className="w-9 h-9 flex items-center justify-center rounded-full bg-surface-container text-on-surface-variant hover:bg-secondary-container transition-colors"
                                title="Editar"
                              >
                                <span className="material-symbols-outlined text-xl">edit</span>
                              </button>
                              <button
                                onClick={() => deleteSession(session.id)}
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
                    )
                  })}
                </tbody>
              </table>
            </div>
            {/* Mobile: Compact cards */}
            <div className="md:hidden space-y-sm">
              {paginatedSessions.map((session, index) => {
                const globalIndex = perPage === 0 ? sessions.length - index : sessions.indexOf(session)
                return (
                <div key={session.id} className="bg-surface border border-outline-variant rounded-xl p-md flex items-center gap-md">
                  <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-label-md text-label-md font-bold shrink-0">
                    {globalIndex + 1}
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
                    <Link
                      to={`/sessions/${session.id}/rate`}
                      className="w-9 h-9 flex items-center justify-center rounded-full bg-primary text-on-primary hover:opacity-90 transition-opacity"
                      title="Evaluar"
                    >
                      <span className="material-symbols-outlined text-xl">rate_review</span>
                    </Link>
                    {(profile?.role === 'admin' || session.created_by === profile?.user_id) && (
                      <>
                        <button
                          onClick={() => openEditModal(session)}
                          className="w-9 h-9 flex items-center justify-center rounded-full bg-surface-container text-on-surface-variant hover:bg-secondary-container transition-colors"
                          title="Editar"
                        >
                          <span className="material-symbols-outlined text-xl">edit</span>
                        </button>
                        <button
                          onClick={() => deleteSession(session.id)}
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
              })}
            </div>
          </>
        )}
      </div>

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
                <span className="material-symbols-outlined text-lg">add</span>
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
    </div>
  )
}
