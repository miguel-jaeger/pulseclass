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

      // Calculate average score
      if (ratingsData.length > 0) {
        const sum = ratingsData.reduce((acc, r) => acc + r.score, 0)
        setAvgScore(sum / ratingsData.length)
      }

      // Calculate score distribution
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
    return <div className="p-8">Cargando...</div>
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <Link to={`/sessions/${sessionId}`} className="text-blue-600 hover:underline">
          ← Volver a detalles de sesión
        </Link>
      </div>

      <h2 className="text-2xl font-bold mb-2">Estadísticas de {session?.title}</h2>
      <p className="text-gray-600 mb-8">
        {new Date(session?.date || '').toLocaleDateString('es-ES', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}
      </p>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Total de Evaluaciones</h3>
          <p className="text-3xl font-bold text-blue-600">{totalRatings}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Promedio de Satisfacción</h3>
          <p className="text-3xl font-bold text-green-600">{avgScore.toFixed(1)}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Nivel de Satisfacción</h3>
          <p className={`text-3xl font-bold ${
            avgScore >= 8 ? 'text-green-600' :
            avgScore >= 5 ? 'text-yellow-600' :
            'text-red-600'
          }`}>
            {avgScore >= 8 ? 'Alto' : avgScore >= 5 ? 'Medio' : 'Bajo'}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Score Distribution Bar Chart */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Distribución de Puntuaciones</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={scoreDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="score" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Score Pie Chart */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Distribución por Categorías</h3>
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
                <Cell fill="#22C55E" />
                <Cell fill="#EAB308" />
                <Cell fill="#EF4444" />
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Comments */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h3 className="text-lg font-semibold mb-4">Principales Comentarios</h3>
        {ratings.filter(r => r.comment).length === 0 ? (
          <p className="text-gray-500">No hay comentarios disponibles.</p>
        ) : (
          <div className="space-y-4">
            {ratings
              .filter(r => r.comment)
              .sort((a, b) => b.score - a.score)
              .slice(0, 5)
              .map((rating) => (
                <div key={rating.id} className="border-l-4 border-blue-500 pl-4 py-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-blue-600">{rating.score}/10</span>
                    <span className="text-gray-400">•</span>
                    <span className="text-sm text-gray-500">
                      {new Date(rating.created_at).toLocaleDateString('es-ES')}
                    </span>
                  </div>
                  <p className="text-gray-700">{rating.comment}</p>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Top Suggestions */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Principales Sugerencias</h3>
        {ratings.filter(r => r.suggestion).length === 0 ? (
          <p className="text-gray-500">No hay sugerencias disponibles.</p>
        ) : (
          <div className="space-y-4">
            {ratings
              .filter(r => r.suggestion)
              .slice(0, 5)
              .map((rating) => (
                <div key={rating.id} className="bg-blue-50 rounded p-4">
                  <p className="text-blue-800">{rating.suggestion}</p>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}
