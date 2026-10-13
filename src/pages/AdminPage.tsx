import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { insforge } from '../lib/insforge'
import { useAuth } from '../hooks/useAuth'
import { useImpersonation } from '../hooks/useImpersonation'
import { Pagination, usePagination } from '../components/Pagination'
import { PasswordInput } from '../components/PasswordInput'
import { normalizeRole, roleLabel, ROLE_FILTER_OPTIONS, ROLE_OPTIONS } from '../lib/roles'
import { formatDisplayName } from '../lib/formatDisplayName'

interface UserProfile {
  id: string
  user_id: string
  name: string
  email: string
  role: string
  created_at: string
}

interface ImportResult {
  imported: number
  skipped: { name: string; email: string; reason?: string }[]
  error?: string
  message?: string
}

export function AdminPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const { startImpersonation, impersonatedRole, isImpersonating } = useImpersonation()
  const effectiveRole = isImpersonating && impersonatedRole ? impersonatedRole : profile?.role
  const isAdmin = effectiveRole === 'admin'
  const isCoordinator = effectiveRole === 'coordinator'
  const assignableRoleOptions = isCoordinator
    ? ROLE_OPTIONS.filter(o => o.value === 'teacher' || o.value === 'coordinator')
    : ROLE_OPTIONS
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importLoading, setImportLoading] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null)
  const [createForm, setCreateForm] = useState({ name: '', email: '', role: 'student' as string })
  const [editForm, setEditForm] = useState({ name: '', email: '', role: 'student' as string, password: '' })
  const [formError, setFormError] = useState('')
  const [formLoading, setFormLoading] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [bulkDeleteProgress, setBulkDeleteProgress] = useState<{ current: number; total: number } | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [showMoreOptions, setShowMoreOptions] = useState(false)
  const moreOptionsRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreOptionsRef.current && !moreOptionsRef.current.contains(e.target as Node)) {
        setShowMoreOptions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchUsers = async () => {
    const { data, error } = await insforge.database
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setUsers((data as UserProfile[]).map(u => ({ ...u, role: normalizeRole(u.role) })))
    }
    setLoading(false)
  }

  const createUser = async () => {
    setFormError('')
    setFormLoading(true)
    try {
      const { data, error } = await insforge.functions.invoke('admin-create-user', {
        method: 'POST',
        body: createForm
      })

      if (error) throw error
      if (data?.success !== true) throw new Error(data?.error || 'No se pudo crear el usuario')

      setShowCreateModal(false)
      setCreateForm({ name: '', email: '', role: isCoordinator ? 'teacher' : 'student' })
      await fetchUsers()
      showToast('Usuario creado exitosamente')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al crear usuario'
      setFormError(message)
    } finally {
      setFormLoading(false)
    }
  }

  const parseCsvLine = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          current += '"'
          i++
        } else if (ch === '"') {
          inQuotes = false
        } else {
          current += ch
        }
      } else if (ch === '"') {
        inQuotes = true
      } else if (ch === ',' || ch === ';' || ch === '\t') {
        result.push(current.trim())
        current = ''
      } else {
        current += ch
      }
    }
    result.push(current.trim())
    return result
  }

  const handleCsvImport = async (file: File) => {
    setImportLoading(true)
    setImportResult(null)
    try {
      const text = (await file.text()).replace(/^\uFEFF/, '')
      const lines = text.split(/\r\n|\r|\n/).filter(line => line.trim())
      if (lines.length === 0) {
        setImportResult({ imported: 0, skipped: [], error: 'El archivo CSV está vacío.' })
        return
      }

      const headers = parseCsvLine(lines[0]).map(header =>
        header.trim().toLowerCase().replace(/^\uFEFF/, '').replace(/"/g, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
      )
      const nameIdx = headers.findIndex(header => ['alumnos', 'nombre', 'name'].includes(header))
      const emailIdx = headers.findIndex(header => ['correo', 'email', 'e-mail'].includes(header))
      if (nameIdx === -1 || emailIdx === -1) {
        setImportResult({ imported: 0, skipped: [], error: 'El CSV debe incluir columnas "nombre" y "correo".' })
        return
      }

      const parsedUsers = lines.slice(1).map(line => {
        const columns = parseCsvLine(line)
        return {
          name: (columns[nameIdx] || '').trim(),
          email: (columns[emailIdx] || '').trim().toLowerCase()
        }
      }).filter(user => user.name || user.email)

      if (parsedUsers.length === 0) {
        setImportResult({ imported: 0, skipped: [], message: 'La plantilla es válida y todavía no contiene usuarios. Agrega una fila por usuario antes de importar.' })
        return
      }

      let imported = 0
      const skipped: ImportResult['skipped'] = []
      const chunkSize = 15
      for (let i = 0; i < parsedUsers.length; i += chunkSize) {
        const chunk = parsedUsers.slice(i, i + chunkSize)
        const { data, error } = await insforge.functions.invoke('csv-import-users', {
          method: 'POST',
          body: { users: chunk }
        })
        if (error) {
          skipped.push(...chunk.map(user => ({ ...user, reason: 'error de importación' })))
          continue
        }
        imported += data?.imported || 0
        if (data?.skipped) skipped.push(...data.skipped)
      }

      setImportResult({ imported, skipped })
      if (imported > 0) await fetchUsers()
    } catch {
      setImportResult({ imported: 0, skipped: [], error: 'No se pudo leer o importar el archivo CSV.' })
    } finally {
      setImportLoading(false)
    }
  }

  const openEditModal = (user: UserProfile) => {
    setEditingUser(user)
    setEditForm({ name: user.name, email: user.email, role: normalizeRole(user.role), password: '' })
    setFormError('')
    setShowEditModal(true)
  }

  const saveUser = async () => {
    if (!editingUser) return
    setFormError('')
    setFormLoading(true)
    try {
      const { error } = await insforge.database
        .from('profiles')
        .update({ name: editForm.name, role: editForm.role })
        .eq('user_id', editingUser.user_id)

      if (error) throw error

      if (editForm.password) {
        const { data: passwordData, error: passwordError } = await insforge.functions.invoke('admin-change-password', {
          method: 'POST',
          body: { userId: editingUser.user_id, newPassword: editForm.password }
        })
        if (passwordError) throw passwordError
        if (passwordData?.success !== true) throw new Error('El servidor no confirmó el cambio de contraseña')
      }

      setUsers(prev => prev.map(u =>
        u.user_id === editingUser.user_id
          ? { ...u, name: editForm.name, role: editForm.role as UserProfile['role'] }
          : u
      ))
      setShowEditModal(false)
      setEditingUser(null)
      showToast(editForm.password ? 'Usuario y contraseña actualizados' : 'Usuario actualizado')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar cambios'
      setFormError(message)
    } finally {
      setFormLoading(false)
    }
  }

  const resetPassword = async (userId: string) => {
    if (!confirm('¿Restablecer la contraseña de este usuario a 12345678?')) return

    try {
      const { data, error } = await insforge.functions.invoke('admin-change-password', {
        method: 'POST',
        body: { userId, newPassword: '12345678' }
      })

      if (error) throw error
      if (data?.success !== true) throw new Error('El servidor no confirmó el cambio de contraseña')
      showToast('Contraseña restablecida a 12345678')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al restablecer la contraseña'
      showToast(message, 'error')
    }
  }

  const deleteUser = async (userId: string) => {
    if (!confirm('¿Eliminar este usuario? Esta acción no se puede deshacer.')) return

    const { error } = await insforge.functions.invoke('delete-user', {
      method: 'POST',
      body: { userId }
    })

    if (!error) {
      setUsers(prev => prev.filter(u => u.user_id !== userId))
      showToast('Usuario eliminado')
    }
  }

  const deleteSelectedUsers = async () => {
    if (selectedUsers.size === 0) return
    if (!confirm(`¿Eliminar ${selectedUsers.size} usuario(s)? Esta acción no se puede deshacer.`)) return

    const userIds = Array.from(selectedUsers)
    const deletedUserIds = new Set<string>()
    setBulkDeleteProgress({ current: 0, total: userIds.length })
    try {
      for (let index = 0; index < userIds.length; index++) {
        const userId = userIds[index]
        try {
          const { data, error } = await insforge.functions.invoke('delete-user', {
            method: 'POST',
            body: { userId }
          })
          if (!error && data?.success === true) deletedUserIds.add(userId)
        } catch {
        }
        setBulkDeleteProgress({ current: index + 1, total: userIds.length })
      }

      setUsers(prev => prev.filter(user => !deletedUserIds.has(user.user_id)))
      setSelectedUsers(prev => new Set([...prev].filter(userId => !deletedUserIds.has(userId))))
      const failedCount = userIds.length - deletedUserIds.size
      if (failedCount === 0) {
        showToast(`${deletedUserIds.size} usuario(s) eliminado(s)`)
      } else if (deletedUserIds.size === 0) {
        showToast('No se pudieron eliminar los usuarios seleccionados.', 'error')
      } else {
        showToast(`Se eliminaron ${deletedUserIds.size} de ${userIds.length} usuarios; ${failedCount} no se pudieron eliminar.`, 'error')
      }
    } finally {
      setBulkDeleteProgress(null)
    }
  }

  const toggleSelectUser = (userId: string) => {
    setSelectedUsers(prev => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  const toggleSelectAllUsers = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set())
    } else {
      setSelectedUsers(new Set(filteredUsers.map(u => u.user_id)))
    }
  }

  const visibleUsers = isCoordinator
    ? users.filter((u) => u.role === 'teacher' || u.role === 'coordinator')
    : users

  const filteredUsers = visibleUsers.filter((u) => {
    const matchesSearch =
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = roleFilter === 'all' || u.role === roleFilter
    return matchesSearch && matchesRole
  })

  const { page, perPage, setPage, setPerPage, paginatedSlice } = usePagination(filteredUsers.length, 10)
  const paginatedUsers = paginatedSlice(filteredUsers)

  if (effectiveRole !== 'admin' && effectiveRole !== 'coordinator') {
    return (
      <div className="p-lg">
        <p className="font-body-md text-body-md text-error bg-error-container p-md rounded-xl">Acceso denegado. Solo administradores y coordinadores pueden ver esta página.</p>
      </div>
    )
  }

  return (
    <div className="pb-28 md:pb-0">
      <header className="mb-xl flex flex-col md:flex-row md:justify-between md:items-end gap-md">
        <div className="min-w-0">
          <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary font-bold">Gestión de Usuarios</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-xs">Administra los roles y permisos de los usuarios.</p>
        </div>
        <div className="flex items-center gap-sm shrink-0 self-end md:self-auto">
          <button
            onClick={() => { setCreateForm({ name: '', email: '', role: isCoordinator ? 'teacher' : 'student' }); setFormError(''); setShowCreateModal(true) }}
            className="bg-primary text-on-primary font-bold py-1 px-lg rounded-full font-label-md text-label-md hover:opacity-90 transition-opacity flex items-center gap-xs"
          >
            <span className="material-symbols-outlined text-lg">person_add</span>
            Crear
          </button>
          {isAdmin && (
          <div className="relative" ref={moreOptionsRef}>
            <button
              onClick={() => setShowMoreOptions(open => !open)}
              aria-label="Más opciones de usuarios"
              aria-expanded={showMoreOptions}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-secondary-container text-on-surface hover:opacity-90 transition-opacity"
            >
              <span className="material-symbols-outlined">more_vert</span>
            </button>
            {showMoreOptions && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-surface-container-high rounded-xl border border-outline-variant shadow-lg overflow-hidden z-50">
                <p className="px-md pt-sm pb-xs font-label-xs text-label-xs text-on-surface-variant">Ver como</p>
                <button
                  onClick={() => { startImpersonation('coordinator'); navigate('/'); setShowMoreOptions(false) }}
                  className="flex items-center gap-sm px-md py-sm w-full text-left text-on-surface hover:bg-secondary-container transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">supervisor_account</span>
                  <span className="font-body-sm text-body-sm">Coordinador</span>
                </button>
                <button
                  onClick={() => { startImpersonation('teacher'); navigate('/'); setShowMoreOptions(false) }}
                  className="flex items-center gap-sm px-md py-sm w-full text-left text-on-surface hover:bg-secondary-container transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">school</span>
                  <span className="font-body-sm text-body-sm">Profesor</span>
                </button>
                <button
                  onClick={() => { startImpersonation('student'); navigate('/'); setShowMoreOptions(false) }}
                  className="flex items-center gap-sm px-md py-sm w-full text-left text-on-surface hover:bg-secondary-container transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">person</span>
                  <span className="font-body-sm text-body-sm">Estudiante</span>
                </button>
                <div className="border-t border-outline-variant" />
                <button
                  onClick={() => { setShowImportModal(true); setImportResult(null); setShowMoreOptions(false) }}
                  className="flex items-center gap-sm px-md py-sm w-full text-left text-on-surface hover:bg-secondary-container transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">upload_file</span>
                  <span className="font-body-sm text-body-sm">Importar CSV</span>
                </button>
                <a
                  href="/plantilla-usuarios.csv"
                  download
                  onClick={() => setShowMoreOptions(false)}
                  className="flex items-center gap-sm px-md py-sm text-on-surface hover:bg-secondary-container transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">download</span>
                  <span className="font-body-sm text-body-sm">Descargar plantilla CSV</span>
                </a>
              </div>
            )}
          </div>
          )}
        </div>
      </header>

      <div className="flex flex-col md:flex-row gap-md mb-lg">
        <div className="flex-1 relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
          <input
            type="text"
            id="user-search"
            name="search"
            placeholder="Buscar por nombre o correo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full border border-outline-variant rounded-xl pl-10 pr-md py-2 bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary"
          />
        </div>
        {isAdmin && (
          <select
            id="role-filter"
            name="roleFilter"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="border border-outline-variant rounded-xl px-md py-2 bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary appearance-none pr-10"
          >
            {ROLE_FILTER_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        )}
      </div>

      {/* Summary Bar */}
      {isAdmin && (
      <div className="flex flex-wrap items-center justify-center gap-md bg-surface border border-outline-variant rounded-xl px-md py-sm mb-lg">
        <div className="flex items-center gap-xs">
          <span className="material-symbols-outlined text-primary text-lg">group</span>
          <span className="font-body-sm text-body-sm text-on-surface-variant">Total:</span>
          <span className="font-body-sm text-body-sm text-on-surface font-bold">{users.length}</span>
        </div>
        <div className="w-px h-4 bg-outline-variant"></div>
        <div className="flex items-center gap-xs">
          <span className="material-symbols-outlined text-primary text-lg">admin_panel_settings</span>
          <span className="font-body-sm text-body-sm text-on-surface-variant">Admin:</span>
          <span className="font-body-sm text-body-sm text-on-surface font-bold">{users.filter(u => u.role === 'admin').length}</span>
        </div>
        <div className="w-px h-4 bg-outline-variant"></div>
        <div className="flex items-center gap-xs">
          <span className="material-symbols-outlined text-primary text-lg">school</span>
          <span className="font-body-sm text-body-sm text-on-surface-variant">Profesores:</span>
          <span className="font-body-sm text-body-sm text-on-surface font-bold">{users.filter(u => u.role === 'teacher').length}</span>
        </div>
        <div className="w-px h-4 bg-outline-variant"></div>
        <div className="flex items-center gap-xs">
          <span className="material-symbols-outlined text-primary text-lg">person</span>
          <span className="font-body-sm text-body-sm text-on-surface-variant">Estudiantes:</span>
          <span className="font-body-sm text-body-sm text-on-surface font-bold">{users.filter(u => u.role === 'student').length}</span>
        </div>
      </div>
      )}

      <p className="font-body-sm text-body-sm text-on-surface-variant mb-md">
        Mostrando <span className="font-bold text-primary font-bold">{paginatedUsers.length}</span> de <span className="font-bold text-primary font-bold">{filteredUsers.length}</span> usuarios
      </p>

      {loading ? (
        <div className="bg-surface border border-outline-variant rounded-xl overflow-hidden">
          <table className="w-full hidden md:table table-fixed">
            <thead>
              <tr className="border-b border-outline-variant">
                <th className="w-10 px-md py-3"><div className="h-4 w-4 bg-surface-container animate-pulse rounded" /></th>
                <th className="text-left px-md py-3"><div className="h-4 w-20 bg-surface-container animate-pulse rounded" /></th>
                <th className="text-left px-md py-3"><div className="h-4 w-16 bg-surface-container animate-pulse rounded" /></th>
                <th className="text-left px-md py-3"><div className="h-4 w-8 bg-surface-container animate-pulse rounded" /></th>
                <th className="text-right px-md py-3"><div className="h-4 w-16 bg-surface-container animate-pulse rounded" /></th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map(i => (
                <tr key={i} className="border-b border-outline-variant last:border-0">
                  <td className="px-md py-3"><div className="h-4 w-4 bg-surface-container animate-pulse rounded" /></td>
                  <td className="px-md py-3">
                    <div className="h-4 w-32 bg-surface-container animate-pulse rounded mb-1" />
                    <div className="h-3 w-40 bg-surface-container animate-pulse rounded" />
                  </td>
                  <td className="px-md py-3"><div className="h-5 w-16 bg-surface-container animate-pulse rounded-full" /></td>
                  <td className="px-md py-3"><div className="h-4 w-20 bg-surface-container animate-pulse rounded" /></td>
                  <td className="px-md py-3">
                    <div className="flex gap-sm justify-end">
                      <div className="h-8 w-8 bg-surface-container animate-pulse rounded-full" />
                      <div className="h-8 w-8 bg-surface-container animate-pulse rounded-full" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="md:hidden p-md space-y-md">
            {[1, 2, 3].map(i => (
              <div key={i} className="border border-outline-variant rounded-xl p-md">
                <div className="flex items-center gap-sm mb-sm">
                  <div className="h-4 w-4 bg-surface-container animate-pulse rounded" />
                  <div className="flex-1">
                    <div className="h-4 w-32 bg-surface-container animate-pulse rounded mb-1" />
                    <div className="h-3 w-40 bg-surface-container animate-pulse rounded" />
                  </div>
                </div>
                <div className="flex justify-between items-center mt-sm">
                  <div className="h-5 w-16 bg-surface-container animate-pulse rounded-full" />
                  <div className="flex gap-sm">
                    <div className="h-8 w-8 bg-surface-container animate-pulse rounded-full" />
                    <div className="h-8 w-8 bg-surface-container animate-pulse rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-surface border border-outline-variant rounded-xl overflow-hidden">
          {selectedUsers.size > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-sm px-md py-2 bg-error-container border-b border-outline-variant">
              {bulkDeleteProgress ? (
                <div className="min-w-0 flex-1" role="status" aria-live="polite">
                  <div className="flex items-center gap-xs mb-xs font-body-sm text-body-sm text-on-error-container">
                    <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                    Eliminando {bulkDeleteProgress.current} de {bulkDeleteProgress.total} usuarios...
                  </div>
                  <div
                    className="h-1.5 w-full rounded-full bg-surface/60 overflow-hidden"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={bulkDeleteProgress.total}
                    aria-valuenow={bulkDeleteProgress.current}
                  >
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300"
                      style={{ width: `${(bulkDeleteProgress.current / bulkDeleteProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              ) : (
                <span className="font-body-sm text-body-sm text-on-error-container">
                  {selectedUsers.size} usuarios seleccionados
                </span>
              )}
              <button
                onClick={deleteSelectedUsers}
                disabled={bulkDeleteProgress !== null}
                className="bg-error text-on-error font-bold py-1 px-lg rounded-full font-label-md text-label-md hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-wait flex items-center gap-xs"
              >
                <span className={`material-symbols-outlined text-lg ${bulkDeleteProgress ? 'animate-spin' : ''}`}>
                  {bulkDeleteProgress ? 'progress_activity' : 'group_remove'}
                </span>
                {bulkDeleteProgress ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          )}
          {/* Desktop table */}
          <div className="hidden md:block min-w-0">
            <table className="w-full table-fixed">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant">
                  <th className="px-0 py-sm text-center w-[5%]">
                    <input
                      type="checkbox"
                      id="select-all-users"
                      name="selectAll"
                      checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                      onChange={toggleSelectAllUsers}
                      disabled={bulkDeleteProgress !== null}
                      className="w-4 h-4 accent-primary rounded"
                    />
                  </th>
                  <th className="px-sm py-sm text-left font-label-xs text-label-xs text-on-surface-variant w-[26%]">Nombre</th>
                  <th className="px-sm py-sm text-left font-label-xs text-label-xs text-on-surface-variant w-[38%]">Correo</th>
                  <th className="px-xs xl:px-sm py-sm text-left font-label-xs text-label-xs text-on-surface-variant w-[14%]">Rol</th>
                  <th className="px-xs py-sm text-left font-label-xs text-label-xs text-on-surface-variant w-[17%]">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((user) => (
                  <tr key={user.id} className="border-b border-outline-variant hover:bg-surface-container-low transition-colors">
                    <td className="px-0 py-sm align-top text-center">
                      <input
                        type="checkbox"
                        name="selectUser"
                        checked={selectedUsers.has(user.user_id)}
                        onChange={() => toggleSelectUser(user.user_id)}
                        disabled={bulkDeleteProgress !== null}
                        className="w-4 h-4 accent-primary rounded"
                      />
                    </td>
                    <td className="px-sm py-sm align-top text-left">
                      <div className="font-body-xs text-body-xs text-on-surface font-medium break-words">{formatDisplayName(user.name)}</div>
                    </td>
                    <td className="px-sm py-sm align-top text-left font-body-xs text-body-xs text-on-surface-variant break-all">{user.email}</td>
                    <td className="px-xs xl:px-sm py-sm align-top text-left">
                      <span className={`inline-block max-w-full px-xs xl:px-sm py-[2px] rounded-full font-label-xs text-label-xs text-left whitespace-normal break-words xl:whitespace-nowrap ${
                        user.role === 'admin' ? 'bg-primary-container text-on-primary-container' :
                        user.role === 'teacher' ? 'bg-surface-container text-on-surface' :
                        'bg-secondary-container text-on-secondary-container'
                      }`}>
                        {roleLabel(user.role)}
                      </span>
                    </td>
                    <td className="px-xs py-sm align-top text-left">
                      <div className="flex flex-wrap items-center gap-xs xl:gap-sm">
                        <button
                          onClick={() => openEditModal(user)}
                          className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-container text-tertiary hover:bg-tertiary-container hover:text-on-tertiary-container transition-colors"
                          title="Editar usuario"
                        >
                          <span className="material-symbols-outlined text-lg">edit</span>
                        </button>
                        <button
                          onClick={() => deleteUser(user.user_id)}
                          className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-container text-tertiary hover:bg-tertiary-container hover:text-on-tertiary-container transition-colors"
                          title="Eliminar usuario"
                        >
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                        <button
                          onClick={() => resetPassword(user.user_id)}
                          className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-container text-tertiary hover:bg-tertiary-container hover:text-on-tertiary-container transition-colors"
                          title="Restablecer contraseña"
                        >
                          <span className="material-symbols-outlined text-lg">key</span>
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
            {paginatedUsers.map((user) => (
              <div key={user.id} className="border-b border-outline-variant last:border-0 p-md hover:bg-surface-container-low transition-colors">
                <div className="flex flex-col gap-sm">
                  <div className="flex items-center gap-sm min-w-0">
                    <input
                      type="checkbox"
                      name="selectUser"
                      checked={selectedUsers.has(user.user_id)}
                      onChange={() => toggleSelectUser(user.user_id)}
                      disabled={bulkDeleteProgress !== null}
                      className="w-4 h-4 accent-primary rounded mt-1 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-body-sm text-body-sm text-on-surface font-medium break-words">{formatDisplayName(user.name)}</div>
                      <div className="font-body-xs text-body-xs text-on-surface-variant break-all">{user.email}</div>
                      <span className={`inline-flex items-center px-xs py-[2px] rounded-full font-label-xs text-label-xs mt-xs ${
                        user.role === 'admin' ? 'bg-primary-container text-on-primary-container' :
                        user.role === 'teacher' ? 'bg-surface-container text-on-surface' :
                        'bg-secondary-container text-on-secondary-container'
                      }`}>
                        <span className="material-symbols-outlined text-[12px] mr-[2px]">
                          {user.role === 'admin' ? 'admin_panel_settings' : user.role === 'teacher' ? 'school' : 'person'}
                        </span>
                        {roleLabel(user.role)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-sm">
                    <button
                      onClick={() => openEditModal(user)}
                      className="w-9 h-9 flex items-center justify-center rounded-full bg-surface-container text-tertiary hover:bg-tertiary-container hover:text-on-tertiary-container transition-colors"
                      title="Editar"
                    >
                      <span className="material-symbols-outlined text-xl">edit</span>
                    </button>
                    <button
                      onClick={() => deleteUser(user.user_id)}
                      className="w-9 h-9 flex items-center justify-center rounded-full bg-surface-container text-tertiary hover:bg-tertiary-container hover:text-on-tertiary-container transition-colors"
                      title="Eliminar"
                    >
                      <span className="material-symbols-outlined text-xl">delete</span>
                    </button>
                    <button
                      onClick={() => resetPassword(user.user_id)}
                      className="w-9 h-9 flex items-center justify-center rounded-full bg-surface-container text-tertiary hover:bg-tertiary-container hover:text-on-tertiary-container transition-colors"
                      title="Restablecer contraseña"
                    >
                      <span className="material-symbols-outlined text-xl">key</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {filteredUsers.length === 0 && (
            <div className="text-center py-lg">
              <p className="font-body-md text-body-md text-on-surface-variant">
                {searchQuery || roleFilter !== 'all' ? 'No se encontraron usuarios.' : 'No hay usuarios registrados.'}
              </p>
            </div>
          )}
        </div>
      )}

      <Pagination
        totalItems={filteredUsers.length}
        page={page}
        perPage={perPage}
        onPageChange={setPage}
        onPerPageChange={setPerPage}
      />

      {showImportModal && (
        <div className="fixed inset-0 bg-scrim/60 flex overflow-y-auto z-50 p-margin-mobile">
          <div className="m-auto bg-surface-container-lowest rounded-xl p-lg w-full max-w-md border border-outline-variant">
            <h3 className="font-headline-sm text-headline-sm text-on-surface mb-md">Importar usuarios desde CSV</h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-md">
              El archivo debe incluir columnas <strong>nombre</strong> y <strong>correo</strong>. La primera fila se usa como encabezado y la contraseña para todos será <strong>12345678</strong>.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={event => {
                const file = event.target.files?.[0]
                if (file) handleCsvImport(file)
              }}
              className="hidden"
            />
            {importLoading ? (
              <div className="flex items-center justify-center gap-sm py-lg">
                <span className="material-symbols-outlined text-primary animate-spin">progress_activity</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">Importando usuarios...</span>
              </div>
            ) : importResult ? (
              <div className="space-y-md">
                {importResult.error ? (
                  <p className="font-body-sm text-body-sm text-on-error-container bg-error-container p-md rounded-xl">{importResult.error}</p>
                ) : importResult.message ? (
                  <p className="font-body-sm text-body-sm text-on-surface bg-surface-container p-md rounded-xl">{importResult.message}</p>
                ) : (
                  <div className={`p-md rounded-xl ${importResult.imported > 0 ? 'bg-primary-container text-on-primary-container' : 'bg-error-container text-on-error-container'}`}>
                    <div className="flex items-center gap-sm mb-xs">
                      <span className="material-symbols-outlined text-lg">{importResult.imported > 0 ? 'check_circle' : 'info'}</span>
                      <span className="font-label-md text-label-md">{importResult.imported} usuario(s) importado(s)</span>
                    </div>
                    {importResult.skipped.length > 0 && <span className="font-body-sm text-body-sm">{importResult.skipped.length} omitido(s)</span>}
                  </div>
                )}
                {importResult.skipped.length > 0 && (
                  <div className="max-h-48 overflow-y-auto space-y-sm">
                    {importResult.skipped.map((user, index) => (
                      <div key={`${user.email}-${index}`} className="border-b border-outline-variant last:border-0 pb-sm">
                        <p className="font-body-sm text-body-sm text-primary font-bold break-words">{formatDisplayName(user.name)}</p>
                        <p className="font-body-xs text-body-xs text-on-surface-variant break-all">Correo: {user.email}</p>
                        <p className="font-body-xs text-body-xs text-on-surface-variant break-words">Motivo: {user.reason || 'omitido'}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-outline-variant rounded-xl py-lg flex flex-col items-center gap-sm hover:border-primary hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined text-on-surface-variant text-[32px]">upload_file</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">Seleccionar archivo CSV</span>
              </button>
            )}
            <div className="flex justify-end gap-sm mt-lg">
              <button
                onClick={() => { setShowImportModal(false); setImportResult(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                className="px-lg py-2 text-on-surface-variant font-label-md text-label-md hover:bg-secondary-container rounded-full transition-colors flex items-center gap-xs"
              >
                <span className="material-symbols-outlined text-lg">close</span>
                {importResult ? 'Cerrar' : 'Cancelar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-scrim/60 flex items-center justify-center z-50 p-margin-mobile">
          <div className="bg-surface-container-lowest rounded-xl p-lg w-full max-w-md border border-outline-variant">
            <div className="flex items-center justify-between gap-sm mb-lg">
              <h3 className="font-headline-sm text-headline-sm text-on-surface">Crear Usuario</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="shrink-0 p-xs rounded-full text-on-surface-variant hover:bg-secondary-container transition-colors"
                title="Cerrar"
                aria-label="Cerrar modal"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>
            <div className="space-y-md">
              <p className="font-body-sm text-body-sm text-on-surface-variant">La contraseña inicial será <strong>12345678</strong>.</p>
              <div>
                <label htmlFor="create-name" className="block font-label-md text-label-md text-on-surface mb-xs">Nombre</label>
                <input
                  type="text"
                  id="create-name"
                  name="name"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full border border-outline-variant rounded-xl px-md py-2 bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary"
                  placeholder="Nombre completo"
                />
              </div>
              <div>
                <label htmlFor="create-email" className="block font-label-md text-label-md text-on-surface mb-xs">Correo electrónico</label>
                <input
                  type="email"
                  id="create-email"
                  name="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  className="w-full border border-outline-variant rounded-xl px-md py-2 bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary"
                  placeholder="correo@ejemplo.com"
                />
              </div>
              <div>
                <label htmlFor="create-role" className="block font-label-md text-label-md text-on-surface mb-xs">Rol</label>
                <select
                  id="create-role"
                  name="role"
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                  className="w-full border border-outline-variant rounded-xl px-md py-2 bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary"
                >
{assignableRoleOptions.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
              </div>
            </div>
            {formError && (
              <p className="font-body-sm text-body-sm text-on-error-container bg-error-container p-sm rounded-xl mt-md">{formError}</p>
            )}
            <div className="flex justify-end gap-sm mt-lg">
              <button
                onClick={createUser}
                disabled={formLoading || !createForm.name || !createForm.email}
                className="bg-primary text-on-primary font-bold px-lg py-2 rounded-full font-label-md text-label-md hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-xs"
              >
                <span className="material-symbols-outlined text-lg">person_add</span>
                {formLoading ? 'Creando...' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-scrim/60 flex items-center justify-center z-50 p-margin-mobile">
          <div className="bg-surface-container-lowest rounded-xl p-lg w-full max-w-md border border-outline-variant">
            <h3 className="font-headline-sm text-headline-sm text-on-surface mb-lg">Editar Usuario</h3>
            <div className="space-y-md">
              <div>
                <label htmlFor="edit-name" className="block font-label-md text-label-md text-on-surface mb-xs">Nombre</label>
                <input
                  type="text"
                  id="edit-name"
                  name="name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full border border-outline-variant rounded-xl px-md py-2 bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label htmlFor="edit-email" className="block font-label-md text-label-md text-on-surface mb-xs">Correo electrónico</label>
                <input
                  type="email"
                  id="edit-email"
                  name="email"
                  value={editForm.email}
                  disabled
                  className="w-full border border-outline-variant rounded-xl px-md py-2 bg-surface-container font-body-sm text-body-sm text-on-surface-variant cursor-not-allowed"
                />
              </div>
              <div>
                <label htmlFor="edit-role" className="block font-label-md text-label-md text-on-surface mb-xs">Rol</label>
                <select
                  id="edit-role"
                  name="role"
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full border border-outline-variant rounded-xl px-md py-2 bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary"
                >
{assignableRoleOptions.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
              </div>
              <div className="border-t border-outline-variant pt-md mt-md">
                <label htmlFor="edit-password" className="block font-label-md text-label-md text-on-surface mb-xs">Nueva contraseña (opcional)</label>
                <PasswordInput
                  id="edit-password"
                  name="password"
                  value={editForm.password}
                  onChange={(value) => setEditForm({ ...editForm, password: value })}
                  className="w-full border border-outline-variant rounded-xl px-md py-2 bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary"
                  placeholder="Dejar en blanco para no cambiar"
                />
              </div>
            </div>
            {formError && (
              <p className="font-body-sm text-body-sm text-on-error-container bg-error-container p-sm rounded-xl mt-md">{formError}</p>
            )}
            <div className="flex justify-end gap-sm mt-lg">
              <button
                onClick={() => { setShowEditModal(false); setEditingUser(null) }}
                className="px-lg py-2 text-on-surface-variant font-label-md text-label-md hover:bg-secondary-container rounded-full transition-colors flex items-center gap-xs"
              >
                <span className="material-symbols-outlined text-lg">close</span>
                Cancelar
              </button>
              <button
                onClick={saveUser}
                disabled={formLoading || !editForm.name}
                className="bg-primary text-on-primary font-bold px-lg py-2 rounded-full font-label-md text-label-md hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-xs"
              >
                <span className="material-symbols-outlined text-lg">save</span>
                {formLoading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

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
