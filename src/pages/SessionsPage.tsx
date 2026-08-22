import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { insforge } from '../lib/insforge'
import { useAuth } from '../hooks/useAuth'

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
  const [course, setCourse] = useState<Course | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newSession, setNewSession] = useState({ title: '', date: '' })

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
    const { error } = await insforge.database
      .from('sessions')
      .insert([{
        course_id: courseId,
        title: newSession.title,
        date: newSession.date,
        created_by: profile?.user_id
      }])

    if (!error) {
      setShowCreateModal(false)
      setNewSession({ title: '', date: '' })
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
    <div>
      <div className="mb-lg">
        <Link to="/courses" className="flex items-center gap-xs text-primary font-body-sm text-body-sm hover:underline mb-md">
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          Volver a cursos
        </Link>
      </div>

      <header className="mb-xl flex justify-between items-end">
        <div>
          <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface">{course?.name}</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-xs">{course?.description}</p>
        </div>
        {(profile?.role === 'admin' || profile?.role === 'teacher') && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-primary text-on-primary font-bold py-2 px-lg rounded-full font-label-md text-label-md hover:opacity-90 transition-opacity"
          >
            Crear Sesión
          </button>
        )}
      </header>

      <div className="space-y-md">
        {sessions.length === 0 ? (
          <div className="text-center py-xl">
            <span className="material-symbols-outlined text-on-surface-variant text-[48px] mb-md block">event</span>
            <p className="font-body-md text-body-md text-on-surface-variant">No hay sesiones creadas aún.</p>
          </div>
        ) : (
          sessions.map((session) => (
            <article key={session.id} className="bg-surface border border-outline-variant border-t-[3px] border-t-primary rounded-xl p-lg hover:shadow-sm transition-all duration-200">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface">{session.title}</h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-xs">
                    <span className="material-symbols-outlined text-sm align-middle mr-xs">calendar_today</span>
                    {new Date(session.date).toLocaleDateString('es-ES', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                <div className="flex gap-sm">
                  <Link
                    to={`/sessions/${session.id}`}
                    className="bg-surface-container border border-outline-variant text-on-surface-variant font-bold py-2 px-md rounded-full font-label-md text-label-md hover:bg-secondary-container transition-colors"
                  >
                    Detalles
                  </Link>
                  <Link
                    to={`/sessions/${session.id}/rate`}
                    className="bg-primary text-on-primary font-bold py-2 px-md rounded-full font-label-md text-label-md hover:opacity-90 transition-opacity"
                  >
                    Evaluar
                  </Link>
                  {(profile?.role === 'admin' || session.created_by === profile?.user_id) && (
                    <button
                      onClick={() => deleteSession(session.id)}
                      className="bg-surface-container border border-error text-error font-bold py-2 px-3 rounded-full font-label-md text-label-md hover:bg-error-container transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      {/* Create Session Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-scrim/60 flex items-center justify-center z-50 p-margin-mobile">
          <div className="bg-surface-container-lowest rounded-xl p-lg w-full max-w-md border border-outline-variant">
            <h3 className="font-headline-sm text-headline-sm text-on-surface mb-lg">Crear Sesión</h3>
            <input
              type="text"
              placeholder="Título de la sesión"
              value={newSession.title}
              onChange={(e) => setNewSession({ ...newSession, title: e.target.value })}
              className="w-full border border-outline-variant rounded-xl px-md py-2 mb-md bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary"
            />
            <input
              type="date"
              value={newSession.date}
              onChange={(e) => setNewSession({ ...newSession, date: e.target.value })}
              className="w-full border border-outline-variant rounded-xl px-md py-2 mb-lg bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary"
            />
            <div className="flex justify-end gap-sm">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-lg py-2 text-on-surface-variant font-label-md text-label-md hover:bg-secondary-container rounded-full transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={createSession}
                className="bg-primary text-on-primary font-bold px-lg py-2 rounded-full font-label-md text-label-md hover:opacity-90 transition-opacity"
              >
                Crear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
