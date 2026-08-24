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
    score: 7,
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
        <div className="mb-lg">
          <label className="block font-label-md text-label-md text-on-surface mb-sm">
            Nivel de Satisfacción
          </label>
          <div className="grid grid-cols-3 gap-md">
            {[
              { value: 4, label: 'Insatisfecho', range: '1-6', icon: 'sentiment_dissatisfied', color: 'error', bgClass: 'bg-error-container', textClass: 'text-on-error-container', borderClass: 'border-error', ringClass: 'ring-error' },
              { value: 7, label: 'Neutral', range: '7-8', icon: 'sentiment_neutral', color: 'tertiary', bgClass: 'bg-tertiary-container', textClass: 'text-on-tertiary-container', borderClass: 'border-tertiary', ringClass: 'ring-tertiary' },
              { value: 9, label: 'Satisfecho', range: '9-10', icon: 'sentiment_satisfied', color: 'primary', bgClass: 'bg-primary-container', textClass: 'text-on-primary-container', borderClass: 'border-primary', ringClass: 'ring-primary' }
            ].map((option) => {
              const isSelected = (
                (option.value === 4 && rating.score >= 1 && rating.score <= 6) ||
                (option.value === 7 && rating.score >= 7 && rating.score <= 8) ||
                (option.value === 9 && rating.score >= 9 && rating.score <= 10)
              )
              return (
                <label
                  key={option.label}
                  className={`relative flex flex-col items-center p-md rounded-xl border-2 cursor-pointer transition-all ${
                    isSelected
                      ? `${option.borderClass} ${option.bgClass} ring-2 ${option.ringClass}`
                      : 'border-outline-variant hover:border-outline'
                  }`}
                >
                  <input
                    type="radio"
                    name="satisfaction"
                    value={option.value}
                    checked={isSelected}
                    onChange={() => setRating({ ...rating, score: option.value })}
                    className="sr-only"
                  />
                  <span className={`material-symbols-outlined text-[40px] ${isSelected ? option.textClass : 'text-on-surface-variant'}`}>
                    {option.icon}
                  </span>
                  <span className={`font-label-lg text-label-lg mt-xs ${isSelected ? option.textClass : 'text-on-surface'}`}>
                    {option.label}
                  </span>
                  <span className={`font-body-xs text-body-xs ${isSelected ? option.textClass : 'text-on-surface-variant'}`}>
                    {option.range}
                  </span>
                </label>
              )
            })}
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
            className="px-lg py-2 text-on-surface-variant font-label-md text-label-md hover:bg-secondary-container rounded-full transition-colors flex items-center gap-xs"
          >
            <span className="material-symbols-outlined text-lg">close</span>
            Cancelar
          </button>
          <button
            onClick={submitRating}
            disabled={saving}
            className="bg-primary text-on-primary font-bold px-lg py-2 rounded-full font-label-md text-label-md hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-xs"
          >
            <span className="material-symbols-outlined text-lg">{saving ? 'hourglass_empty' : existingRating ? 'save' : 'send'}</span>
            {saving ? 'Guardando...' : existingRating ? 'Actualizar' : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  )
}
