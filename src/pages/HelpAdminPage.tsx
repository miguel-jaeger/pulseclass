import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
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

export function HelpAdminPage() {
  const { profile } = useAuth()
  const [videos, setVideos] = useState<HelpVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ title: '', description: '', youtube_code: '' })
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
    if (data) setVideos(data as HelpVideo[])
    setLoading(false)
  }

  const resetForm = () => {
    setForm({ title: '', description: '', youtube_code: '' })
    setEditingId(null)
    setShowForm(false)
  }

  const openCreate = () => {
    resetForm()
    setShowForm(true)
  }

  const openEdit = (video: HelpVideo) => {
    setForm({ title: video.title, description: video.description || '', youtube_code: video.youtube_code })
    setEditingId(video.id)
    setShowForm(true)
  }

  const extractYoutubeCode = (input: string): string => {
    const trimmed = input.trim()
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed
    const patterns = [
      /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
      /youtu\.be\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
    ]
    for (const p of patterns) {
      const m = trimmed.match(p)
      if (m) return m[1]
    }
    return trimmed
  }

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.youtube_code.trim()) {
      showToast('Título y código de YouTube son obligatorios', 'error')
      return
    }

    const youtubeCode = extractYoutubeCode(form.youtube_code)

    if (editingId) {
      const { error } = await insforge.database
        .from('help_videos')
        .update({ title: form.title.trim(), description: form.description.trim(), youtube_code: youtubeCode, updated_at: new Date().toISOString() })
        .eq('id', editingId)

      if (error) {
        showToast('No se pudo actualizar el video', 'error')
      } else {
        setVideos(prev => prev.map(v => v.id === editingId ? { ...v, title: form.title.trim(), description: form.description.trim(), youtube_code: youtubeCode } : v))
        showToast('Video actualizado')
        resetForm()
      }
    } else {
      const { data, error } = await insforge.database
        .from('help_videos')
        .insert([{ title: form.title.trim(), description: form.description.trim(), youtube_code: youtubeCode, created_by: profile?.user_id }])
        .select('*')
        .single()

      if (error) {
        showToast('No se pudo crear el video', 'error')
      } else {
        setVideos(prev => [data as HelpVideo, ...prev])
        showToast('Video creado')
        resetForm()
      }
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este video de ayuda?')) return
    const { error } = await insforge.database
      .from('help_videos')
      .delete()
      .eq('id', id)

    if (error) {
      showToast('No se pudo eliminar el video', 'error')
    } else {
      setVideos(prev => prev.filter(v => v.id !== id))
      showToast('Video eliminado')
    }
  }

  if (loading) {
    return (
      <div className="space-y-lg">
        <div className="h-8 w-64 bg-surface-container animate-pulse rounded" />
        <div className="h-4 w-96 bg-surface-container animate-pulse rounded" />
        {[1, 2].map(i => (
          <div key={i} className="bg-surface border border-outline-variant rounded-xl p-lg">
            <div className="h-6 w-48 bg-surface-container animate-pulse rounded mb-sm" />
            <div className="h-4 w-32 bg-surface-container animate-pulse rounded" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="pb-20 md:pb-0">
      <header className="mb-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-md">
        <div>
          <Link to="/admin" className="flex items-center gap-xs text-primary font-body-sm text-body-sm hover:underline mb-sm">
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            Volver al admin
          </Link>
          <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface">Gestión de Videos</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-xs">Administra los videos tutoriales disponibles para los usuarios.</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-primary text-on-primary font-bold py-2 px-lg rounded-full font-label-md text-label-md hover:opacity-90 transition-opacity"
        >
          + Nuevo video
        </button>
      </header>

      {showForm && (
        <div className="bg-surface border border-outline-variant rounded-xl p-lg mb-xl">
          <h2 className="font-headline-sm text-headline-sm text-on-surface mb-lg">
            {editingId ? 'Editar video' : 'Nuevo video'}
          </h2>
          <div className="space-y-md">
            <div>
              <label htmlFor="video-title" className="block font-body-sm text-body-sm text-on-surface-variant mb-xs">Título *</label>
              <input
                id="video-title"
                type="text"
                value={form.title}
                onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Ej: Cómo calificar una sesión"
                className="w-full border border-outline-variant rounded-xl px-md py-2 bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label htmlFor="video-desc" className="block font-body-sm text-body-sm text-on-surface-variant mb-xs">Descripción</label>
              <textarea
                id="video-desc"
                value={form.description}
                onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descripción breve del video..."
                rows={3}
                className="w-full border border-outline-variant rounded-xl px-md py-2 bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary resize-none"
              />
            </div>
            <div>
              <label htmlFor="video-code" className="block font-body-sm text-body-sm text-on-surface-variant mb-xs">Código o URL de YouTube *</label>
              <input
                id="video-code"
                type="text"
                value={form.youtube_code}
                onChange={e => setForm(prev => ({ ...prev, youtube_code: e.target.value }))}
                placeholder="dQw4w9WgXcQ o https://youtube.com/watch?v=..."
                className="w-full border border-outline-variant rounded-xl px-md py-2 bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary"
              />
              <p className="font-body-xs text-body-xs text-on-surface-variant mt-xs">
                Puedes pegar el código del video (11 caracteres) o la URL completa de YouTube.
              </p>
            </div>
            {form.youtube_code && (
              <div>
                <p className="font-body-sm text-body-sm text-on-surface-variant mb-xs">Vista previa:</p>
                <div className="aspect-video max-w-md rounded-xl overflow-hidden border border-outline-variant">
                  <iframe
                    src={`https://www.youtube.com/embed/${extractYoutubeCode(form.youtube_code)}`}
                    title="Vista previa"
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            )}
            <div className="flex gap-sm justify-end">
              <button
                onClick={handleSubmit}
                className="px-lg py-2 rounded-full bg-primary text-on-primary font-label-md text-label-md hover:opacity-90 transition-opacity"
              >
                {editingId ? 'Guardar cambios' : 'Crear video'}
              </button>
              <button
                onClick={resetForm}
                className="px-lg py-2 rounded-full bg-surface-container text-on-surface-variant font-label-md text-label-md"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {videos.length === 0 ? (
        <div className="bg-surface border border-outline-variant rounded-xl p-xl text-center">
          <span className="material-symbols-outlined text-on-surface-variant text-[48px] mb-md block">play_circle</span>
          <p className="font-body-md text-body-md text-on-surface-variant">No hay videos de ayuda. Crea el primero.</p>
        </div>
      ) : (
        <div className="space-y-md">
          {videos.map(video => (
            <div key={video.id} className="bg-surface border border-outline-variant rounded-xl p-lg">
              <div className="flex items-start gap-md">
                <div className="w-40 aspect-video rounded-lg overflow-hidden bg-surface-container shrink-0 hidden sm:block">
                  <img
                    src={`https://img.youtube.com/vi/${video.youtube_code}/mqdefault.jpg`}
                    alt={video.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-body-md text-body-md text-on-surface font-medium truncate">{video.title}</h3>
                  {video.description && (
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-xs line-clamp-2">{video.description}</p>
                  )}
                  <p className="font-body-xs text-body-xs text-on-surface-variant mt-sm">
                    <span className="material-symbols-outlined text-xs align-middle mr-xs">calendar_today</span>
                    {new Date(video.created_at).toLocaleDateString('es-ES')}
                  </p>
                </div>
                <div className="flex gap-sm shrink-0">
                  <button
                    onClick={() => openEdit(video)}
                    className="p-xs rounded-full text-on-surface-variant hover:text-primary hover:bg-secondary-container transition-colors"
                    title="Editar"
                  >
                    <span className="material-symbols-outlined text-lg">edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(video.id)}
                    className="p-xs rounded-full text-on-surface-variant hover:text-error hover:bg-error-container transition-colors"
                    title="Eliminar"
                  >
                    <span className="material-symbols-outlined text-lg">delete</span>
                  </button>
                </div>
              </div>
            </div>
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
