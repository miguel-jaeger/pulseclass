import { useState, useEffect } from 'react'
import { insforge } from '../lib/insforge'
import { useAuth } from '../hooks/useAuth'

interface HelpVideo {
  id: string
  title: string
  description: string
  youtube_code: string
  created_by: string
  created_at: string
}

interface HelpComment {
  id: string
  video_id: string
  user_id: string
  content: string
  created_at: string
  updated_at: string
  user_name?: string
}

export function HelpPage() {
  const { user, profile } = useAuth()
  const [videos, setVideos] = useState<HelpVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [commentsMap, setCommentsMap] = useState<Record<string, HelpComment[]>>({})
  const [newComment, setNewComment] = useState<Record<string, string>>({})
  const [editingComment, setEditingComment] = useState<string | null>(null)
  const [editCommentText, setEditCommentText] = useState('')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    fetchVideos()
  }, [])

  const fetchVideos = async () => {
    setLoading(true)
    const { data } = await insforge.database
      .from('help_videos')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) {
      setVideos(data as HelpVideo[])
      fetchComments((data as HelpVideo[]).map(v => v.id))
    }
    setLoading(false)
  }

  const fetchComments = async (videoIds: string[]) => {
    if (videoIds.length === 0) return

    const { data: commentsData } = await insforge.database
      .from('help_comments')
      .select('*')
      .in('video_id', videoIds)
      .order('created_at', { ascending: true })

    const userIds = [...new Set((commentsData || []).map(c => c.user_id))]
    let userNames: Record<string, string> = {}
    if (userIds.length > 0) {
      const { data: profilesData } = await insforge.database
        .from('profiles')
        .select('user_id, name')
        .in('user_id', userIds)
      for (const p of (profilesData || []) as { user_id: string; name: string }[]) {
        userNames[p.user_id] = p.name
      }
    }

    const grouped: Record<string, HelpComment[]> = {}
    for (const comment of commentsData || []) {
      if (!grouped[comment.video_id]) grouped[comment.video_id] = []
      grouped[comment.video_id].push({
        ...comment,
        user_name: userNames[comment.user_id] || 'Usuario'
      })
    }
    setCommentsMap(grouped)
  }

  const canEditComment = (comment: HelpComment) => {
    return user?.id === comment.user_id || profile?.role === 'admin'
  }

  const addComment = async (videoId: string) => {
    if (!user || !newComment[videoId]?.trim()) return

    const content = newComment[videoId].trim()
    const tempId = `temp-${Date.now()}`
    const userName = profile?.name || 'Tú'

    setCommentsMap(prev => ({
      ...prev,
      [videoId]: [
        ...(prev[videoId] || []),
        { id: tempId, video_id: videoId, user_id: user.id, content, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), user_name: userName }
      ]
    }))
    setNewComment(prev => ({ ...prev, [videoId]: '' }))

    const { data, error } = await insforge.database
      .from('help_comments')
      .insert([{ video_id: videoId, user_id: user.id, content }])
      .select('id, created_at')
      .single()

    if (error) {
      setCommentsMap(prev => ({
        ...prev,
        [videoId]: (prev[videoId] || []).filter(c => c.id !== tempId)
      }))
      showToast('No se pudo enviar el comentario', 'error')
    } else {
      setCommentsMap(prev => ({
        ...prev,
        [videoId]: (prev[videoId] || []).map(c =>
          c.id === tempId ? { ...c, id: data.id, created_at: data.created_at } : c
        )
      }))
      showToast('Comentario enviado')
    }
  }

  const updateComment = async (commentId: string, videoId: string) => {
    const { error } = await insforge.database
      .from('help_comments')
      .update({ content: editCommentText, updated_at: new Date().toISOString() })
      .eq('id', commentId)

    if (error) {
      showToast('No se pudo editar el comentario', 'error')
    } else {
      setCommentsMap(prev => ({
        ...prev,
        [videoId]: (prev[videoId] || []).map(c =>
          c.id === commentId ? { ...c, content: editCommentText } : c
        )
      }))
      setEditingComment(null)
      showToast('Comentario editado')
    }
  }

  const deleteComment = async (commentId: string, videoId: string) => {
    if (!confirm('¿Eliminar este comentario?')) return
    const { error } = await insforge.database
      .from('help_comments')
      .delete()
      .eq('id', commentId)

    if (error) {
      showToast('No se pudo eliminar el comentario', 'error')
    } else {
      setCommentsMap(prev => ({
        ...prev,
        [videoId]: (prev[videoId] || []).filter(c => c.id !== commentId)
      }))
      showToast('Comentario eliminado')
    }
  }

  if (loading) {
    return (
      <div className="space-y-lg">
        <header className="mb-xl">
          <div className="h-8 w-48 bg-surface-container animate-pulse rounded mb-sm" />
          <div className="h-4 w-96 bg-surface-container animate-pulse rounded" />
        </header>
        {[1, 2].map(i => (
          <div key={i} className="bg-surface border border-outline-variant rounded-xl p-lg">
            <div className="h-6 w-64 bg-surface-container animate-pulse rounded mb-md" />
            <div className="h-4 w-full bg-surface-container animate-pulse rounded mb-sm" />
            <div className="aspect-video bg-surface-container animate-pulse rounded-xl" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="pb-20 md:pb-0">
      <header className="mb-xl">
        <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface">Ayuda</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-xs">Videos tutoriales para sacar el máximo provecho de PulseClass.</p>
      </header>

      {videos.length === 0 ? (
        <div className="bg-surface border border-outline-variant rounded-xl p-xl text-center">
          <span className="material-symbols-outlined text-on-surface-variant text-[48px] mb-md block">play_circle</span>
          <p className="font-body-md text-body-md text-on-surface-variant">No hay videos de ayuda disponibles.</p>
        </div>
      ) : (
        <div className="space-y-xl">
          {videos.map(video => (
            <article key={video.id} className="bg-surface border border-outline-variant rounded-xl overflow-hidden">
              <div className="p-lg">
                <h2 className="font-headline-sm text-headline-sm text-on-surface mb-sm">{video.title}</h2>
                {video.description && (
                  <p className="font-body-md text-body-md text-on-surface-variant mb-md">{video.description}</p>
                )}
              </div>
              <div className="aspect-video w-full">
                <iframe
                  src={`https://www.youtube.com/embed/${video.youtube_code}`}
                  title={video.title}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>

              {/* Comentarios */}
              <div className="p-lg border-t border-outline-variant">
                <h3 className="font-body-sm text-body-sm text-on-surface-variant mb-md flex items-center gap-xs">
                  <span className="material-symbols-outlined text-lg">comment</span>
                  Comentarios ({commentsMap[video.id]?.length || 0})
                </h3>

                {(commentsMap[video.id]?.length || 0) > 0 && (
                  <div className="space-y-md mb-md">
                    {commentsMap[video.id]?.map(comment => (
                      <div key={comment.id} className="flex gap-sm items-start">
                        <span className="material-symbols-outlined text-sm text-on-surface-variant mt-[2px]">person</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-xs">
                            <span className="font-label-sm text-label-sm text-on-surface font-semibold">{comment.user_name}</span>
                            <span className="font-body-xs text-body-xs text-on-surface-variant">
                              {new Date(comment.created_at).toLocaleDateString('es-ES')}
                            </span>
                            {canEditComment(comment) && (
                              <>
                                <button
                                  onClick={() => { setEditingComment(comment.id); setEditCommentText(comment.content) }}
                                  className="p-[2px] rounded-full text-on-surface-variant hover:text-primary transition-colors"
                                >
                                  <span className="material-symbols-outlined text-sm">edit</span>
                                </button>
                                <button
                                  onClick={() => deleteComment(comment.id, video.id)}
                                  className="p-[2px] rounded-full text-on-surface-variant hover:text-error transition-colors"
                                >
                                  <span className="material-symbols-outlined text-sm">delete</span>
                                </button>
                              </>
                            )}
                          </div>
                          {editingComment === comment.id ? (
                            <div className="mt-xs flex flex-col gap-xs">
                              <textarea
                                value={editCommentText}
                                onChange={e => setEditCommentText(e.target.value)}
                                rows={2}
                                className="w-full bg-surface-container-low rounded-xl px-md py-xs font-body-sm text-body-sm text-on-surface outline-none focus:ring-1 focus:ring-primary resize-none"
                              />
                              <div className="flex gap-xs justify-end">
                                <button
                                  onClick={() => updateComment(comment.id, video.id)}
                                  className="px-sm py-[2px] rounded-full bg-primary text-on-primary font-label-xs text-label-xs"
                                >
                                  Guardar
                                </button>
                                <button
                                  onClick={() => setEditingComment(null)}
                                  className="px-sm py-[2px] rounded-full bg-surface-container text-on-surface-variant font-label-xs text-label-xs"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="font-body-sm text-body-sm text-on-surface">{comment.content}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-sm">
                  <input
                    type="text"
                    value={newComment[video.id] || ''}
                    onChange={e => setNewComment(prev => ({ ...prev, [video.id]: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addComment(video.id) } }}
                    placeholder="Escribe un comentario..."
                    className="flex-1 bg-surface-container-low rounded-xl px-md py-sm font-body-sm text-body-sm text-on-surface outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button
                    onClick={() => addComment(video.id)}
                    disabled={!newComment[video.id]?.trim()}
                    className="px-md py-sm rounded-full bg-primary text-on-primary font-label-sm text-label-sm disabled:opacity-50"
                  >
                    Enviar
                  </button>
                </div>
              </div>
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
