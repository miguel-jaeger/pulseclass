import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
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

export function HelpAdminPage() {
  const { profile } = useAuth()
  const [videos, setVideos] = useState<HelpVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ title: '', description: '', youtube_code: '' })
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set())

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

  const filteredVideos = videos.filter(v =>
    v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (v.description && v.description.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const { page, perPage, setPage, setPerPage, paginatedSlice } = usePagination(filteredVideos.length, 10)
  const paginatedVideos = paginatedSlice(filteredVideos)

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
      setSelectedVideos(prev => { const n = new Set(prev); n.delete(id); return n })
      showToast('Video eliminado')
    }
  }

  const toggleSelectVideo = (id: string) => {
    setSelectedVideos(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAllVideos = () => {
    if (selectedVideos.size === filteredVideos.length) {
      setSelectedVideos(new Set())
    } else {
      setSelectedVideos(new Set(filteredVideos.map(v => v.id)))
    }
  }

  const deleteSelectedVideos = async () => {
    if (selectedVideos.size === 0) return
    if (!confirm(`¿Eliminar ${selectedVideos.size} video(s)? Esta acción no se puede deshacer.`)) return

    const ids = Array.from(selectedVideos)
    const { error } = await insforge.database
      .from('help_videos')
      .delete()
      .in('id', ids)

    if (error) {
      showToast('No se pudieron eliminar los videos', 'error')
    } else {
      setVideos(prev => prev.filter(v => !selectedVideos.has(v.id)))
      setSelectedVideos(new Set())
      showToast(`${ids.length} video(s) eliminado(s)`)
    }
  }

  if (loading) {
    return (
      <div className="space-y-lg">
        <div className="h-8 w-64 bg-surface-container animate-pulse rounded" />
        <div className="h-4 w-96 bg-surface-container animate-pulse rounded" />
        <div className="bg-surface border border-outline-variant rounded-xl overflow-hidden">
          <table className="w-full hidden md:table">
            <thead>
              <tr className="border-b border-outline-variant">
                <th className="w-10 px-md py-3"><div className="h-4 w-4 bg-surface-container animate-pulse rounded" /></th>
                <th className="text-left px-md py-3"><div className="h-4 w-16 bg-surface-container animate-pulse rounded" /></th>
                <th className="text-left px-md py-3"><div className="h-4 w-24 bg-surface-container animate-pulse rounded" /></th>
                <th className="text-left px-md py-3"><div className="h-4 w-16 bg-surface-container animate-pulse rounded" /></th>
                <th className="text-left px-md py-3"><div className="h-4 w-20 bg-surface-container animate-pulse rounded" /></th>
                <th className="text-right px-md py-3"><div className="h-4 w-16 bg-surface-container animate-pulse rounded" /></th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3].map(i => (
                <tr key={i} className="border-b border-outline-variant last:border-0">
                  <td className="px-md py-3"><div className="h-4 w-4 bg-surface-container animate-pulse rounded" /></td>
                  <td className="px-md py-3"><div className="h-10 w-16 bg-surface-container animate-pulse rounded" /></td>
                  <td className="px-md py-3"><div className="h-4 w-40 bg-surface-container animate-pulse rounded" /></td>
                  <td className="px-md py-3"><div className="h-4 w-48 bg-surface-container animate-pulse rounded" /></td>
                  <td className="px-md py-3"><div className="h-4 w-20 bg-surface-container animate-pulse rounded" /></td>
                  <td className="px-md py-3"><div className="flex gap-sm justify-end"><div className="h-9 w-9 bg-surface-container animate-pulse rounded-full" /><div className="h-9 w-9 bg-surface-container animate-pulse rounded-full" /></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-20 md:pb-0">
      <header className="mb-xl flex flex-col sm:flex-row sm:items-end sm:justify-between gap-md">
        <div className="min-w-0">
          <Link to="/admin" className="flex items-center gap-xs text-primary font-body-sm text-body-sm hover:underline mb-sm">
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            Volver al admin
          </Link>
          <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface">Gestión de Videos</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-xs">Administra los videos tutoriales disponibles para los usuarios.</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-primary text-on-primary font-bold py-1 px-lg rounded-full font-label-md text-label-md hover:opacity-90 transition-opacity flex items-center gap-xs shrink-0"
        >
          <span className="material-symbols-outlined text-lg">video_library</span>
          Crear
        </button>
      </header>

      {showForm && (
        <div className="bg-surface border border-outline-variant rounded-xl p-lg mb-xl overflow-hidden">
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

      {videos.length > 0 && (
        <div className="relative mb-lg overflow-hidden">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar por título o descripción..."
            className="w-full border border-outline-variant rounded-xl pl-10 pr-md py-2 bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary"
          />
        </div>
      )}

      <p className="font-body-sm text-body-sm text-on-surface-variant mb-md">
        Mostrando <span className="font-bold text-on-surface">{paginatedVideos.length}</span> de <span className="font-bold text-on-surface">{filteredVideos.length}</span> videos
      </p>

      {videos.length === 0 ? (
        <div className="bg-surface border border-outline-variant rounded-xl p-xl text-center">
          <span className="material-symbols-outlined text-on-surface-variant text-[48px] mb-md block">play_circle</span>
          <p className="font-body-md text-body-md text-on-surface-variant">No hay videos de ayuda. Crea el primero.</p>
        </div>
      ) : (
        <div className="bg-surface border border-outline-variant rounded-xl overflow-hidden">
          {selectedVideos.size > 0 && (
            <div className="flex items-center justify-between px-md py-2 bg-error-container border-b border-outline-variant">
              <span className="font-body-sm text-body-sm text-on-error-container">
                {selectedVideos.size} video(s) seleccionado(s)
              </span>
              <button
                onClick={deleteSelectedVideos}
                className="bg-error text-on-error font-bold py-1 px-lg rounded-full font-label-md text-label-md hover:opacity-90 transition-opacity flex items-center gap-xs"
              >
                <span className="material-symbols-outlined text-lg">delete</span>
                Eliminar
              </button>
            </div>
          )}
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant">
                  <th className="px-md py-3 text-left w-10">
                    <input
                      type="checkbox"
                      checked={selectedVideos.size === filteredVideos.length && filteredVideos.length > 0}
                      onChange={toggleSelectAllVideos}
                      className="w-4 h-4 accent-primary rounded"
                    />
                  </th>
                  <th className="px-md py-3 text-left font-label-md text-label-md text-on-surface-variant w-16">Vista previa</th>
                  <th className="px-md py-3 text-left font-label-md text-label-md text-on-surface-variant">Título</th>
                  <th className="px-md py-3 text-left font-label-md text-label-md text-on-surface-variant">Descripción</th>
                  <th className="px-md py-3 text-left font-label-md text-label-md text-on-surface-variant w-28">Fecha</th>
                  <th className="px-md py-3 text-left font-label-md text-label-md text-on-surface-variant">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginatedVideos.map(video => (
                  <tr key={video.id} className="border-b border-outline-variant last:border-0 hover:bg-surface-container-low transition-colors">
                    <td className="px-md py-3">
                      <input
                        type="checkbox"
                        checked={selectedVideos.has(video.id)}
                        onChange={() => toggleSelectVideo(video.id)}
                        className="w-4 h-4 accent-primary rounded"
                      />
                    </td>
                    <td className="px-md py-3">
                      <div className="w-16 aspect-video rounded-lg overflow-hidden bg-surface-container">
                        <img
                          src={`https://img.youtube.com/vi/${video.youtube_code}/mqdefault.jpg`}
                          alt={video.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </td>
                    <td className="px-md py-3">
                      <div className="font-body-sm text-body-sm text-on-surface font-medium truncate max-w-[150px] cursor-default" title={video.title}>{video.title}</div>
                    </td>
                    <td className="px-md py-3">
                      {video.description ? (
                        <p className="font-body-sm text-body-sm text-on-surface-variant truncate max-w-[180px] cursor-default" title={video.description}>{video.description}</p>
                      ) : (
                        <span className="font-body-sm text-body-sm text-on-surface-variant italic">Sin descripción</span>
                      )}
                    </td>
                    <td className="px-md py-3">
                      <span className="font-body-xs text-body-xs text-on-surface-variant">
                        {new Date(video.created_at).toLocaleDateString('es-ES')}
                      </span>
                    </td>
                    <td className="px-md py-3">
                      <div className="flex items-center gap-sm">
                        <button
                          onClick={() => openEdit(video)}
                          className="w-9 h-9 flex items-center justify-center rounded-full bg-surface-container text-primary hover:bg-primary-container hover:text-on-primary-container transition-colors"
                          title="Editar"
                        >
                          <span className="material-symbols-outlined text-xl">edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(video.id)}
                          className="w-9 h-9 flex items-center justify-center rounded-full bg-surface-container text-error hover:bg-error-container hover:text-on-error-container transition-colors"
                          title="Eliminar"
                        >
                          <span className="material-symbols-outlined text-xl">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile cards */}
          <div className="md:hidden">
            {paginatedVideos.map(video => (
              <div key={video.id} className="border-b border-outline-variant last:border-0 p-md hover:bg-surface-container-low transition-colors">
                <div className="flex items-start justify-between gap-sm">
                  <div className="flex items-start gap-sm min-w-0 flex-1">
                    <input
                      type="checkbox"
                      checked={selectedVideos.has(video.id)}
                      onChange={() => toggleSelectVideo(video.id)}
                      className="w-4 h-4 accent-primary rounded mt-1 shrink-0"
                    />
                    <div className="w-14 aspect-video rounded-lg overflow-hidden bg-surface-container shrink-0">
                      <img
                        src={`https://img.youtube.com/vi/${video.youtube_code}/mqdefault.jpg`}
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-body-sm text-body-sm text-on-surface font-medium truncate">{video.title}</div>
                      {video.description && (
                        <p className="font-body-xs text-body-xs text-on-surface-variant mt-xs line-clamp-2">{video.description}</p>
                      )}
                      <span className="font-body-xs text-body-xs text-on-surface-variant mt-xs block">
                        {new Date(video.created_at).toLocaleDateString('es-ES')}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-sm shrink-0">
                    <button
                      onClick={() => openEdit(video)}
                      className="w-9 h-9 flex items-center justify-center rounded-full bg-surface-container text-primary hover:bg-primary-container hover:text-on-primary-container transition-colors"
                      title="Editar"
                    >
                      <span className="material-symbols-outlined text-xl">edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(video.id)}
                      className="w-9 h-9 flex items-center justify-center rounded-full bg-surface-container text-error hover:bg-error-container hover:text-on-error-container transition-colors"
                      title="Eliminar"
                    >
                      <span className="material-symbols-outlined text-xl">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {filteredVideos.length === 0 && (
            <div className="text-center py-lg">
              <p className="font-body-md text-body-md text-on-surface-variant">
                {searchQuery ? `No se encontraron videos para "${searchQuery}".` : 'No hay videos de ayuda.'}
              </p>
            </div>
          )}
        </div>
      )}

      <Pagination
        totalItems={filteredVideos.length}
        page={page}
        perPage={perPage}
        onPageChange={setPage}
        onPerPageChange={setPerPage}
      />

      {toast && (
        <div className={`fixed bottom-20 md:bottom-lg left-1/2 -translate-x-1/2 z-50 max-w-[calc(100vw-2rem)] px-lg py-sm rounded-xl border shadow-lg font-body-sm text-body-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis transition-opacity ${
          toast.type === 'success' ? 'bg-success-container text-on-success-container' : 'bg-error-container text-on-error-container'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  )
}
