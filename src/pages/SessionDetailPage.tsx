import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
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
  created_at: string
  star_count?: number
  has_starred?: boolean
}

export function SessionDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const { user, profile } = useAuth()
  const [session, setSession] = useState<Session | null>(null)
  const [ratings, setRatings] = useState<Rating[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const ratingsRef = useRef<Rating[]>([])

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    ratingsRef.current = ratings
  }, [ratings])

  useEffect(() => {
    if (sessionId) {
      fetchSession()
      fetchRatings()
    }
  }, [sessionId])

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

  const fetchRatings = async () => {
    const { data: ratingsData, error: ratingsError } = await insforge.database
      .from('ratings')
      .select('*')
      .eq('session_id', sessionId)

    if (!ratingsError && ratingsData) {
      const ratingIds = (ratingsData as Rating[]).map(r => r.id)

      const { data: starsData } = await insforge.database
        .from('comment_stars')
        .select('rating_id, student_id')
        .in('rating_id', ratingIds)

      const starCounts: Record<string, number> = {}
      const userStars: Record<string, boolean> = {}

      for (const star of starsData || []) {
        starCounts[star.rating_id] = (starCounts[star.rating_id] || 0) + 1
        if (star.student_id === user?.id) {
          userStars[star.rating_id] = true
        }
      }

      const ratingsWithStars = (ratingsData as Rating[]).map(rating => ({
        ...rating,
        star_count: starCounts[rating.id] || 0,
        has_starred: !!userStars[rating.id]
      }))

      setRatings(ratingsWithStars)
    }
    setLoading(false)
  }

  const toggleStar = async (ratingId: string, hasStarred: boolean) => {
    if (!user) return

    const prevRatings = ratingsRef.current
    const rating = prevRatings.find(r => r.id === ratingId)
    if (!rating) return

    setRatings(prev => prev.map(r =>
      r.id === ratingId
        ? { ...r, has_starred: !hasStarred, star_count: (r.star_count || 0) + (hasStarred ? -1 : 1) }
        : r
    ))

    if (hasStarred) {
      const { error } = await insforge.database
        .from('comment_stars')
        .delete()
        .eq('rating_id', ratingId)
        .eq('student_id', user.id)

      if (error) {
        setRatings(prevRatings)
        showToast('No se pudo quitar la estrella', 'error')
      } else {
        showToast('Estrella quitada')
      }
    } else {
      const { error } = await insforge.database
        .from('comment_stars')
        .insert([{ rating_id: ratingId, student_id: user.id }])

      if (error) {
        setRatings(prevRatings)
        showToast('No se pudo marcar la estrella', 'error')
      } else {
        showToast('Estrella marcada')
      }
    }
  }

  if (loading) {
    return <div className="p-lg font-body-md text-body-md text-on-surface-variant">Cargando...</div>
  }

  if (!session) {
    return (
      <div className="max-w-4xl mx-auto">
        <Link to="/courses" className="flex items-center gap-xs text-primary font-body-sm text-body-sm hover:underline mb-lg">
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          Volver a cursos
        </Link>
        <div className="bg-error-container border border-error rounded-xl p-lg">
          <p className="font-body-md text-body-md text-on-error-container">No se pudo cargar la sesión.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-lg">
        <Link to={`/courses/${session?.course_id}/sessions`} className="flex items-center gap-xs text-primary font-body-sm text-body-sm hover:underline">
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          Volver a sesiones
        </Link>
      </div>

      <header className="mb-lg">
        <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface">{session?.title}</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-xs">
          <span className="material-symbols-outlined text-sm align-middle mr-xs">calendar_today</span>
          {new Date((session?.date || '') + 'T12:00:00').toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </p>
      </header>

      <div className="flex gap-md mb-lg">
        <Link
          to={`/sessions/${sessionId}/rate`}
          className="bg-primary text-on-primary font-bold py-2 px-lg rounded-full font-label-md text-label-md hover:opacity-90 transition-opacity"
        >
          {profile?.role === 'student' ? 'Evaluar esta sesión' : 'Ver mi evaluación'}
        </Link>
      </div>

      <h2 className="font-headline-md text-headline-md text-on-surface mb-md">Comentarios de estudiantes</h2>

      {ratings.length === 0 ? (
        <div className="text-center py-lg">
          <span className="material-symbols-outlined text-on-surface-variant text-[48px] mb-md block">chat_bubble_outline</span>
          <p className="font-body-md text-body-md text-on-surface-variant">No hay comentarios aún.</p>
        </div>
      ) : (
        <div className="space-y-md">
          {ratings.map((rating) => (
            <article key={rating.id} className="bg-surface border border-outline-variant rounded-xl p-lg">
              <div className="flex justify-between items-start mb-md">
                <div className="flex items-center gap-sm">
                  <span className="font-headline-sm text-headline-sm text-primary font-bold">{rating.score}/10</span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    {new Date(rating.created_at).toLocaleDateString('es-ES')}
                  </span>
                </div>
                <button
                  onClick={() => toggleStar(rating.id, rating.has_starred || false)}
                  className={`flex items-center gap-xs px-sm py-xs rounded-full font-label-sm text-label-sm transition-colors ${
                    rating.has_starred
                      ? 'bg-primary-container text-on-primary-container'
                      : 'bg-surface-container text-on-surface-variant hover:bg-secondary-container'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg" style={rating.has_starred ? { fontVariationSettings: "'FILL' 1" } : undefined}>star</span>
                  <span>{rating.star_count || 0}</span>
                </button>
              </div>

              {rating.comment && (
                <p className="font-body-md text-body-md text-on-surface mb-md">{rating.comment}</p>
              )}

              {rating.suggestion && (
                <div className="bg-surface-container-low rounded-xl p-md">
                  <p className="font-body-sm text-body-sm text-on-surface">
                    <span className="font-semibold">Sugerencia:</span> {rating.suggestion}
                  </p>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-lg left-1/2 -translate-x-1/2 px-lg py-sm rounded-full font-label-md text-label-md shadow-lg z-50 transition-all ${
          toast.type === 'success' ? 'bg-success-container text-on-success-container' : 'bg-error-container text-on-error-container'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  )
}
