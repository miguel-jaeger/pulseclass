import { useState, useEffect } from 'react'
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
      const ratingsWithStars = await Promise.all(
        (ratingsData as Rating[]).map(async (rating) => {
          const { count } = await insforge.database
            .from('comment_stars')
            .select('*', { count: 'exact', head: true })
            .eq('rating_id', rating.id)

          const { data: userStar } = await insforge.database
            .from('comment_stars')
            .select('id')
            .eq('rating_id', rating.id)
            .eq('student_id', user?.id)
            .single()

          return {
            ...rating,
            star_count: count || 0,
            has_starred: !!userStar
          }
        })
      )

      setRatings(ratingsWithStars)
    }
    setLoading(false)
  }

  const toggleStar = async (ratingId: string, hasStarred: boolean) => {
    if (hasStarred) {
      const { error } = await insforge.database
        .from('comment_stars')
        .delete()
        .eq('rating_id', ratingId)
        .eq('student_id', user?.id)

      if (!error) {
        fetchRatings()
      }
    } else {
      const { error } = await insforge.database
        .from('comment_stars')
        .insert([{ rating_id: ratingId, student_id: user?.id }])

      if (!error) {
        fetchRatings()
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
          {new Date(session?.date || '').toLocaleDateString('es-ES', {
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
          {profile?.role === 'Estudiante' ? 'Evaluar esta sesión' : 'Ver mi evaluación'}
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
    </div>
  )
}
