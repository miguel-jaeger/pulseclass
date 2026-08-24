import { useState, useEffect } from 'react'
import { insforge } from '../lib/insforge'
import { useAuth } from '../hooks/useAuth'

interface Suggestion {
  id: string
  user_id: string
  type: string
  description: string
  status: string
  created_at: string
  updated_at: string
  profiles?: { name: string }
}

const typeLabels: Record<string, string> = {
  correccion: 'Corrección',
  adicion: 'Adición',
  eliminacion: 'Eliminación',
}

const statusLabels: Record<string, string> = {
  pendiente: 'Pendiente',
  procede: 'Procede',
  no_procede: 'No procede',
  implementada: 'Implementada',
}

const statusStyles: Record<string, string> = {
  pendiente: 'bg-amber-100 text-amber-800 border border-amber-300',
  procede: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
  no_procede: 'bg-error-container text-on-error-container border border-error/30',
  implementada: 'bg-green-100 text-green-800 border border-green-300',
}

const typeStyles: Record<string, string> = {
  correccion: 'bg-blue-100 text-blue-800 border border-blue-300',
  adicion: 'bg-purple-100 text-purple-800 border border-purple-300',
  eliminacion: 'bg-orange-100 text-orange-800 border border-orange-300',
}

export function SuggestionsPage() {
  const { profile, user } = useAuth()
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formType, setFormType] = useState('correccion')
  const [formDescription, setFormDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editType, setEditType] = useState('')
  const [editDescription, setEditDescription] = useState('')
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

  const handleSubmit = async () => {
    if (!formDescription.trim() || !user?.id) return
    setSubmitting(true)

    const { error } = await insforge.database
      .from('suggestions')
      .insert([{
        user_id: user.id,
        type: formType,
        description: formDescription.trim(),
      }])

    if (error) {
      showToast('Error al enviar la sugerencia', 'error')
    } else {
      showToast('Sugerencia enviada correctamente')
      setFormDescription('')
      setFormType('correccion')
      setShowForm(false)
      fetchSuggestions()
    }
    setSubmitting(false)
  }

  const handleEdit = (s: Suggestion) => {
    setEditingId(s.id)
    setEditType(s.type)
    setEditDescription(s.description)
  }

  const handleSaveEdit = async () => {
    if (!editingId || !editDescription.trim()) return
    setSubmitting(true)

    const { error } = await insforge.database
      .from('suggestions')
      .update({ type: editType, description: editDescription.trim(), updated_at: new Date().toISOString() })
      .eq('id', editingId)

    if (error) {
      showToast('Error al guardar los cambios', 'error')
    } else {
      showToast('Sugerencia actualizada')
      setEditingId(null)
      fetchSuggestions()
    }
    setSubmitting(false)
  }

  const handleStatusChange = async (id: string, newStatus: string) => {
    const { error } = await insforge.database
      .from('suggestions')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      showToast('Error al actualizar el estado', 'error')
    } else {
      showToast('Estado actualizado')
      fetchSuggestions()
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta sugerencia?')) return

    const { error } = await insforge.database
      .from('suggestions')
      .delete()
      .eq('id', id)

    if (error) {
      showToast('Error al eliminar la sugerencia', 'error')
    } else {
      showToast('Sugerencia eliminada')
      fetchSuggestions()
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
        {['all', 'pendiente', 'procede', 'no_procede', 'implementada'].map(s => (
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
                  </div>
                  <div className="flex items-center gap-sm">
                    {isAdmin && (
                      <select
                        value={s.status}
                        onChange={(e) => handleStatusChange(s.id, e.target.value)}
                        className="border border-outline-variant rounded-lg px-sm py-1 bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary"
                      >
                        <option value="pendiente">Pendiente</option>
                        <option value="procede">Procede</option>
                        <option value="no_procede">No procede</option>
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
                <p className="font-body-md text-body-md text-on-surface mb-md whitespace-pre-wrap">{s.description}</p>
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
        <div className="fixed inset-0 bg-scrim/60 flex items-center justify-center z-50 p-margin-mobile">
          <div className="bg-surface-container-lowest rounded-xl p-lg w-full max-w-md border border-outline-variant">
            <h3 className="font-headline-sm text-headline-sm text-on-surface mb-lg">Nueva sugerencia</h3>

            <label className="block font-label-md text-label-md text-on-surface mb-xs">Tipo de sugerencia</label>
            <select
              value={formType}
              onChange={(e) => setFormType(e.target.value)}
              className="w-full border border-outline-variant rounded-xl px-md py-2 mb-md bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary"
            >
              <option value="correccion">Corrección</option>
              <option value="adicion">Adición</option>
              <option value="eliminacion">Eliminación</option>
            </select>

            <label className="block font-label-md text-label-md text-on-surface mb-xs">Descripción</label>
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              rows={4}
              placeholder="Describe tu sugerencia..."
              className="w-full border border-outline-variant rounded-xl px-md py-2 mb-lg bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary resize-none"
            />

            <div className="flex justify-end gap-sm">
              <button
                onClick={() => { setShowForm(false); setFormDescription(''); setFormType('correccion') }}
                className="px-lg py-2 text-on-surface-variant font-label-md text-label-md hover:bg-secondary-container rounded-full transition-colors flex items-center gap-xs"
              >
                <span className="material-symbols-outlined text-lg">close</span>
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !formDescription.trim()}
                className="bg-primary text-on-primary font-bold px-lg py-2 rounded-full font-label-md text-label-md hover:opacity-90 transition-opacity flex items-center gap-xs disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-lg">send</span>
                {submitting ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingId && (
        <div className="fixed inset-0 bg-scrim/60 flex items-center justify-center z-50 p-margin-mobile">
          <div className="bg-surface-container-lowest rounded-xl p-lg w-full max-w-md border border-outline-variant">
            <h3 className="font-headline-sm text-headline-sm text-on-surface mb-lg">Editar sugerencia</h3>

            <label className="block font-label-md text-label-md text-on-surface mb-xs">Tipo de sugerencia</label>
            <select
              value={editType}
              onChange={(e) => setEditType(e.target.value)}
              className="w-full border border-outline-variant rounded-xl px-md py-2 mb-md bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary"
            >
              <option value="correccion">Corrección</option>
              <option value="adicion">Adición</option>
              <option value="eliminacion">Eliminación</option>
            </select>

            <label className="block font-label-md text-label-md text-on-surface mb-xs">Descripción</label>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={4}
              placeholder="Describe tu sugerencia..."
              className="w-full border border-outline-variant rounded-xl px-md py-2 mb-lg bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary resize-none"
            />

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
                disabled={submitting || !editDescription.trim()}
                className="bg-primary text-on-primary font-bold px-lg py-2 rounded-full font-label-md text-label-md hover:opacity-90 transition-opacity flex items-center gap-xs disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-lg">save</span>
                {submitting ? 'Guardando...' : 'Guardar'}
              </button>
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
