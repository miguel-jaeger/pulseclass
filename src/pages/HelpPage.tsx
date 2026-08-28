import { useState, useEffect } from 'react'
import { insforge } from '../lib/insforge'
import { useAuth } from '../hooks/useAuth'
import { Pagination, usePagination } from '../components/Pagination'

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
  likes?: number
  dislikes?: number
  userVote?: number | null
}

interface CommentReply {
  id: string
  comment_id: string
  user_id: string
  content: string
  created_at: string
  updated_at: string
  user_name?: string
  likes?: number
  dislikes?: number
  userVote?: number | null
}

interface VideoLike {
  target_id: string
  value: number
  user_id: string
}

export function HelpPage() {
  const { user, profile } = useAuth()
  const [videos, setVideos] = useState<HelpVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedVideo, setExpandedVideo] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [commentsMap, setCommentsMap] = useState<Record<string, HelpComment[]>>({})
  const [repliesMap, setRepliesMap] = useState<Record<string, CommentReply[]>>({})
  const [newComment, setNewComment] = useState<Record<string, string>>({})
  const [editingComment, setEditingComment] = useState<string | null>(null)
  const [editCommentText, setEditCommentText] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [editingReply, setEditingReply] = useState<string | null>(null)
  const [editReplyText, setEditReplyText] = useState('')
  const [videoLikes, setVideoLikes] = useState<Record<string, { likes: number; dislikes: number; userVote: number | null }>>({})
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [expandedCommentPage, setExpandedCommentPage] = useState(1)
  const commentsPerPage = 5

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => { fetchVideos() }, [])

  const fetchVideos = async () => {
    setLoading(true)
    const { data } = await insforge.database
      .from('help_videos')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) {
      setVideos(data as HelpVideo[])
      const ids = (data as HelpVideo[]).map(v => v.id)
      await Promise.all([fetchComments(ids), fetchVideoLikes(ids)])
    }
    setLoading(false)
  }

  const fetchComments = async (videoIds: string[]) => {
    if (videoIds.length === 0) return
    const { data } = await insforge.database
      .from('help_comments')
      .select('*')
      .in('video_id', videoIds)
      .order('created_at', { ascending: true })

    const userIds = [...new Set((data || []).map(c => c.user_id))]
    let userNames: Record<string, string> = {}
    if (userIds.length > 0) {
      const { data: p } = await insforge.database.from('profiles').select('user_id, name').in('user_id', userIds)
      for (const r of (p || []) as { user_id: string; name: string }[]) userNames[r.user_id] = r.name
    }

    const commentIds = (data || []).map(c => c.id)
    const [likesData, repliesData] = await Promise.all([
      commentIds.length > 0
        ? insforge.database.from('help_likes').select('target_id, value, user_id').eq('target_type', 'comment').in('target_id', commentIds)
        : { data: [] },
      commentIds.length > 0
        ? insforge.database.from('help_comment_replies').select('*').in('comment_id', commentIds).order('created_at', { ascending: true })
        : { data: [] }
    ])

    const likesMap: Record<string, { likes: number; dislikes: number; userVote: number | null }> = {}
    for (const l of (likesData.data || []) as VideoLike[]) {
      if (!likesMap[l.target_id]) likesMap[l.target_id] = { likes: 0, dislikes: 0, userVote: null }
      if (l.value === 1) likesMap[l.target_id].likes++
      else likesMap[l.target_id].dislikes++
      if (l.user_id === user?.id) likesMap[l.target_id].userVote = l.value
    }

    const replyUserIds = [...new Set((repliesData.data || []).map((r: CommentReply) => r.user_id))]
    let replyNames: Record<string, string> = {}
    if (replyUserIds.length > 0) {
      const { data: rp } = await insforge.database.from('profiles').select('user_id, name').in('user_id', replyUserIds)
      for (const r of (rp || []) as { user_id: string; name: string }[]) replyNames[r.user_id] = r.name
    }

    const replyLikesData = (repliesData.data || []).length > 0
      ? await insforge.database.from('help_likes').select('target_id, value, user_id').eq('target_type', 'reply').in('target_id', (repliesData.data || []).map((r: CommentReply) => r.id))
      : { data: [] }

    const replyLikesMap: Record<string, { likes: number; dislikes: number; userVote: number | null }> = {}
    for (const l of (replyLikesData.data || []) as VideoLike[]) {
      if (!replyLikesMap[l.target_id]) replyLikesMap[l.target_id] = { likes: 0, dislikes: 0, userVote: null }
      if (l.value === 1) replyLikesMap[l.target_id].likes++
      else replyLikesMap[l.target_id].dislikes++
      if (l.user_id === user?.id) replyLikesMap[l.target_id].userVote = l.value
    }

    const groupedReplies: Record<string, CommentReply[]> = {}
    for (const r of (repliesData.data || []) as CommentReply[]) {
      if (!groupedReplies[r.comment_id]) groupedReplies[r.comment_id] = []
      const rl = replyLikesMap[r.id] || { likes: 0, dislikes: 0, userVote: null }
      groupedReplies[r.comment_id].push({ ...r, user_name: replyNames[r.user_id] || 'Usuario', likes: rl.likes, dislikes: rl.dislikes, userVote: rl.userVote })
    }
    setRepliesMap(groupedReplies)

    const grouped: Record<string, HelpComment[]> = {}
    for (const c of data || []) {
      if (!grouped[c.video_id]) grouped[c.video_id] = []
      const cl = likesMap[c.id] || { likes: 0, dislikes: 0, userVote: null }
      grouped[c.video_id].push({ ...c, user_name: userNames[c.user_id] || 'Usuario', likes: cl.likes, dislikes: cl.dislikes, userVote: cl.userVote })
    }
    setCommentsMap(grouped)
  }

  const fetchVideoLikes = async (videoIds: string[]) => {
    if (videoIds.length === 0) return
    const { data } = await insforge.database
      .from('help_likes')
      .select('target_id, value, user_id')
      .eq('target_type', 'video')
      .in('target_id', videoIds)

    const map: Record<string, { likes: number; dislikes: number; userVote: number | null }> = {}
    for (const v of videoIds) map[v] = { likes: 0, dislikes: 0, userVote: null }
    for (const l of (data || []) as VideoLike[]) {
      if (l.value === 1) map[l.target_id].likes++
      else map[l.target_id].dislikes++
      if (l.user_id === user?.id) map[l.target_id].userVote = l.value
    }
    setVideoLikes(map)
  }

  const toggleVideoLike = async (videoId: string, value: number) => {
    if (!user) return
    const prev = videoLikes[videoId]
    const currentVote = prev?.userVote
    const newVote = currentVote === value ? null : value

    setVideoLikes(p => ({
      ...p,
      [videoId]: {
        likes: (prev?.likes || 0) + (newVote === 1 ? 1 : 0) - (currentVote === 1 ? 1 : 0),
        dislikes: (prev?.dislikes || 0) + (newVote === -1 ? 1 : 0) - (currentVote === -1 ? 1 : 0),
        userVote: newVote
      }
    }))

    if (currentVote === value) {
      await insforge.database.from('help_likes').delete().eq('user_id', user.id).eq('target_type', 'video').eq('target_id', videoId)
    } else if (currentVote !== null) {
      await insforge.database.from('help_likes').update({ value: newVote }).eq('user_id', user.id).eq('target_type', 'video').eq('target_id', videoId)
    } else {
      await insforge.database.from('help_likes').insert([{ user_id: user.id, target_type: 'video', target_id: videoId, value: newVote }])
    }
  }

  const toggleCommentLike = async (commentId: string, videoId: string, value: number) => {
    if (!user) return
    const prev = commentsMap[videoId]?.find(c => c.id === commentId)
    const currentVote = prev?.userVote ?? null
    const newVote = currentVote === value ? null : value

    setCommentsMap(p => ({
      ...p,
      [videoId]: (p[videoId] || []).map(c => c.id === commentId ? {
        ...c,
        likes: (c.likes || 0) + (newVote === 1 ? 1 : 0) - (currentVote === 1 ? 1 : 0),
        dislikes: (c.dislikes || 0) + (newVote === -1 ? 1 : 0) - (currentVote === -1 ? 1 : 0),
        userVote: newVote
      } : c)
    }))

    if (currentVote === value) {
      await insforge.database.from('help_likes').delete().eq('user_id', user.id).eq('target_type', 'comment').eq('target_id', commentId)
    } else if (currentVote !== null) {
      await insforge.database.from('help_likes').update({ value: newVote }).eq('user_id', user.id).eq('target_type', 'comment').eq('target_id', commentId)
    } else {
      await insforge.database.from('help_likes').insert([{ user_id: user.id, target_type: 'comment', target_id: commentId, value: newVote }])
    }
  }

  const toggleReplyLike = async (replyId: string, commentId: string, _videoId: string, value: number) => {
    if (!user) return
    const prev = repliesMap[commentId]?.find(r => r.id === replyId)
    const currentVote = prev?.userVote ?? null
    const newVote = currentVote === value ? null : value

    setRepliesMap(p => ({
      ...p,
      [commentId]: (p[commentId] || []).map(r => r.id === replyId ? {
        ...r,
        likes: (r.likes || 0) + (newVote === 1 ? 1 : 0) - (currentVote === 1 ? 1 : 0),
        dislikes: (r.dislikes || 0) + (newVote === -1 ? 1 : 0) - (currentVote === -1 ? 1 : 0),
        userVote: newVote
      } : r)
    }))

    if (currentVote === value) {
      await insforge.database.from('help_likes').delete().eq('user_id', user.id).eq('target_type', 'reply').eq('target_id', replyId)
    } else if (currentVote !== null) {
      await insforge.database.from('help_likes').update({ value: newVote }).eq('user_id', user.id).eq('target_type', 'reply').eq('target_id', replyId)
    } else {
      await insforge.database.from('help_likes').insert([{ user_id: user.id, target_type: 'reply', target_id: replyId, value: newVote }])
    }
  }

  const canEdit = (ownerId: string) => user?.id === ownerId || profile?.role === 'admin'

  const addComment = async (videoId: string) => {
    if (!user || !newComment[videoId]?.trim()) return
    const content = newComment[videoId].trim()
    const tempId = `temp-${Date.now()}`
    const userName = profile?.name || 'Tú'

    setCommentsMap(prev => ({
      ...prev,
      [videoId]: [...(prev[videoId] || []), { id: tempId, video_id: videoId, user_id: user.id, content, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), user_name: userName, likes: 0, dislikes: 0, userVote: null }]
    }))
    setNewComment(prev => ({ ...prev, [videoId]: '' }))

    const { data, error } = await insforge.database.from('help_comments').insert([{ video_id: videoId, user_id: user.id, content }]).select('id, created_at').single()
    if (error) {
      setCommentsMap(prev => ({ ...prev, [videoId]: (prev[videoId] || []).filter(c => c.id !== tempId) }))
      showToast('No se pudo enviar el comentario', 'error')
    } else {
      setCommentsMap(prev => ({ ...prev, [videoId]: (prev[videoId] || []).map(c => c.id === tempId ? { ...c, id: data.id, created_at: data.created_at } : c) }))
      showToast('Comentario enviado')
    }
  }

  const updateComment = async (commentId: string, videoId: string) => {
    const { error } = await insforge.database.from('help_comments').update({ content: editCommentText, updated_at: new Date().toISOString() }).eq('id', commentId)
    if (error) { showToast('No se pudo editar', 'error'); return }
    setCommentsMap(prev => ({ ...prev, [videoId]: (prev[videoId] || []).map(c => c.id === commentId ? { ...c, content: editCommentText } : c) }))
    setEditingComment(null)
    showToast('Comentario editado')
  }

  const deleteComment = async (commentId: string, videoId: string) => {
    if (!confirm('¿Eliminar este comentario?')) return
    const { error } = await insforge.database.from('help_comments').delete().eq('id', commentId)
    if (error) { showToast('No se pudo eliminar', 'error'); return }
    setCommentsMap(prev => ({ ...prev, [videoId]: (prev[videoId] || []).filter(c => c.id !== commentId) }))
    showToast('Comentario eliminado')
  }

  const addReply = async (commentId: string) => {
    if (!user || !replyText.trim()) return
    const content = replyText.trim()
    const tempId = `temp-${Date.now()}`
    const userName = profile?.name || 'Tú'

    setRepliesMap(prev => ({
      ...prev,
      [commentId]: [...(prev[commentId] || []), { id: tempId, comment_id: commentId, user_id: user.id, content, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), user_name: userName, likes: 0, dislikes: 0, userVote: null }]
    }))
    setReplyText('')
    setReplyingTo(null)

    const { data, error } = await insforge.database.from('help_comment_replies').insert([{ comment_id: commentId, user_id: user.id, content }]).select('id, created_at').single()
    if (error) {
      setRepliesMap(prev => ({ ...prev, [commentId]: (prev[commentId] || []).filter(r => r.id !== tempId) }))
      showToast('No se pudo enviar la respuesta', 'error')
    } else {
      setRepliesMap(prev => ({ ...prev, [commentId]: (prev[commentId] || []).map(r => r.id === tempId ? { ...r, id: data.id, created_at: data.created_at } : r) }))
      showToast('Respuesta enviada')
    }
  }

  const updateReply = async (replyId: string, commentId: string) => {
    const { error } = await insforge.database.from('help_comment_replies').update({ content: editReplyText, updated_at: new Date().toISOString() }).eq('id', replyId)
    if (error) { showToast('No se pudo editar', 'error'); return }
    setRepliesMap(prev => ({ ...prev, [commentId]: (prev[commentId] || []).map(r => r.id === replyId ? { ...r, content: editReplyText } : r) }))
    setEditingReply(null)
    showToast('Respuesta editada')
  }

  const deleteReply = async (replyId: string, commentId: string) => {
    if (!confirm('¿Eliminar esta respuesta?')) return
    const { error } = await insforge.database.from('help_comment_replies').delete().eq('id', replyId)
    if (error) { showToast('No se pudo eliminar', 'error'); return }
    setRepliesMap(prev => ({ ...prev, [commentId]: (prev[commentId] || []).filter(r => r.id !== replyId) }))
    showToast('Respuesta eliminada')
  }

  const filteredVideos = videos.filter(v =>
    v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (v.description && v.description.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const { page, perPage, setPage, setPerPage, paginatedSlice } = usePagination(filteredVideos.length, 8)
  const paginatedVideos = paginatedSlice(filteredVideos)

  const LikeButtons = ({ likes = 0, dislikes = 0, userVote = null, onLike, onDislike }: { likes?: number; dislikes?: number; userVote?: number | null; onLike: () => void; onDislike: () => void }) => (
    <div className="flex items-center gap-xs">
      <button onClick={onLike} className={`flex items-center gap-xs px-sm py-xs rounded-full font-label-xs text-label-xs transition-colors ${userVote === 1 ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant hover:bg-secondary-container'}`}>
        <span className="material-symbols-outlined text-base" style={userVote === 1 ? { fontVariationSettings: "'FILL' 1" } : undefined}>thumb_up</span>
        <span>{likes}</span>
      </button>
      <button onClick={onDislike} className={`flex items-center gap-xs px-sm py-xs rounded-full font-label-xs text-label-xs transition-colors ${userVote === -1 ? 'bg-error-container text-on-error-container' : 'text-on-surface-variant hover:bg-secondary-container'}`}>
        <span className="material-symbols-outlined text-base" style={userVote === -1 ? { fontVariationSettings: "'FILL' 1" } : undefined}>thumb_down</span>
        <span>{dislikes}</span>
      </button>
    </div>
  )

  if (loading) {
    return (
      <div className="pb-20 md:pb-xl">
        <header className="mb-xl">
          <div className="h-8 w-48 bg-surface-container animate-pulse rounded mb-sm" />
          <div className="h-4 w-96 bg-surface-container animate-pulse rounded" />
        </header>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-lg">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-surface border border-outline-variant rounded-xl overflow-hidden">
              <div className="aspect-video bg-surface-container animate-pulse" />
              <div className="p-md">
                <div className="h-5 w-3/4 bg-surface-container animate-pulse rounded mb-sm" />
                <div className="h-3 w-full bg-surface-container animate-pulse rounded mb-xs" />
                <div className="h-3 w-2/3 bg-surface-container animate-pulse rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="pb-28 md:pb-0">
      <header className="mb-xl">
        <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface">Ayuda</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-xs">Videos tutoriales para sacar el máximo provecho de PulseClass.</p>
      </header>

      {videos.length > 0 && (
        <div className="relative mb-lg">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">search</span>
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Buscar por título o descripción..."
            className="w-full border border-outline-variant rounded-xl pl-10 pr-md py-2 bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary" />
        </div>
      )}

      {videos.length === 0 ? (
        <div className="bg-surface border border-outline-variant rounded-xl p-xl text-center">
          <span className="material-symbols-outlined text-on-surface-variant text-[48px] mb-md block">video_library</span>
          <p className="font-body-md text-body-md text-on-surface-variant">No hay videos disponibles.</p>
        </div>
      ) : filteredVideos.length === 0 ? (
        <div className="bg-surface border border-outline-variant rounded-xl p-xl text-center">
          <span className="material-symbols-outlined text-on-surface-variant text-[48px] mb-md block">search_off</span>
          <p className="font-body-md text-body-md text-on-surface-variant">No se encontraron videos para "{searchQuery}".</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-lg">
          {paginatedVideos.map(video => {
            const vl = videoLikes[video.id] || { likes: 0, dislikes: 0, userVote: null }
            const isExpanded = expandedVideo === video.id
            return (
              <article key={video.id} className={`bg-surface border border-outline-variant rounded-xl overflow-hidden transition-all hover:shadow-lg ${isExpanded ? 'sm:col-span-2 lg:col-span-4' : 'cursor-pointer'}`}
                onClick={() => { if (!isExpanded) { setExpandedVideo(video.id); setExpandedCommentPage(1) } }}>
                {isExpanded ? (
                  <div className="p-lg">
                    <div className="flex items-start justify-between mb-md">
                      <div className="flex-1 min-w-0">
                        <h2 className="font-headline-sm text-headline-sm text-on-surface mb-sm">{video.title}</h2>
                        {video.description && <p className="font-body-md text-body-md text-on-surface-variant">{video.description}</p>}
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); setExpandedVideo(null) }} className="p-xs rounded-full text-on-surface-variant hover:bg-secondary-container transition-colors shrink-0 ml-md">
                        <span className="material-symbols-outlined text-lg">close</span>
                      </button>
                    </div>
                    <div className="aspect-video w-full rounded-xl overflow-hidden mb-md">
                      <iframe src={`https://www.youtube.com/embed/${video.youtube_code}`} title={video.title} className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                    </div>
                    <div className="flex items-center gap-md mb-lg pb-md border-b border-outline-variant">
                      <LikeButtons likes={vl.likes} dislikes={vl.dislikes} userVote={vl.userVote}
                        onLike={(e?: React.MouseEvent) => { e?.stopPropagation(); toggleVideoLike(video.id, 1) }}
                        onDislike={(e?: React.MouseEvent) => { e?.stopPropagation(); toggleVideoLike(video.id, -1) }} />
                      <span className="font-body-xs text-on-surface-variant">
                        {commentsMap[video.id]?.length || 0} comentario{(commentsMap[video.id]?.length || 0) !== 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="space-y-md mb-lg">
                      {(() => {
                        const allComments = commentsMap[video.id] || []
                        const totalCommentPages = Math.ceil(allComments.length / commentsPerPage)
                        const startIdx = (expandedCommentPage - 1) * commentsPerPage
                        const paginatedComments = allComments.slice(startIdx, startIdx + commentsPerPage)
                        return (
                          <>
                            {paginatedComments.map(comment => (
                        <div key={comment.id} className="border-l-2 border-outline-variant pl-md">
                          <div className="flex items-center gap-xs mb-xs">
                            <span className="font-label-sm text-label-sm text-on-surface font-semibold">{comment.user_name}</span>
                            <span className="font-body-xs text-on-surface-variant">{new Date(comment.created_at).toLocaleDateString('es-ES')}</span>
                            {canEdit(comment.user_id) && (
                              <>
                                <button onClick={() => { setEditingComment(comment.id); setEditCommentText(comment.content) }} className="p-[2px] rounded-full text-on-surface-variant hover:text-primary transition-colors">
                                  <span className="material-symbols-outlined text-sm">edit</span>
                                </button>
                                <button onClick={() => deleteComment(comment.id, video.id)} className="p-[2px] rounded-full text-on-surface-variant hover:text-error transition-colors">
                                  <span className="material-symbols-outlined text-sm">delete</span>
                                </button>
                              </>
                            )}
                          </div>
                          {editingComment === comment.id ? (
                            <div className="mb-xs">
                              <textarea value={editCommentText} onChange={e => setEditCommentText(e.target.value)} rows={3}
                                className="w-full bg-surface-container-low rounded-xl px-md py-sm font-body-sm text-body-sm text-on-surface outline-none focus:ring-1 focus:ring-primary resize-none" />
                              <div className="flex gap-xs justify-end mt-xs">
                                <button onClick={() => updateComment(comment.id, video.id)} className="px-sm py-[2px] rounded-full bg-primary text-on-primary font-label-xs text-label-xs">Guardar</button>
                                <button onClick={() => setEditingComment(null)} className="px-sm py-[2px] rounded-full bg-surface-container text-on-surface-variant font-label-xs text-label-xs">Cancelar</button>
                              </div>
                            </div>
                          ) : (
                            <p className="font-body-sm text-body-sm text-on-surface mb-xs">{comment.content}</p>
                          )}
                          <div className="flex items-center gap-sm">
                            <LikeButtons likes={comment.likes} dislikes={comment.dislikes} userVote={comment.userVote}
                              onLike={() => toggleCommentLike(comment.id, video.id, 1)}
                              onDislike={() => toggleCommentLike(comment.id, video.id, -1)} />
                            <button onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                              className="font-label-xs text-label-xs text-on-surface-variant hover:text-primary transition-colors flex items-center gap-xs">
                              <span className="material-symbols-outlined text-sm">reply</span> Responder
                            </button>
                          </div>

                          {(repliesMap[comment.id]?.length || 0) > 0 && (
                            <div className="mt-sm space-y-sm ml-4 border-l-2 border-outline-variant pl-3">
                              {repliesMap[comment.id]?.map(reply => (
                                <div key={reply.id}>
                                  <div className="flex items-center gap-xs mb-xs">
                                    <span className="font-label-xs text-label-xs text-on-surface font-semibold">{reply.user_name}</span>
                                    <span className="font-body-xs text-on-surface-variant">{new Date(reply.created_at).toLocaleDateString('es-ES')}</span>
                                    {canEdit(reply.user_id) && (
                                      <>
                                        <button onClick={() => { setEditingReply(reply.id); setEditReplyText(reply.content) }} className="p-[2px] rounded-full text-on-surface-variant hover:text-primary transition-colors">
                                          <span className="material-symbols-outlined text-xs">edit</span>
                                        </button>
                                        <button onClick={() => deleteReply(reply.id, comment.id)} className="p-[2px] rounded-full text-on-surface-variant hover:text-error transition-colors">
                                          <span className="material-symbols-outlined text-xs">delete</span>
                                        </button>
                                      </>
                                    )}
                                  </div>
                                  {editingReply === reply.id ? (
                                    <div className="mb-xs">
                                      <textarea value={editReplyText} onChange={e => setEditReplyText(e.target.value)} rows={2}
                                        className="w-full bg-surface-container-low rounded-xl px-md py-xs font-body-xs text-body-xs text-on-surface outline-none focus:ring-1 focus:ring-primary resize-none" />
                                      <div className="flex gap-xs justify-end mt-xs">
                                        <button onClick={() => updateReply(reply.id, comment.id)} className="px-sm py-[2px] rounded-full bg-primary text-on-primary font-label-xs text-label-xs">Guardar</button>
                                        <button onClick={() => setEditingReply(null)} className="px-sm py-[2px] rounded-full bg-surface-container text-on-surface-variant font-label-xs text-label-xs">Cancelar</button>
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="font-body-xs text-body-xs text-on-surface">{reply.content}</p>
                                  )}
                                  <div className="mt-xs">
                                    <LikeButtons likes={reply.likes} dislikes={reply.dislikes} userVote={reply.userVote}
                                      onLike={() => toggleReplyLike(reply.id, comment.id, video.id, 1)}
                                      onDislike={() => toggleReplyLike(reply.id, comment.id, video.id, -1)} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {replyingTo === comment.id && (
                            <div className="mt-sm ml-4">
                              <textarea value={replyText} onChange={e => setReplyText(e.target.value)} rows={3} placeholder="Escribe una respuesta..." autoFocus
                                className="w-full bg-surface-container-low rounded-xl px-md py-sm font-body-sm text-body-sm text-on-surface outline-none focus:ring-1 focus:ring-primary resize-none" />
                              <div className="flex gap-sm justify-end mt-xs">
                                <button onClick={() => addReply(comment.id)} disabled={!replyText.trim()} className="px-md py-xs rounded-full bg-primary text-on-primary font-label-xs text-label-xs disabled:opacity-50">Enviar</button>
                                <button onClick={() => { setReplyingTo(null); setReplyText('') }} className="px-md py-xs rounded-full bg-surface-container text-on-surface-variant font-label-xs text-label-xs">Cancelar</button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                            {totalCommentPages > 1 && (
                              <div className="flex items-center justify-center gap-sm mt-md pt-md border-t border-outline-variant">
                                <button
                                  onClick={() => setExpandedCommentPage(p => Math.max(1, p - 1))}
                                  disabled={expandedCommentPage <= 1}
                                  className="w-8 h-8 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-secondary-container transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                  <span className="material-symbols-outlined text-lg">chevron_left</span>
                                </button>
                                <span className="font-body-sm text-body-sm text-on-surface min-w-[60px] text-center">
                                  {expandedCommentPage} / {totalCommentPages}
                                </span>
                                <button
                                  onClick={() => setExpandedCommentPage(p => Math.min(totalCommentPages, p + 1))}
                                  disabled={expandedCommentPage >= totalCommentPages}
                                  className="w-8 h-8 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-secondary-container transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                  <span className="material-symbols-outlined text-lg">chevron_right</span>
                                </button>
                              </div>
                            )}
                          </>
                        )
                      })()}
                    </div>

                    <div className="flex gap-sm" onClick={e => e.stopPropagation()}>
                      <textarea value={newComment[video.id] || ''} onChange={e => setNewComment(prev => ({ ...prev, [video.id]: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); addComment(video.id) } }}
                        placeholder="Escribe un comentario... (Ctrl+Enter para enviar)" rows={3}
                        className="flex-1 bg-surface-container-low rounded-xl px-md py-sm font-body-sm text-body-sm text-on-surface outline-none focus:ring-1 focus:ring-primary resize-none" />
                      <button onClick={() => addComment(video.id)} disabled={!newComment[video.id]?.trim()}
                        className="px-md py-sm rounded-full bg-primary text-on-primary font-label-sm text-label-sm disabled:opacity-50 self-end">Enviar</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="aspect-video w-full bg-surface-container relative">
                      <img src={`https://img.youtube.com/vi/${video.youtube_code}/mqdefault.jpg`} alt={video.title} className="w-full h-full object-cover" loading="lazy" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center">
                          <span className="material-symbols-outlined text-white text-2xl">play_arrow</span>
                        </div>
                      </div>
                      <div className="absolute bottom-2 right-2 flex items-center gap-xs bg-black/60 rounded-full px-sm py-xs">
                        <span className="material-symbols-outlined text-white text-sm">thumb_up</span>
                        <span className="text-white font-label-xs text-label-xs">{vl.likes}</span>
                      </div>
                    </div>
                    <div className="p-md">
                      <h3 className="font-body-md text-body-md text-on-surface font-medium mb-xs">{video.title}</h3>
                      {video.description && (
                        <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-3">{video.description}</p>
                      )}
                      {(commentsMap[video.id]?.length || 0) > 0 && (
                        <p className="font-body-xs text-body-xs text-on-surface-variant mt-sm flex items-center gap-xs">
                          <span className="material-symbols-outlined text-xs">comment</span>
                          {commentsMap[video.id]?.length} comentario{(commentsMap[video.id]?.length || 0) !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </>
                )}
              </article>
            )
          })}
        </div>
      )}

      {videos.length > 0 && filteredVideos.length > 0 && (
        <Pagination
          totalItems={filteredVideos.length}
          page={page}
          perPage={perPage}
          onPageChange={setPage}
          onPerPageChange={setPerPage}
        />
      )}

      {toast && (
        <div className={`fixed bottom-20 md:bottom-lg left-1/2 -translate-x-1/2 z-50 max-w-[calc(100vw-2rem)] px-lg py-sm rounded-xl border shadow-lg font-body-sm text-body-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis transition-all ${toast.type === 'success' ? 'bg-success-container text-on-success-container border-success' : 'bg-error-container text-on-error-container border-error'}`}>
          {toast.message}
        </div>
      )}
    </div>
  )
}
