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
    return <div className="p-8">Cargando...</div>
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">{course?.name}</h2>
          <p className="text-gray-600">{course?.description}</p>
        </div>
        {(profile?.role === 'admin' || profile?.role === 'teacher') && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Crear Sesión
          </button>
        )}
      </div>

      <div className="space-y-4">
        {sessions.length === 0 ? (
          <p className="text-gray-500">No hay sesiones creadas aún.</p>
        ) : (
          sessions.map((session) => (
            <div key={session.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold">{session.title}</h3>
                  <p className="text-gray-600">
                    {new Date(session.date).toLocaleDateString('es-ES', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link
                    to={`/sessions/${session.id}/rate`}
                    className="text-sm bg-green-100 text-green-700 px-3 py-1 rounded hover:bg-green-200"
                  >
                    Evaluar
                  </Link>
                  {(profile?.role === 'admin' || session.created_by === profile?.user_id) && (
                    <button
                      onClick={() => deleteSession(session.id)}
                      className="text-sm text-red-600 px-3 py-1 rounded hover:bg-red-50"
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Session Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Crear Sesión</h3>
            <input
              type="text"
              placeholder="Título de la sesión"
              value={newSession.title}
              onChange={(e) => setNewSession({ ...newSession, title: e.target.value })}
              className="w-full border rounded px-3 py-2 mb-3"
            />
            <input
              type="date"
              value={newSession.date}
              onChange={(e) => setNewSession({ ...newSession, date: e.target.value })}
              className="w-full border rounded px-3 py-2 mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={createSession}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
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
