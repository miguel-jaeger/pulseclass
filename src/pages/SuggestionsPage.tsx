import { useState, useEffect, useRef } from 'react'
import { insforge } from '../lib/insforge'
import { useAuth } from '../hooks/useAuth'

const CLOUDINARY_CLOUD = 'dhecags26'
const CLOUDINARY_UPLOAD_PRESET = 'ml_default'
const BASE_URL = import.meta.env.VITE_INSFORGE_URL

interface Suggestion {
  id: string
  user_id: string
  type: string
  description: string
  status: string
  images: string[]
  created_at: string
  updated_at: string
  profiles?: { name: string }
}

const typeLabels: Record<string, string> = {
  mejora: 'Mejora',
  nuevo: 'Nuevo',
  problema: 'Problema',
  contenido: 'Contenido',
}

const statusLabels: Record<string, string> = {
  recibida: 'Recibida',
  revision: 'Revisión',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
  implementada: 'Implementada',
}

const statusStyles: Record<string, string> = {
  recibida: 'bg-gray-100 text-gray-800 border border-gray-300',
  revision: 'bg-amber-100 text-amber-800 border border-amber-300',
  aprobada: 'bg-green-100 text-green-800 border border-green-300',
  rechazada: 'bg-error-container text-on-error-container border border-error/30',
  implementada: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
}

const typeStyles: Record<string, string> = {
  mejora: 'bg-blue-100 text-blue-800 border border-blue-300',
  nuevo: 'bg-purple-100 text-purple-800 border border-purple-300',
  problema: 'bg-orange-100 text-orange-800 border border-orange-300',
  contenido: 'bg-cyan-100 text-cyan-800 border border-cyan-300',
}

async function uploadToCloudinary(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
  formData.append('folder', 'pulseclass')

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) throw new Error('Error al subir imagen')
  const data = await res.json()
  return data.secure_url
}

function getAuthHeaders(): Record<string, string> {
  return insforge.getHttpClient().getHeaders()
}

async function restInsert(table: string, row: Record<string, unknown>) {
  const res = await fetch(`${BASE_URL}/api/database/records/${table}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(row),
  })
  if (!res.ok) throw new Error(`Insert failed: ${res.status}`)
}

async function restUpdate(table: string, id: string, patch: Record<string, unknown>) {
  const res = await fetch(`${BASE_URL}/api/database/records/${table}?id=eq.${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders(), 'Prefer': 'return=minimal' },
    body: JSON.stringify(patch),
  })
  if (!res.ok) throw new Error(`Update failed: ${res.status}`)
}

async function restDelete(table: string, id: string) {
  const res = await fetch(`${BASE_URL}/api/database/records/${table}?id=eq.${id}`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders(), 'Prefer': 'return=minimal' },
  })
  if (!res.ok) throw new Error(`Delete failed: ${res.status}`)
}

export function SuggestionsPage() {
  const { profile, user } = useAuth()
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formType, setFormType] = useState('mejora')
  const [formDescription, setFormDescription] = useState('')
  const [formImages, setFormImages] = useState<File[]>([])
  const [formPreviews, setFormPreviews] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editType, setEditType] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editImages, setEditImages] = useState<string[]>([])
  const [editNewFiles, setEditNewFiles] = useState<File[]>([])
  const [editPreviews, setEditPreviews] = useState<string[]>([])
  const [detailSuggestion, setDetailSuggestion] = useState<Suggestion | null>(null)
  const [detailImageIndex, setDetailImageIndex] = useState(0)
  const createFileRef = useRef<HTMLInputElement>(null)
  const editFileRef = useRef<HTMLInputElement>(null)
  const isAdmin = profile?.role === 'admin'

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  useEffect(() => { fetchSuggestions() }, [])

  const fetchSuggestions = async () => {
    setLoading(true)
    const { data, error } = await insforge.database
      .from('suggestions')
      .select('*, profiles(name)')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setSuggestions(data as Suggestion[])
    }
    setLoading(false)
  }

  const handleFileChange = (files: FileList | null, isEdit: boolean) => {
    if (!files) return
    const newFiles = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (isEdit) {
      setEditNewFiles(prev => [...prev, ...newFiles])
      const newPreviews = newFiles.map(f => URL.createObjectURL(f))
      setEditPreviews(prev => [...prev, ...newPreviews])
    } else {
      setFormImages(prev => [...prev, ...newFiles])
      const newPreviews = newFiles.map(f => URL.createObjectURL(f))
      setFormPreviews(prev => [...prev, ...newPreviews])
    }
  }

  const removeFormImage = (index: number) => {
    URL.revokeObjectURL(formPreviews[index])
    setFormImages(prev => prev.filter((_, i) => i !== index))
    setFormPreviews(prev => prev.filter((_, i) => i !== index))
  }

  const removeEditNewImage = (index: number) => {
    URL.revokeObjectURL(editPreviews[index])
    setEditNewFiles(prev => prev.filter((_, i) => i !== index))
    setEditPreviews(prev => prev.filter((_, i) => i !== index))
  }

  const removeEditExistingImage = (index: number) => {
    setEditImages(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!formDescription.trim() || !user?.id) return
    setUploading(true)

    try {
      const uploadedUrls: string[] = []
      for (const file of formImages) {
        const url = await uploadToCloudinary(file)
        uploadedUrls.push(url)
      }

      await restInsert('suggestions', {
        user_id: user.id,
        type: formType,
        description: formDescription.trim(),
        images: uploadedUrls,
      })

      showToast('Sugerencia enviada correctamente')
      setFormDescription('')
      setFormType('mejora')
      setFormImages([])
      setFormPreviews([])
      setShowForm(false)
      fetchSuggestions()
    } catch {
      showToast('Error al enviar la sugerencia', 'error')
    }
    setUploading(false)
  }

  const handleEdit = (s: Suggestion) => {
    setEditingId(s.id)
    setEditType(s.type)
    setEditDescription(s.description)
    setEditImages(s.images || [])
    setEditNewFiles([])
    setEditPreviews([])
  }

  const handleSaveEdit = async () => {
    if (!editingId || !editDescription.trim()) return
    setUploading(true)

    try {
      const newUrls: string[] = []
      for (const file of editNewFiles) {
        const url = await uploadToCloudinary(file)
        newUrls.push(url)
      }

      const allImages = [...editImages, ...newUrls]

      await restUpdate('suggestions', editingId, {
        type: editType,
        description: editDescription.trim(),
        images: allImages,
        updated_at: new Date().toISOString(),
      })
      showToast('Sugerencia actualizada')
      setEditingId(null)
      fetchSuggestions()
    } catch {
      showToast('Error al guardar los cambios', 'error')
    }
    setUploading(false)
  }

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await restUpdate('suggestions', id, { status: newStatus, updated_at: new Date().toISOString() })
      showToast('Estado actualizado')
      fetchSuggestions()
    } catch {
      showToast('Error al actualizar el estado', 'error')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta sugerencia?')) return

    try {
      await restDelete('suggestions', id)
      showToast('Sugerencia eliminada')
      fetchSuggestions()
    } catch {
      showToast('Error al eliminar la sugerencia', 'error')
    }
  }

  const filtered = suggestions.filter(s => statusFilter === 'all' || s.status === statusFilter)

  if (loading) {
    return <div className="p-lg font-body-md text-body-md text-on-surface-variant">Cargando...</div>
  }

  return (
    <div>
      <header className="mb-xl flex justify-between items-end">
        <div>
          <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface">Sugerencias</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-xs">Propón mejoras para la plataforma</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-primary text-on-primary font-bold py-1 px-lg rounded-full font-label-md text-label-md hover:opacity-90 transition-opacity flex items-center gap-xs"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          Nueva sugerencia
        </button>
      </header>

      {/* Status Filter */}
      <div className="flex gap-sm mb-lg flex-wrap">
        {['all', 'recibida', 'revision', 'aprobada', 'rechazada', 'implementada'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-md py-1 rounded-full font-label-md text-label-md transition-colors ${
              statusFilter === s
                ? s === 'all'
                  ? 'bg-primary text-on-primary'
                  : statusStyles[s]
                : 'bg-surface-container text-on-surface-variant hover:bg-secondary-container'
            }`}
          >
            {s === 'all' ? 'Todas' : statusLabels[s]}
          </button>
        ))}
      </div>

      {/* Suggestions List */}
      {filtered.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-xl p-xl text-center border border-outline-variant">
          <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-md block">lightbulb</span>
          <p className="font-body-md text-body-md text-on-surface-variant">No hay sugerencias {statusFilter !== 'all' ? 'con este estado' : 'aún'}</p>
        </div>
      ) : (
        <div className="space-y-md">
          {filtered.map(s => {
            const isOwn = s.user_id === user?.id
            const hasImages = s.images && s.images.length > 0
            return (
              <div key={s.id} className="bg-surface-container-lowest rounded-xl p-lg border border-outline-variant">
                <div className="flex flex-wrap items-start justify-between gap-sm mb-md">
                  <div className="flex flex-wrap items-center gap-sm">
                    <span className={`px-sm py-1 rounded-full font-label-sm text-label-sm ${typeStyles[s.type]}`}>
                      {typeLabels[s.type]}
                    </span>
                    <span className={`px-sm py-1 rounded-full font-label-sm text-label-sm ${statusStyles[s.status]}`}>
                      {statusLabels[s.status]}
                    </span>
                    {hasImages && (
                      <span className="flex items-center gap-1 text-on-surface-variant">
                        <span className="material-symbols-outlined text-lg">image</span>
                        <span className="font-label-sm text-label-sm">{s.images.length}</span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-sm">
                    <button
                      onClick={() => setDetailSuggestion(s)}
                      className="w-8 h-8 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-secondary-container transition-colors"
                      title="Ver detalles"
                    >
                      <span className="material-symbols-outlined text-lg">visibility</span>
                    </button>
                    {isAdmin && (
                      <select
                        value={s.status}
                        onChange={(e) => handleStatusChange(s.id, e.target.value)}
                        className="border border-outline-variant rounded-lg px-sm py-1 bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary"
                      >
                        <option value="recibida">Recibida</option>
                        <option value="revision">Revisión</option>
                        <option value="aprobada">Aprobada</option>
                        <option value="rechazada">Rechazada</option>
                        <option value="implementada">Implementada</option>
                      </select>
                    )}
                    {isOwn && (
                      <button
                        onClick={() => handleEdit(s)}
                        className="w-8 h-8 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-secondary-container transition-colors"
                        title="Editar"
                      >
                        <span className="material-symbols-outlined text-lg">edit</span>
                      </button>
                    )}
                    {(isOwn || isAdmin) && (
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-error-container hover:text-error transition-colors"
                        title="Eliminar"
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    )}
                  </div>
                </div>
                <p className="font-body-md text-body-md text-on-surface mb-md whitespace-pre-wrap line-clamp-2">{s.description}</p>
                <div className="flex items-center gap-sm text-on-surface-variant">
                  <span className="material-symbols-outlined text-lg">person</span>
                  <span className="font-body-sm text-body-sm">{s.profiles?.name || 'Anónimo'}</span>
                  <span className="font-body-sm text-body-sm">·</span>
                  <span className="font-body-sm text-body-sm">{new Date(s.created_at).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-scrim/60 flex items-center justify-center z-50 p-margin-mobile overflow-y-auto">
          <div className="bg-surface-container-lowest rounded-xl p-lg w-full max-w-md border border-outline-variant my-lg">
            <h3 className="font-headline-sm text-headline-sm text-on-surface mb-lg">Nueva sugerencia</h3>

            <label className="block font-label-md text-label-md text-on-surface mb-xs">Tipo de sugerencia</label>
            <select
              value={formType}
              onChange={(e) => setFormType(e.target.value)}
              className="w-full border border-outline-variant rounded-xl px-md py-2 mb-md bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary"
            >
              <option value="mejora">Mejora</option>
              <option value="nuevo">Nuevo</option>
              <option value="problema">Problema</option>
              <option value="contenido">Contenido</option>
            </select>

            <label className="block font-label-md text-label-md text-on-surface mb-xs">Descripción</label>
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              rows={4}
              placeholder="Describe tu sugerencia..."
              className="w-full border border-outline-variant rounded-xl px-md py-2 mb-md bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary resize-none"
            />

            <label className="block font-label-md text-label-md text-on-surface mb-xs">Imágenes (opcional)</label>
            <input
              ref={createFileRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleFileChange(e.target.files, false)}
              className="hidden"
            />
            <button
              onClick={() => createFileRef.current?.click()}
              className="w-full border border-dashed border-outline-variant rounded-xl px-md py-3 mb-md bg-surface font-body-sm text-body-sm text-on-surface-variant hover:bg-secondary-container transition-colors flex items-center justify-center gap-sm"
            >
              <span className="material-symbols-outlined text-lg">cloud_upload</span>
              Adjuntar imágenes
            </button>
            {formPreviews.length > 0 && (
              <div className="flex flex-wrap gap-sm mb-md">
                {formPreviews.map((preview, i) => (
                  <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-outline-variant">
                    <img src={preview} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeFormImage(i)}
                      className="absolute top-1 right-1 w-5 h-5 bg-error text-on-error rounded-full flex items-center justify-center"
                    >
                      <span className="material-symbols-outlined text-xs">close</span>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-sm">
              <button
                onClick={() => { setShowForm(false); setFormDescription(''); setFormType('mejora'); setFormImages([]); setFormPreviews([]) }}
                className="px-lg py-2 text-on-surface-variant font-label-md text-label-md hover:bg-secondary-container rounded-full transition-colors flex items-center gap-xs"
              >
                <span className="material-symbols-outlined text-lg">close</span>
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={uploading || !formDescription.trim()}
                className="bg-primary text-on-primary font-bold px-lg py-2 rounded-full font-label-md text-label-md hover:opacity-90 transition-opacity flex items-center gap-xs disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-lg">send</span>
                {uploading ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingId && (
        <div className="fixed inset-0 bg-scrim/60 flex items-center justify-center z-50 p-margin-mobile overflow-y-auto">
          <div className="bg-surface-container-lowest rounded-xl p-lg w-full max-w-md border border-outline-variant my-lg">
            <h3 className="font-headline-sm text-headline-sm text-on-surface mb-lg">Editar sugerencia</h3>

            <label className="block font-label-md text-label-md text-on-surface mb-xs">Tipo de sugerencia</label>
            <select
              value={editType}
              onChange={(e) => setEditType(e.target.value)}
              className="w-full border border-outline-variant rounded-xl px-md py-2 mb-md bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary"
            >
              <option value="mejora">Mejora</option>
              <option value="nuevo">Nuevo</option>
              <option value="problema">Problema</option>
              <option value="contenido">Contenido</option>
            </select>

            <label className="block font-label-md text-label-md text-on-surface mb-xs">Descripción</label>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={4}
              placeholder="Describe tu sugerencia..."
              className="w-full border border-outline-variant rounded-xl px-md py-2 mb-md bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary resize-none"
            />

            <label className="block font-label-md text-label-md text-on-surface mb-xs">Imágenes</label>
            <input
              ref={editFileRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleFileChange(e.target.files, true)}
              className="hidden"
            />
            <button
              onClick={() => editFileRef.current?.click()}
              className="w-full border border-dashed border-outline-variant rounded-xl px-md py-3 mb-md bg-surface font-body-sm text-body-sm text-on-surface-variant hover:bg-secondary-container transition-colors flex items-center justify-center gap-sm"
            >
              <span className="material-symbols-outlined text-lg">cloud_upload</span>
              Adjuntar imágenes
            </button>
            {(editImages.length > 0 || editPreviews.length > 0) && (
              <div className="flex flex-wrap gap-sm mb-md">
                {editImages.map((url, i) => (
                  <div key={`existing-${i}`} className="relative w-20 h-20 rounded-lg overflow-hidden border border-outline-variant">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeEditExistingImage(i)}
                      className="absolute top-1 right-1 w-5 h-5 bg-error text-on-error rounded-full flex items-center justify-center"
                    >
                      <span className="material-symbols-outlined text-xs">close</span>
                    </button>
                  </div>
                ))}
                {editPreviews.map((preview, i) => (
                  <div key={`new-${i}`} className="relative w-20 h-20 rounded-lg overflow-hidden border border-outline-variant">
                    <img src={preview} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeEditNewImage(i)}
                      className="absolute top-1 right-1 w-5 h-5 bg-error text-on-error rounded-full flex items-center justify-center"
                    >
                      <span className="material-symbols-outlined text-xs">close</span>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-sm">
              <button
                onClick={() => setEditingId(null)}
                className="px-lg py-2 text-on-surface-variant font-label-md text-label-md hover:bg-secondary-container rounded-full transition-colors flex items-center gap-xs"
              >
                <span className="material-symbols-outlined text-lg">close</span>
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={uploading || !editDescription.trim()}
                className="bg-primary text-on-primary font-bold px-lg py-2 rounded-full font-label-md text-label-md hover:opacity-90 transition-opacity flex items-center gap-xs disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-lg">save</span>
                {uploading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailSuggestion && (
        <div className="fixed inset-0 bg-scrim/60 flex items-center justify-center z-50 p-margin-mobile overflow-y-auto">
          <div className="bg-surface-container-lowest rounded-xl p-lg w-full max-w-lg border border-outline-variant my-lg">
            <div className="flex items-start justify-between mb-lg">
              <div className="flex flex-wrap items-center gap-sm">
                <span className={`px-sm py-1 rounded-full font-label-sm text-label-sm ${typeStyles[detailSuggestion.type]}`}>
                  {typeLabels[detailSuggestion.type]}
                </span>
                <span className={`px-sm py-1 rounded-full font-label-sm text-label-sm ${statusStyles[detailSuggestion.status]}`}>
                  {statusLabels[detailSuggestion.status]}
                </span>
              </div>
              <button
                onClick={() => setDetailSuggestion(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-secondary-container transition-colors"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <p className="font-body-md text-body-md text-on-surface mb-lg whitespace-pre-wrap">{detailSuggestion.description}</p>

            {detailSuggestion.images && detailSuggestion.images.length > 0 && (
              <div className="mb-lg">
                <p className="font-label-md text-label-md text-on-surface-variant mb-sm">Imágenes adjuntas</p>
                <div className="relative rounded-xl overflow-hidden border border-outline-variant bg-surface">
                  <img
                    src={detailSuggestion.images[detailImageIndex]}
                    alt={`Imagen ${detailImageIndex + 1}`}
                    className="w-full max-h-80 object-contain"
                  />
                  {detailSuggestion.images.length > 1 && (
                    <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-sm">
                      {detailSuggestion.images.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setDetailImageIndex(i)}
                          className={`w-2 h-2 rounded-full transition-colors ${i === detailImageIndex ? 'bg-primary' : 'bg-on-surface-variant/40'}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
                {detailSuggestion.images.length > 1 && (
                  <div className="flex justify-center gap-sm mt-sm">
                    <button
                      onClick={() => setDetailImageIndex(prev => prev > 0 ? prev - 1 : detailSuggestion.images.length - 1)}
                      className="w-8 h-8 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-secondary-container transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">chevron_left</span>
                    </button>
                    <span className="font-body-sm text-body-sm text-on-surface-variant self-center">
                      {detailImageIndex + 1} / {detailSuggestion.images.length}
                    </span>
                    <button
                      onClick={() => setDetailImageIndex(prev => prev < detailSuggestion.images.length - 1 ? prev + 1 : 0)}
                      className="w-8 h-8 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-secondary-container transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">chevron_right</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-sm text-on-surface-variant border-t border-outline-variant pt-md">
              <span className="material-symbols-outlined text-lg">person</span>
              <span className="font-body-sm text-body-sm">{detailSuggestion.profiles?.name || 'Anónimo'}</span>
              <span className="font-body-sm text-body-sm">·</span>
              <span className="font-body-sm text-body-sm">{new Date(detailSuggestion.created_at).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-lg left-1/2 -translate-x-1/2 z-50 px-lg py-sm rounded-xl shadow-lg font-body-sm text-body-sm font-medium ${
          toast.type === 'success' ? 'bg-success-container text-on-success-container' : 'bg-error-container text-on-error-container'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  )
}
