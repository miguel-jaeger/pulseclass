import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { insforge } from '../lib/insforge'
import { useAuth } from '../hooks/useAuth'

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
}

export function RateSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [session, setSession] = useState<Session | null>(null)
  const [existingRating, setExistingRating] = useState<Rating | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [rating, setRating] = useState({
    score: 5,
    comment: '',
    suggestion: ''
  })

  useEffect(() => {
    if (sessionId && user) {
      fetchSession()
      fetchExistingRating()
    }
  }, [sessionId, user])

  const fetchSession = async () => {
    const { data, error } = await insforge.database
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (!error && data) {
      setSession(data as Session)
    }
  }

  const fetchExistingRating = async () => {
    const { data, error } = await insforge.database
      .from('ratings')
      .select('*')
      .eq('session_id', sessionId)
      .eq('student_id', user?.id)
      .single()

    if (!error && data) {
      setExistingRating(data as Rating)
      setRating({
        score: data.score,
        comment: data.comment || '',
        suggestion: data.suggestion || ''
      })
    }
    setLoading(false)
  }

  const submitRating = async () => {
    setSaving(true)

    if (existingRating) {
      // Update existing rating
      const { error } = await insforge.database
        .from('ratings')
        .update({
          score: rating.score,
          comment: rating.comment,
          suggestion: rating.suggestion
        })
        .eq('id', existingRating.id)

      if (!error) {
        navigate(-1)
      }
    } else {
      // Create new rating
      const { error } = await insforge.database
        .from('ratings')
        .insert([{
          session_id: sessionId,
          student_id: user?.id,
          score: rating.score,
          comment: rating.comment,
          suggestion: rating.suggestion
        }])

      if (!error) {
        navigate(-1)
      }
    }
    setSaving(false)
  }

  if (loading) {
    return <div className="p-8">Cargando...</div>
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-2">Evaluar Sesión</h2>
      <p className="text-gray-600 mb-6">{session?.title}</p>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nivel de Satisfacción (1-10)
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="1"
              max="10"
              value={rating.score}
              onChange={(e) => setRating({ ...rating, score: parseInt(e.target.value) })}
              className="flex-1"
            />
            <span className="text-2xl font-bold text-blue-600 w-12 text-center">
              {rating.score}
            </span>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>1 - Muy insatisfecho</span>
            <span>10 - Muy satisfecho</span>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Comentario (opcional)
          </label>
          <textarea
            value={rating.comment}
            onChange={(e) => setRating({ ...rating, comment: e.target.value })}
            placeholder="¿Por qué diste esta puntuación?"
            className="w-full border rounded px-3 py-2"
            rows={4}
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sugerencias para mejorar (opcional)
          </label>
          <textarea
            value={rating.suggestion}
            onChange={(e) => setRating({ ...rating, suggestion: e.target.value })}
            placeholder="¿Qué puede hacer el profesor para mejorar?"
            className="w-full border rounded px-3 py-2"
            rows={4}
          />
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancelar
          </button>
          <button
            onClick={submitRating}
            disabled={saving}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Guardando...' : existingRating ? 'Actualizar' : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  )
}
