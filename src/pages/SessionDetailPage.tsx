import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { insforge } from '../lib/insforge'
import { useAuth } from '../hooks/useAuth'
import { Pagination, usePagination } from '../components/Pagination'

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

interface Reply {
  id: string
  rating_id: string
  user_id: string
  content: string
  created_at: string
  user_name?: string
}

function isSessionToday(sessionDate: string): boolean {
  const today = new Date()
  const todayStr = today.getFullYear() + '-' +
    String(today.getMonth() + 1).padStart(2, '0') + '-' +
    String(today.getDate()).padStart(2, '0')
  return sessionDate === todayStr
}

export function SessionDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const { user, profile } = useAuth()
  const [session, setSession] = useState<Session | null>(null)
  const [ratings, setRatings] = useState<Rating[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const ratingsRef = useRef<Rating[]>([])
  const [repliesMap, setRepliesMap] = useState<Record<string, Reply[]>>({})
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [editingRating, setEditingRating] = useState<string | null>(null)
  const [editRatingText, setEditRatingText] = useState<{ comment: string; suggestion: string }>({ comment: '', suggestion: '' })
  const [editingReply, setEditingReply] = useState<string | null>(null)
  const [editReplyText, setEditReplyText] = useState('')
  const [activeTab, setActiveTab] = useState<'comments' | 'suggestions'>('comments')

  const commentsList = ratings.filter(r => r.comment)
  const suggestionsList = ratings.filter(r => r.suggestion)
  const { page: commentsPage, perPage: commentsPerPage, setPage: setCommentsPage, setPerPage: setCommentsPerPage, paginatedSlice: commentsPaginate } = usePagination(commentsList.length, 5)
  const { page: suggestionsPage, perPage: suggestionsPerPage, setPage: setSuggestionsPage, setPerPage: setSuggestionsPerPage, paginatedSlice: suggestionsPaginate } = usePagination(suggestionsList.length, 5)
  const paginatedComments = commentsPaginate(commentsList)
  const paginatedSuggestions = suggestionsPaginate(suggestionsList)

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
      fetchReplies(ratingIds)
    }
    setLoading(false)
  }

  const fetchReplies = async (ratingIds: string[]) => {
    if (ratingIds.length === 0) return

    const { data: repliesData } = await insforge.database
      .from('comment_replies')
      .select('id, rating_id, user_id, content, created_at')
      .in('rating_id', ratingIds)
      .order('created_at', { ascending: true })

    const userIds = [...new Set((repliesData || []).map(r => r.user_id))]

    let profilesMap: Record<string, string> = {}
    if (userIds.length > 0) {
      const { data: profilesData } = await insforge.database
        .from('profiles')
        .select('user_id, name')
        .in('user_id', userIds)

      for (const p of profilesData || []) {
        profilesMap[p.user_id] = p.name
      }
    }

    const grouped: Record<string, Reply[]> = {}
    for (const reply of repliesData || []) {
      if (!grouped[reply.rating_id]) grouped[reply.rating_id] = []
      grouped[reply.rating_id].push({
        ...reply,
        user_name: profilesMap[reply.user_id] || 'Usuario'
      })
    }

    setRepliesMap(grouped)
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

  const addReply = async (ratingId: string) => {
    if (!user || !replyText.trim()) return

    const content = replyText.trim()
    const tempId = `temp-${Date.now()}`
    const userName = profile?.name || 'Tú'

    setRepliesMap(prev => ({
      ...prev,
      [ratingId]: [
        ...(prev[ratingId] || []),
        { id: tempId, rating_id: ratingId, user_id: user.id, content, created_at: new Date().toISOString(), user_name: userName }
      ]
    }))
    setReplyText('')
    setReplyingTo(null)

    const { data, error } = await insforge.database
      .from('comment_replies')
      .insert([{ rating_id: ratingId, user_id: user.id, content }])
      .select('id, created_at')
      .single()

    if (error) {
      setRepliesMap(prev => ({
        ...prev,
        [ratingId]: (prev[ratingId] || []).filter(r => r.id !== tempId)
      }))
      showToast('No se pudo enviar la respuesta', 'error')
    } else {
      setRepliesMap(prev => ({
        ...prev,
        [ratingId]: (prev[ratingId] || []).map(r =>
          r.id === tempId ? { ...r, id: data.id, created_at: data.created_at } : r
        )
      }))
      showToast('Respuesta enviada')
    }
  }

  const canEdit = (ownerId: string) => user?.id === ownerId || profile?.role === 'admin' || profile?.role === 'teacher'

  const updateRating = async (ratingId: string) => {
    const { error } = await insforge.database
      .from('ratings')
      .update({ comment: editRatingText.comment, suggestion: editRatingText.suggestion })
      .eq('id', ratingId)

    if (error) {
      showToast('No se pudo editar el comentario', 'error')
    } else {
      setRatings(prev => prev.map(r =>
        r.id === ratingId ? { ...r, comment: editRatingText.comment, suggestion: editRatingText.suggestion } : r
      ))
      setEditingRating(null)
      showToast('Comentario editado')
    }
  }

  const deleteComment = async (ratingId: string) => {
    if (!confirm('¿Eliminar este comentario?')) return
    const { error } = await insforge.database
      .from('ratings')
      .update({ comment: '' })
      .eq('id', ratingId)

    if (error) {
      showToast('No se pudo eliminar el comentario', 'error')
    } else {
      setRatings(prev => prev.map(r => r.id === ratingId ? { ...r, comment: '' } : r))
      showToast('Comentario eliminado')
    }
  }

  const deleteSuggestion = async (ratingId: string) => {
    if (!confirm('¿Eliminar esta sugerencia?')) return
    const { error } = await insforge.database
      .from('ratings')
      .update({ suggestion: '' })
      .eq('id', ratingId)

    if (error) {
      showToast('No se pudo eliminar la sugerencia', 'error')
    } else {
      setRatings(prev => prev.map(r => r.id === ratingId ? { ...r, suggestion: '' } : r))
      showToast('Sugerencia eliminada')
    }
  }

  const deleteRating = async (ratingId: string) => {
    if (!confirm('¿Eliminar esta evaluación completa? Esta acción no se puede deshacer.')) return
    const { error } = await insforge.database
      .from('ratings')
      .delete()
      .eq('id', ratingId)

    if (error) {
      showToast('No se pudo eliminar la evaluación', 'error')
    } else {
      setRatings(prev => prev.filter(r => r.id !== ratingId))
      showToast('Evaluación eliminada')
    }
  }

  const updateReply = async (replyId: string, ratingId: string) => {
    const { error } = await insforge.database
      .from('comment_replies')
      .update({ content: editReplyText })
      .eq('id', replyId)

    if (error) {
      showToast('No se pudo editar la respuesta', 'error')
    } else {
      setRepliesMap(prev => ({
        ...prev,
        [ratingId]: (prev[ratingId] || []).map(r => r.id === replyId ? { ...r, content: editReplyText } : r)
      }))
      setEditingReply(null)
      showToast('Respuesta editada')
    }
  }

  const deleteReply = async (replyId: string, ratingId: string) => {
    const { error } = await insforge.database
      .from('comment_replies')
      .delete()
      .eq('id', replyId)

    if (error) {
      showToast('No se pudo eliminar la respuesta', 'error')
    } else {
      setRepliesMap(prev => ({
        ...prev,
        [ratingId]: (prev[ratingId] || []).filter(r => r.id !== replyId)
      }))
      showToast('Respuesta eliminada')
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

      <div className="mb-lg">
        {(isSessionToday(session?.date || '') || profile?.role === 'admin') ? (
          <Link
            to={`/sessions/${sessionId}/rate`}
            className="inline-flex items-center gap-xs bg-primary text-on-primary font-bold py-2 px-lg rounded-full font-label-md text-label-md hover:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined text-lg">rate_review</span>
            {profile?.role === 'student' ? 'Evaluar esta sesión' : 'Ver mi evaluación'}
          </Link>
        ) : (
          <div className="inline-flex items-center gap-sm bg-tertiary-container text-on-tertiary-container py-2 px-lg rounded-xl font-body-sm text-body-sm">
            <span className="material-symbols-outlined text-lg">info</span>
            <span>Solo se puede evaluar la sesión el mismo día que corresponde a su fecha.</span>
          </div>
        )}
      </div>

      <div className="flex gap-sm mb-lg flex-wrap justify-center">
        <button
          title="Comentarios"
          onClick={() => setActiveTab('comments')}
          className={`flex items-center gap-xs px-md py-2 rounded-xl font-body-sm text-body-sm transition-colors ${
            activeTab === 'comments'
              ? 'bg-primary-container text-on-primary-container font-bold'
              : 'text-on-surface-variant hover:bg-secondary-container'
          }`}
        >
          <span className="material-symbols-outlined text-lg">comment</span>
          <span className="hidden sm:inline">Comentarios</span>
        </button>
        <button
          title="Sugerencias"
          onClick={() => setActiveTab('suggestions')}
          className={`flex items-center gap-xs px-md py-2 rounded-xl font-body-sm text-body-sm transition-colors ${
            activeTab === 'suggestions'
              ? 'bg-primary-container text-on-primary-container font-bold'
              : 'text-on-surface-variant hover:bg-secondary-container'
          }`}
        >
          <span className="material-symbols-outlined text-lg">lightbulb</span>
          <span className="hidden sm:inline">Sugerencias</span>
        </button>
      </div>

      {activeTab === 'comments' && (
        <>
          {commentsList.length === 0 ? (
            <div className="text-center py-lg">
              <span className="material-symbols-outlined text-on-surface-variant text-[48px] mb-md block">chat_bubble_outline</span>
              <p className="font-body-md text-body-md text-on-surface-variant">No hay comentarios aún.</p>
            </div>
          ) : (
            <div className="space-y-md">
              {paginatedComments.map((rating) => (
                <article key={rating.id} className="bg-surface border border-outline-variant rounded-xl p-lg">
                  <div className="flex justify-between items-start mb-md">
                    <div className="flex items-center gap-sm">
                      <span className="font-headline-sm text-headline-sm text-primary font-bold">{rating.score}/10</span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">
                        {new Date(rating.created_at).toLocaleDateString('es-ES')}
                      </span>
                    </div>
                    <div className="flex items-center gap-xs">
                      {canEdit(rating.student_id) && (
                        <>
                          <button
                            onClick={() => { setEditingRating(rating.id); setEditRatingText({ comment: rating.comment || '', suggestion: rating.suggestion || '' }) }}
                            className="p-xs rounded-full text-on-surface-variant hover:text-primary hover:bg-secondary-container transition-colors"
                          >
                            <span className="material-symbols-outlined text-lg">edit</span>
                          </button>
                          <button
                            onClick={() => deleteComment(rating.id)}
                            className="p-xs rounded-full text-on-surface-variant hover:text-error hover:bg-error-container transition-colors"
                          >
                            <span className="material-symbols-outlined text-lg">delete</span>
                          </button>
                        </>
                      )}
                      {profile?.role === 'admin' && (
                        <button
                          onClick={() => deleteRating(rating.id)}
                          title="Eliminar evaluación completa"
                          className="p-xs rounded-full text-on-surface-variant hover:text-error hover:bg-error-container transition-colors"
                        >
                          <span className="material-symbols-outlined text-lg">remove_circle</span>
                        </button>
                      )}
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
                  </div>

                  {editingRating === rating.id ? (
                    <div className="mb-md space-y-sm">
                      <textarea
                        value={editRatingText.comment}
                        onChange={e => setEditRatingText(prev => ({ ...prev, comment: e.target.value }))}
                        placeholder="Comentario..."
                        rows={3}
                        className="w-full bg-surface-container-low rounded-xl px-md py-sm font-body-sm text-body-sm text-on-surface outline-none focus:ring-1 focus:ring-primary resize-none"
                      />
                      <div className="flex gap-sm justify-end">
                        <button
                          onClick={() => updateRating(rating.id)}
                          className="px-md py-xs rounded-full bg-primary text-on-primary font-label-sm text-label-sm"
                        >
                          Guardar
                        </button>
                        <button
                          onClick={() => setEditingRating(null)}
                          className="px-md py-xs rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="font-body-md text-body-md text-on-surface mb-md">{rating.comment}</p>
                  )}

                  {(repliesMap[rating.id]?.length || 0) > 0 && (
                    <div className="mt-md space-y-sm border-t border-outline-variant pt-md">
                      {repliesMap[rating.id]?.map(reply => (
                        <div key={reply.id} className="flex gap-sm items-start">
                          <span className="material-symbols-outlined text-sm text-on-surface-variant mt-[2px]">reply</span>
                          <div className="flex-1">
                            <div className="flex items-center gap-xs">
                              <span className="font-label-sm text-label-sm text-on-surface font-semibold">{reply.user_name}</span>
                              <span className="font-body-xs text-body-xs text-on-surface-variant">
                                {new Date(reply.created_at).toLocaleDateString('es-ES')}
                              </span>
                              {canEdit(reply.user_id) && (
                                <>
                                  <button
                                    onClick={() => { setEditingReply(reply.id); setEditReplyText(reply.content) }}
                                    className="p-[2px] rounded-full text-on-surface-variant hover:text-primary transition-colors"
                                  >
                                    <span className="material-symbols-outlined text-sm">edit</span>
                                  </button>
                                  <button
                                    onClick={() => deleteReply(reply.id, rating.id)}
                                    className="p-[2px] rounded-full text-on-surface-variant hover:text-error transition-colors"
                                  >
                                    <span className="material-symbols-outlined text-sm">delete</span>
                                  </button>
                                </>
                              )}
                            </div>
                            {editingReply === reply.id ? (
                              <div className="mt-xs flex flex-col gap-xs">
                                <textarea
                                  value={editReplyText}
                                  onChange={e => setEditReplyText(e.target.value)}
                                  rows={2}
                                  className="w-full bg-surface-container-low rounded-xl px-md py-xs font-body-sm text-body-sm text-on-surface outline-none focus:ring-1 focus:ring-primary resize-none"
                                />
                                <div className="flex gap-xs justify-end">
                                  <button
                                    onClick={() => updateReply(reply.id, rating.id)}
                                    className="px-sm py-[2px] rounded-full bg-primary text-on-primary font-label-xs text-label-xs"
                                  >
                                    Guardar
                                  </button>
                                  <button
                                    onClick={() => setEditingReply(null)}
                                    className="px-sm py-[2px] rounded-full bg-surface-container text-on-surface-variant font-label-xs text-label-xs"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <p className="font-body-sm text-body-sm text-on-surface">{reply.content}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {replyingTo === rating.id ? (
                    <div className="mt-md flex flex-col gap-sm">
                      <textarea
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        placeholder="Escribe una respuesta..."
                        rows={3}
                        autoFocus
                        className="w-full bg-surface-container-low rounded-xl px-md py-sm font-body-sm text-body-sm text-on-surface outline-none focus:ring-1 focus:ring-primary resize-none"
                      />
                      <div className="flex gap-sm justify-end">
                        <button
                          onClick={() => addReply(rating.id)}
                          disabled={!replyText.trim()}
                          className="px-md py-xs rounded-full bg-primary text-on-primary font-label-sm text-label-sm disabled:opacity-50"
                        >
                          Enviar
                        </button>
                        <button
                          onClick={() => { setReplyingTo(null); setReplyText('') }}
                          className="px-md py-xs rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setReplyingTo(rating.id)}
                      className="mt-md flex items-center gap-xs text-on-surface-variant hover:text-primary font-label-sm text-label-sm transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">chat_bubble_outline</span>
                      Responder
                    </button>
                  )}
                </article>
              ))}
            </div>
          )}
          {commentsList.length > 0 && (
            <Pagination
              totalItems={commentsList.length}
              page={commentsPage}
              perPage={commentsPerPage}
              onPageChange={setCommentsPage}
              onPerPageChange={setCommentsPerPage}
            />
          )}
        </>
      )}

      {activeTab === 'suggestions' && (
        <>
          {suggestionsList.length === 0 ? (
            <div className="text-center py-lg">
              <span className="material-symbols-outlined text-on-surface-variant text-[48px] mb-md block">lightbulb</span>
              <p className="font-body-md text-body-md text-on-surface-variant">No hay sugerencias aún.</p>
            </div>
          ) : (
            <div className="space-y-md">
              {paginatedSuggestions.map((rating) => (
                <article key={rating.id} className="bg-surface border border-outline-variant rounded-xl p-lg">
                  <div className="flex justify-between items-start mb-md">
                    <div className="flex items-center gap-sm">
                      <span className="font-headline-sm text-headline-sm text-primary font-bold">{rating.score}/10</span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">
                        {new Date(rating.created_at).toLocaleDateString('es-ES')}
                      </span>
                    </div>
                    <div className="flex items-center gap-xs">
                      {canEdit(rating.student_id) && (
                        <>
                          <button
                            onClick={() => { setEditingRating(rating.id); setEditRatingText({ comment: rating.comment || '', suggestion: rating.suggestion || '' }) }}
                            className="p-xs rounded-full text-on-surface-variant hover:text-primary hover:bg-secondary-container transition-colors"
                          >
                            <span className="material-symbols-outlined text-lg">edit</span>
                          </button>
                          <button
                            onClick={() => deleteSuggestion(rating.id)}
                            className="p-xs rounded-full text-on-surface-variant hover:text-error hover:bg-error-container transition-colors"
                          >
                            <span className="material-symbols-outlined text-lg">delete</span>
                          </button>
                        </>
                      )}
                      {profile?.role === 'admin' && (
                        <button
                          onClick={() => deleteRating(rating.id)}
                          title="Eliminar evaluación completa"
                          className="p-xs rounded-full text-on-surface-variant hover:text-error hover:bg-error-container transition-colors"
                        >
                          <span className="material-symbols-outlined text-lg">remove_circle</span>
                        </button>
                      )}
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
                  </div>

                  {editingRating === rating.id ? (
                    <div className="mb-md space-y-sm">
                      <textarea
                        value={editRatingText.suggestion}
                        onChange={e => setEditRatingText(prev => ({ ...prev, suggestion: e.target.value }))}
                        placeholder="Sugerencia..."
                        rows={3}
                        className="w-full bg-surface-container-low rounded-xl px-md py-sm font-body-sm text-body-sm text-on-surface outline-none focus:ring-1 focus:ring-primary resize-none"
                      />
                      <div className="flex gap-sm justify-end">
                        <button
                          onClick={() => updateRating(rating.id)}
                          className="px-md py-xs rounded-full bg-primary text-on-primary font-label-sm text-label-sm"
                        >
                          Guardar
                        </button>
                        <button
                          onClick={() => setEditingRating(null)}
                          className="px-md py-xs rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="font-body-md text-body-md text-on-surface mb-md">{rating.suggestion}</p>
                  )}

                  {(repliesMap[rating.id]?.length || 0) > 0 && (
                    <div className="mt-md space-y-sm border-t border-outline-variant pt-md">
                      {repliesMap[rating.id]?.map(reply => (
                        <div key={reply.id} className="flex gap-sm items-start">
                          <span className="material-symbols-outlined text-sm text-on-surface-variant mt-[2px]">reply</span>
                          <div className="flex-1">
                            <div className="flex items-center gap-xs">
                              <span className="font-label-sm text-label-sm text-on-surface font-semibold">{reply.user_name}</span>
                              <span className="font-body-xs text-body-xs text-on-surface-variant">
                                {new Date(reply.created_at).toLocaleDateString('es-ES')}
                              </span>
                              {canEdit(reply.user_id) && (
                                <>
                                  <button
                                    onClick={() => { setEditingReply(reply.id); setEditReplyText(reply.content) }}
                                    className="p-[2px] rounded-full text-on-surface-variant hover:text-primary transition-colors"
                                  >
                                    <span className="material-symbols-outlined text-sm">edit</span>
                                  </button>
                                  <button
                                    onClick={() => deleteReply(reply.id, rating.id)}
                                    className="p-[2px] rounded-full text-on-surface-variant hover:text-error transition-colors"
                                  >
                                    <span className="material-symbols-outlined text-sm">delete</span>
                                  </button>
                                </>
                              )}
                            </div>
                            {editingReply === reply.id ? (
                              <div className="mt-xs flex flex-col gap-xs">
                                <textarea
                                  value={editReplyText}
                                  onChange={e => setEditReplyText(e.target.value)}
                                  rows={2}
                                  className="w-full bg-surface-container-low rounded-xl px-md py-xs font-body-sm text-body-sm text-on-surface outline-none focus:ring-1 focus:ring-primary resize-none"
                                />
                                <div className="flex gap-xs justify-end">
                                  <button
                                    onClick={() => updateReply(reply.id, rating.id)}
                                    className="px-sm py-[2px] rounded-full bg-primary text-on-primary font-label-xs text-label-xs"
                                  >
                                    Guardar
                                  </button>
                                  <button
                                    onClick={() => setEditingReply(null)}
                                    className="px-sm py-[2px] rounded-full bg-surface-container text-on-surface-variant font-label-xs text-label-xs"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <p className="font-body-sm text-body-sm text-on-surface">{reply.content}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {replyingTo === rating.id ? (
                    <div className="mt-md flex flex-col gap-sm">
                      <textarea
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        placeholder="Escribe una respuesta..."
                        rows={3}
                        autoFocus
                        className="w-full bg-surface-container-low rounded-xl px-md py-sm font-body-sm text-body-sm text-on-surface outline-none focus:ring-1 focus:ring-primary resize-none"
                      />
                      <div className="flex gap-sm justify-end">
                        <button
                          onClick={() => addReply(rating.id)}
                          disabled={!replyText.trim()}
                          className="px-md py-xs rounded-full bg-primary text-on-primary font-label-sm text-label-sm disabled:opacity-50"
                        >
                          Enviar
                        </button>
                        <button
                          onClick={() => { setReplyingTo(null); setReplyText('') }}
                          className="px-md py-xs rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setReplyingTo(rating.id)}
                      className="mt-md flex items-center gap-xs text-on-surface-variant hover:text-primary font-label-sm text-label-sm transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">chat_bubble_outline</span>
                      Responder
                    </button>
                  )}
                </article>
              ))}
            </div>
          )}
          {suggestionsList.length > 0 && (
            <Pagination
              totalItems={suggestionsList.length}
              page={suggestionsPage}
              perPage={suggestionsPerPage}
              onPageChange={setSuggestionsPage}
              onPerPageChange={setSuggestionsPerPage}
            />
          )}
        </>
      )}

      {toast && (
        <div className={`fixed bottom-20 md:bottom-lg left-1/2 -translate-x-1/2 z-50 max-w-[calc(100vw-2rem)] px-lg py-sm rounded-xl border shadow-lg font-body-sm text-body-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis transition-all ${
          toast.type === 'success' ? 'bg-success-container text-on-success-container' : 'bg-error-container text-on-error-container'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  )
}
