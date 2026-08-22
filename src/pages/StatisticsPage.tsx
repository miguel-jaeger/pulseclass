import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { insforge } from '../lib/insforge'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

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
}

interface ScoreDistribution {
  score: number
  count: number
}

export function StatisticsPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const [session, setSession] = useState<Session | null>(null)
  const [ratings, setRatings] = useState<Rating[]>([])
  const [loading, setLoading] = useState(true)
  const [avgScore, setAvgScore] = useState(0)
  const [totalRatings, setTotalRatings] = useState(0)
  const [scoreDistribution, setScoreDistribution] = useState<ScoreDistribution[]>([])

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
    const { data, error } = await insforge.database
      .from('ratings')
      .select('*')
      .eq('session_id', sessionId)

    if (!error && data) {
      const ratingsData = data as Rating[]
      setRatings(ratingsData)
      setTotalRatings(ratingsData.length)

      if (ratingsData.length > 0) {
        const sum = ratingsData.reduce((acc, r) => acc + r.score, 0)
        setAvgScore(sum / ratingsData.length)
      }

      const distribution: ScoreDistribution[] = []
      for (let i = 1; i <= 10; i++) {
        const count = ratingsData.filter(r => r.score === i).length
        distribution.push({ score: i, count })
      }
      setScoreDistribution(distribution)
    }
    setLoading(false)
  }

  if (loading) {
    return <div className="p-lg font-body-md text-body-md text-on-surface-variant">Cargando estadísticas...</div>
  }

  if (!session) {
    return (
      <div className="max-w-6xl mx-auto">
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
    <div className="max-w-6xl mx-auto">
      <div className="mb-lg">
        <Link to={`/sessions/${sessionId}`} className="flex items-center gap-xs text-primary font-body-sm text-body-sm hover:underline">
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          Volver a detalles de sesión
        </Link>
      </div>

      <header className="mb-xl">
        <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface">Estadísticas</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-xs">{session?.title}</p>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-lg mb-xl">
        <div className="bg-surface border border-outline-variant rounded-xl p-lg">
          <div className="flex items-center gap-sm mb-sm">
            <span className="material-symbols-outlined text-primary">assessment</span>
            <h3 className="font-label-md text-label-md text-on-surface-variant">Total Evaluaciones</h3>
          </div>
          <p className="font-headline-lg text-headline-lg text-primary font-bold">{totalRatings}</p>
        </div>
        <div className="bg-surface border border-outline-variant rounded-xl p-lg">
          <div className="flex items-center gap-sm mb-sm">
            <span className="material-symbols-outlined text-primary">trending_up</span>
            <h3 className="font-label-md text-label-md text-on-surface-variant">Promedio</h3>
          </div>
          <p className="font-headline-lg text-headline-lg text-primary font-bold">{avgScore.toFixed(1)}</p>
        </div>
        <div className="bg-surface border border-outline-variant rounded-xl p-lg">
          <div className="flex items-center gap-sm mb-sm">
            <span className="material-symbols-outlined text-primary">emoji_emotions</span>
            <h3 className="font-label-md text-label-md text-on-surface-variant">Nivel</h3>
          </div>
          <p className={`font-headline-lg text-headline-lg font-bold ${
            avgScore >= 8 ? 'text-primary' :
            avgScore >= 5 ? 'text-tertiary' :
            'text-error'
          }`}>
            {avgScore >= 8 ? 'Alto' : avgScore >= 5 ? 'Medio' : 'Bajo'}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg mb-xl">
        <div className="bg-surface border border-outline-variant rounded-xl p-lg">
          <h3 className="font-headline-sm text-headline-sm text-on-surface mb-lg">Distribución de Puntuaciones</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={scoreDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5bdbb" />
              <XAxis dataKey="score" stroke="#5c403f" />
              <YAxis stroke="#5c403f" />
              <Tooltip />
              <Bar dataKey="count" fill="#9e001f" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-surface border border-outline-variant rounded-xl p-lg">
          <h3 className="font-headline-sm text-headline-sm text-on-surface mb-lg">Distribución por Categorías</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Alto (8-10)', value: ratings.filter(r => r.score >= 8).length },
                  { name: 'Medio (5-7)', value: ratings.filter(r => r.score >= 5 && r.score < 8).length },
                  { name: 'Bajo (1-4)', value: ratings.filter(r => r.score < 5).length }
                ]}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                <Cell fill="#9e001f" />
                <Cell fill="#c8c6c5" />
                <Cell fill="#ba1a1a" />
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Comments */}
      <div className="bg-surface border border-outline-variant rounded-xl p-lg mb-xl">
        <h3 className="font-headline-sm text-headline-sm text-on-surface mb-lg">Principales Comentarios</h3>
        {ratings.filter(r => r.comment).length === 0 ? (
          <p className="font-body-md text-body-md text-on-surface-variant">No hay comentarios disponibles.</p>
        ) : (
          <div className="space-y-md">
            {ratings
              .filter(r => r.comment)
              .sort((a, b) => b.score - a.score)
              .slice(0, 5)
              .map((rating) => (
                <div key={rating.id} className="border-l-[3px] border-primary pl-md py-sm">
                  <div className="flex items-center gap-sm mb-xs">
                    <span className="font-semibold text-primary">{rating.score}/10</span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                      {new Date(rating.created_at).toLocaleDateString('es-ES')}
                    </span>
                  </div>
                  <p className="font-body-md text-body-md text-on-surface">{rating.comment}</p>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Top Suggestions */}
      <div className="bg-surface border border-outline-variant rounded-xl p-lg">
        <h3 className="font-headline-sm text-headline-sm text-on-surface mb-lg">Principales Sugerencias</h3>
        {ratings.filter(r => r.suggestion).length === 0 ? (
          <p className="font-body-md text-body-md text-on-surface-variant">No hay sugerencias disponibles.</p>
        ) : (
          <div className="space-y-md">
            {ratings
              .filter(r => r.suggestion)
              .slice(0, 5)
              .map((rating) => (
                <div key={rating.id} className="bg-surface-container-low rounded-xl p-md">
                  <p className="font-body-md text-body-md text-on-surface">{rating.suggestion}</p>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}
