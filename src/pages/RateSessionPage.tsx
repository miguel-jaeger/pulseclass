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
  const [error, setError] = useState<string | null>(null)
  const [isMember, setIsMember] = useState(false)
  const [rating, setRating] = useState({
    score: 5,
    comment: '',
    suggestion: ''
  })

  useEffect(() => {
    if (sessionId && user) {
      fetchSession()
      fetchExistingRating()
      checkMembership()
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

  const checkMembership = async () => {
    const { data: sessionData } = await insforge.database
      .from('sessions')
      .select('course_id')
      .eq('id', sessionId)
      .single()

    if (sessionData) {
      const { data: memberData } = await insforge.database
        .from('course_members')
        .select('id')
        .eq('course_id', sessionData.course_id)
        .eq('user_id', user?.id)
        .maybeSingle()

      setIsMember(!!memberData)
    }
  }

  const fetchExistingRating = async () => {
    const { data, error } = await insforge.database
      .from('ratings')
      .select('*')
      .eq('session_id', sessionId)
      .eq('student_id', user?.id)
      .maybeSingle()

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
    setError(null)

    if (existingRating) {
      const { error: updateError } = await insforge.database
        .from('ratings')
        .update({
          score: rating.score,
          comment: rating.comment,
          suggestion: rating.suggestion
        })
        .eq('id', existingRating.id)

      if (updateError) {
        setError('Error al actualizar: ' + updateError.message)
        setSaving(false)
        return
      }
    } else {
      const { error: insertError } = await insforge.database
        .from('ratings')
        .insert([{
          session_id: sessionId,
          student_id: user?.id,
          score: rating.score,
          comment: rating.comment,
          suggestion: rating.suggestion
        }])

      if (insertError) {
        setError('Error al guardar: ' + insertError.message)
        setSaving(false)
        return
      }
    }
    navigate(-1)
    setSaving(false)
  }

  if (loading) {
    return <div className="p-lg font-body-md text-body-md text-on-surface-variant">Cargando...</div>
  }

  if (!isMember) {
    return (
      <div className="max-w-2xl mx-auto">
      <header className="mb-lg">
          <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface">Evaluar Sesión</h1>
        </header>
        <div className="bg-error-container border border-error rounded-xl p-lg">
          <p className="font-body-md text-body-md text-on-error-container">
            No puedes evaluar esta sesión porque no eres miembro del curso.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <header className="mb-xl">
        <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface">Evaluar Sesión</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-xs">{session?.title}</p>
      </header>

      {error && (
        <div className="mb-md bg-error-container border border-error rounded-xl p-md">
          <p className="font-body-sm text-body-sm text-on-error-container">{error}</p>
        </div>
      )}

      <div className="bg-surface border border-outline-variant rounded-xl p-lg">
        <div className="mb-md">
          <label className="block font-label-md text-label-md text-on-surface mb-sm">
            Nivel de Satisfacción (1-10)
          </label>
          <div className="flex items-center gap-md">
            <input
              type="range"
              min="1"
              max="10"
              value={rating.score}
              onChange={(e) => setRating({ ...rating, score: parseInt(e.target.value) })}
              className="flex-1 accent-primary"
            />
            <span className="font-headline-lg text-headline-lg text-primary w-16 text-center">
              {rating.score}
            </span>
          </div>
          <div className="flex justify-between font-label-sm text-label-sm text-on-surface-variant mt-xs">
            <span>1 - Muy insatisfecho</span>
            <span>10 - Muy satisfecho</span>
          </div>
        </div>

        <div className="mb-md">
          <label className="block font-label-md text-label-md text-on-surface mb-sm">
            Comentario (opcional)
          </label>
          <textarea
            value={rating.comment}
            onChange={(e) => setRating({ ...rating, comment: e.target.value })}
            placeholder="¿Por qué diste esta puntuación?"
            className="w-full border border-outline-variant rounded-xl px-md py-2 bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary"
            rows={4}
          />
        </div>

        <div className="mb-md">
          <label className="block font-label-md text-label-md text-on-surface mb-sm">
            Sugerencias para mejorar (opcional)
          </label>
          <textarea
            value={rating.suggestion}
            onChange={(e) => setRating({ ...rating, suggestion: e.target.value })}
            placeholder="¿Qué puede hacer el profesor para mejorar?"
            className="w-full border border-outline-variant rounded-xl px-md py-2 bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary"
            rows={4}
          />
        </div>

        <div className="flex justify-end gap-sm">
          <button
            onClick={() => navigate(-1)}
            className="px-lg py-2 text-on-surface-variant font-label-md text-label-md hover:bg-secondary-container rounded-full transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={submitRating}
            disabled={saving}
            className="bg-primary text-on-primary font-bold px-lg py-2 rounded-full font-label-md text-label-md hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? 'Guardando...' : existingRating ? 'Actualizar' : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  )
}
