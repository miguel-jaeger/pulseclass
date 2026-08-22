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
    // Fetch ratings with star counts
    const { data: ratingsData, error: ratingsError } = await insforge.database
      .from('ratings')
      .select('*')
      .eq('session_id', sessionId)

    if (!ratingsError && ratingsData) {
      // Fetch star counts for each rating
      const ratingsWithStars = await Promise.all(
        (ratingsData as Rating[]).map(async (rating) => {
          const { count } = await insforge.database
            .from('comment_stars')
            .select('*', { count: 'exact', head: true })
            .eq('rating_id', rating.id)

          // Check if current user has starred this rating
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
      // Remove star
      const { error } = await insforge.database
        .from('comment_stars')
        .delete()
        .eq('rating_id', ratingId)
        .eq('student_id', user?.id)

      if (!error) {
        fetchRatings()
      }
    } else {
      // Add star
      const { error } = await insforge.database
        .from('comment_stars')
        .insert([{ rating_id: ratingId, student_id: user?.id }])

      if (!error) {
        fetchRatings()
      }
    }
  }

  if (loading) {
    return <div className="p-8">Cargando...</div>
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link to={`/courses/${session?.course_id}/sessions`} className="text-blue-600 hover:underline">
          ← Volver a sesiones
        </Link>
      </div>

      <h2 className="text-2xl font-bold mb-2">{session?.title}</h2>
      <p className="text-gray-600 mb-6">
        {new Date(session?.date || '').toLocaleDateString('es-ES', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}
      </p>

      <div className="flex gap-4 mb-8">
        <Link
          to={`/sessions/${sessionId}/rate`}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {profile?.role === 'student' ? 'Evaluar esta sesión' : 'Ver mi evaluación'}
        </Link>
        {(profile?.role === 'admin' || profile?.role === 'teacher') && (
          <Link
            to={`/sessions/${sessionId}/stats`}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Ver estadísticas
          </Link>
        )}
      </div>

      <h3 className="text-xl font-semibold mb-4">Comentarios de estudiantes</h3>

      {ratings.length === 0 ? (
        <p className="text-gray-500">No hay comentarios aún.</p>
      ) : (
        <div className="space-y-4">
          {ratings.map((rating) => (
            <div key={rating.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-blue-600">{rating.score}/10</span>
                  <span className="text-gray-400">•</span>
                  <span className="text-sm text-gray-500">
                    {new Date(rating.created_at).toLocaleDateString('es-ES')}
                  </span>
                </div>
                {profile?.role === 'student' && (
                  <button
                    onClick={() => toggleStar(rating.id, rating.has_starred || false)}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-sm ${
                      rating.has_starred
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <span>⭐</span>
                    <span>{rating.star_count || 0}</span>
                  </button>
                )}
                {profile?.role !== 'student' && (
                  <span className="flex items-center gap-1 px-2 py-1 rounded text-sm bg-gray-100 text-gray-600">
                    <span>⭐</span>
                    <span>{rating.star_count || 0}</span>
                  </span>
                )}
              </div>

              {rating.comment && (
                <p className="text-gray-700 mb-3">{rating.comment}</p>
              )}

              {rating.suggestion && (
                <div className="bg-blue-50 rounded p-3">
                  <p className="text-sm text-blue-800">
                    <span className="font-semibold">Sugerencia:</span> {rating.suggestion}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
