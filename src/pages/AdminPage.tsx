import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { insforge } from '../lib/insforge'
import { useAuth } from '../hooks/useAuth'
import { useImpersonation } from '../hooks/useImpersonation'
import { Pagination, usePagination } from '../components/Pagination'
import { normalizeRole, roleLabel, ROLE_FILTER_OPTIONS, ROLE_OPTIONS } from '../lib/roles'

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
}

export function AdminPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const { startImpersonation } = useImpersonation()
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
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [showVerComo, setShowVerComo] = useState(false)
  const verComoRef = useRef<HTMLDivElement>(null)
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
      if (verComoRef.current && !verComoRef.current.contains(e.target as Node)) {
        setShowVerComo(false)
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
      const { data, error } = await insforge.auth.signUp({
        email: createForm.email,
        password: '12345678',
        name: createForm.name
      })

      if (error) throw error

      if (data?.user) {
        await insforge.database
          .from('profiles')
          .update({ role: createForm.role, name: createForm.name })
          .eq('user_id', data.user.id)
      }

      setShowCreateModal(false)
      setCreateForm({ name: '', email: '', role: 'student' })
      fetchUsers()
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
      if (lines.length < 2) {
        setImportResult({ imported: 0, skipped: [], error: 'El archivo debe incluir encabezados y al menos un usuario.' })
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
        setImportResult({ imported: 0, skipped: [], error: 'No se encontraron usuarios en el archivo.' })
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

    for (const userId of selectedUsers) {
      await insforge.functions.invoke('delete-user', {
        method: 'POST',
        body: { userId }
      })
    }
    setUsers(prev => prev.filter(u => !selectedUsers.has(u.user_id)))
    setSelectedUsers(new Set())
    showToast(`${selectedUsers.size} usuario(s) eliminado(s)`)
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

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = roleFilter === 'all' || u.role === roleFilter
    return matchesSearch && matchesRole
  })

  const { page, perPage, setPage, setPerPage, paginatedSlice } = usePagination(filteredUsers.length, 10)
  const paginatedUsers = paginatedSlice(filteredUsers)

  if (profile?.role !== 'admin') {
    return (
      <div className="p-lg">
        <p className="font-body-md text-body-md text-error bg-error-container p-md rounded-xl">Acceso denegado. Solo administradores pueden ver esta página.</p>
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
        <div className="flex flex-wrap items-center justify-end gap-sm flex-shrink-0 self-end md:self-auto">
          <div className="relative" ref={verComoRef}>
            <button
              onClick={() => setShowVerComo(!showVerComo)}
              className="bg-tertiary-container text-on-tertiary-container font-bold py-1 px-lg rounded-full font-label-md text-label-md hover:opacity-90 transition-opacity flex items-center gap-xs whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-lg">visibility</span>
              Ver como<span className="material-symbols-outlined text-lg">expand_more</span>
            </button>
            {showVerComo && (
              <div className="absolute right-0 top-full mt-1 bg-surface-container-high rounded-xl border border-outline-variant shadow-lg overflow-hidden min-w-[180px] z-50">
                <button
                  onClick={() => { startImpersonation('teacher'); navigate('/'); setShowVerComo(false) }}
                  className="flex items-center gap-3 px-4 py-3 w-full border-b border-outline-variant last:border-0 text-on-surface hover:bg-secondary-container transition-colors"
                >
                  <span className="material-symbols-outlined text-xl">school</span>
                  <span className="font-body-md text-body-md">Profesor</span>
                </button>
                <button
                  onClick={() => { startImpersonation('student'); navigate('/'); setShowVerComo(false) }}
                  className="flex items-center gap-3 px-4 py-3 w-full text-on-surface hover:bg-secondary-container transition-colors"
                >
                  <span className="material-symbols-outlined text-xl">person</span>
                  <span className="font-body-md text-body-md">Estudiante</span>
                </button>
              </div>
            )}
          </div>
          <button
            onClick={() => { setCreateForm({ name: '', email: '', role: 'student' }); setFormError(''); setShowCreateModal(true) }}
            className="bg-primary text-on-primary font-bold py-1 px-lg rounded-full font-label-md text-label-md hover:opacity-90 transition-opacity flex items-center gap-xs"
          >
            <span className="material-symbols-outlined text-lg">person_add</span>
            Crear
          </button>
          <button
            onClick={() => { setShowImportModal(true); setImportResult(null) }}
            className="bg-secondary-container text-on-surface font-bold py-1 px-lg rounded-full font-label-md text-label-md hover:opacity-90 transition-opacity flex items-center gap-xs"
          >
            <span className="material-symbols-outlined text-lg">upload_file</span>
            Importar CSV
          </button>
          <a
            href="https://res.cloudinary.com/dhecags26/raw/upload/v1787804153/example-import_geijtw.csv"
            download
            title="Descargar plantilla CSV"
            className="bg-secondary-container text-on-surface font-bold py-1 px-lg rounded-full font-label-md text-label-md hover:opacity-90 transition-opacity flex items-center gap-xs"
          >
            <span className="material-symbols-outlined text-lg">download</span>
            Plantilla
          </a>
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
      </div>

      {/* Summary Bar */}
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

      <p className="font-body-sm text-body-sm text-on-surface-variant mb-md">
        Mostrando <span className="font-bold text-primary font-bold">{paginatedUsers.length}</span> de <span className="font-bold text-primary font-bold">{filteredUsers.length}</span> usuarios
      </p>

      {loading ? (
        <div className="bg-surface border border-outline-variant rounded-xl overflow-hidden">
          <table className="w-full hidden md:table">
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
            <div className="flex items-center justify-between px-md py-2 bg-error-container border-b border-outline-variant">
              <span className="font-body-sm text-body-sm text-on-error-container">
                {selectedUsers.size} usuarios seleccionados
              </span>
              <button
                onClick={deleteSelectedUsers}
                className="bg-error text-on-error font-bold py-1 px-lg rounded-full font-label-md text-label-md hover:opacity-90 transition-opacity flex items-center gap-xs"
              >
                <span className="material-symbols-outlined text-lg">group_remove</span>
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
                      id="select-all-users"
                      name="selectAll"
                      checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                      onChange={toggleSelectAllUsers}
                      className="w-4 h-4 accent-primary rounded"
                    />
                  </th>
                  <th className="px-md py-3 text-left font-label-md text-label-md text-on-surface-variant">Nombre</th>
                  <th className="px-md py-3 text-left font-label-md text-label-md text-on-surface-variant">Correo</th>
                  <th className="px-md py-3 text-left font-label-md text-label-md text-on-surface-variant">Rol</th>
                  <th className="px-md py-3 text-left font-label-md text-label-md text-on-surface-variant">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((user) => (
                  <tr key={user.id} className="border-b border-outline-variant hover:bg-surface-container-low transition-colors">
                    <td className="px-md py-3">
                      <input
                        type="checkbox"
                        name="selectUser"
                        checked={selectedUsers.has(user.user_id)}
                        onChange={() => toggleSelectUser(user.user_id)}
                        className="w-4 h-4 accent-primary rounded"
                      />
                    </td>
                    <td className="px-md py-3">
                      <div className="font-body-sm text-body-sm text-on-surface font-medium">{user.name}</div>
                    </td>
                    <td className="px-md py-3 font-body-sm text-body-sm text-on-surface-variant">{user.email}</td>
                    <td className="px-md py-3">
                      <span className={`inline-flex items-center px-sm py-xs rounded-full font-label-sm text-label-sm ${
                        user.role === 'admin' ? 'bg-primary-container text-on-primary-container' :
                        user.role === 'teacher' ? 'bg-surface-container text-on-surface' :
                        'bg-secondary-container text-on-secondary-container'
                      }`}>
                        <span className="material-symbols-outlined text-sm mr-xs">
                          {user.role === 'admin' ? 'admin_panel_settings' : user.role === 'teacher' ? 'school' : 'person'}
                        </span>
                        {roleLabel(user.role)}
                      </span>
                    </td>
                    <td className="px-md py-3">
                      <div className="flex items-center gap-sm">
                        {user.role !== 'admin' && (
                          <button
                            onClick={() => { startImpersonation(user.role as 'teacher' | 'student'); navigate('/') }}
                            className="w-9 h-9 flex items-center justify-center rounded-full bg-surface-container text-tertiary hover:bg-tertiary-container hover:text-on-tertiary-container transition-colors"
                            title={`Ver como ${roleLabel(user.role)}`}
                          >
                            <span className="material-symbols-outlined text-xl">visibility</span>
                          </button>
                        )}
                        <button
                          onClick={() => openEditModal(user)}
                          className="w-9 h-9 flex items-center justify-center rounded-full bg-surface-container text-primary hover:bg-primary-container hover:text-on-primary-container transition-colors"
                          title="Editar usuario"
                        >
                          <span className="material-symbols-outlined text-xl">edit</span>
                        </button>
                        <button
                          onClick={() => resetPassword(user.user_id)}
                          className="w-9 h-9 flex items-center justify-center rounded-full bg-surface-container text-tertiary hover:bg-tertiary-container hover:text-on-tertiary-container transition-colors"
                          title="Restablecer contraseña"
                        >
                          <span className="material-symbols-outlined text-xl">key</span>
                        </button>
                        <button
                          onClick={() => deleteUser(user.user_id)}
                          className="w-9 h-9 flex items-center justify-center rounded-full bg-surface-container text-error hover:bg-error-container hover:text-on-error-container transition-colors"
                          title="Eliminar usuario"
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
            {paginatedUsers.map((user) => (
              <div key={user.id} className="border-b border-outline-variant last:border-0 p-md hover:bg-surface-container-low transition-colors">
                <div className="flex items-start justify-between gap-sm">
                  <div className="flex items-center gap-sm min-w-0">
                    <input
                      type="checkbox"
                      name="selectUser"
                      checked={selectedUsers.has(user.user_id)}
                      onChange={() => toggleSelectUser(user.user_id)}
                      className="w-4 h-4 accent-primary rounded mt-1 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="font-body-sm text-body-sm text-on-surface font-medium truncate">{user.name}</div>
                      <div className="font-body-xs text-body-xs text-on-surface-variant truncate">{user.email}</div>
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
                  <div className="flex items-center gap-sm shrink-0">
                    {user.role !== 'admin' && (
                      <button
                        onClick={() => { startImpersonation(user.role as 'teacher' | 'student'); navigate('/') }}
                        className="w-9 h-9 flex items-center justify-center rounded-full bg-surface-container text-tertiary hover:bg-tertiary-container hover:text-on-tertiary-container transition-colors"
                        title={`Ver como ${roleLabel(user.role)}`}
                      >
                        <span className="material-symbols-outlined text-xl">visibility</span>
                      </button>
                    )}
                    <button
                      onClick={() => openEditModal(user)}
                      className="w-9 h-9 flex items-center justify-center rounded-full bg-surface-container text-primary hover:bg-primary-container hover:text-on-primary-container transition-colors"
                      title="Editar"
                    >
                      <span className="material-symbols-outlined text-xl">edit</span>
                    </button>
                    <button
                      onClick={() => resetPassword(user.user_id)}
                      className="w-9 h-9 flex items-center justify-center rounded-full bg-surface-container text-tertiary hover:bg-tertiary-container hover:text-on-tertiary-container transition-colors"
                      title="Restablecer contraseña"
                    >
                      <span className="material-symbols-outlined text-xl">key</span>
                    </button>
                    <button
                      onClick={() => deleteUser(user.user_id)}
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
                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-outline-variant">
                          <th className="px-sm py-2 text-left font-label-sm text-label-sm text-on-surface-variant">Nombre</th>
                          <th className="px-sm py-2 text-left font-label-sm text-label-sm text-on-surface-variant">Correo</th>
                          <th className="px-sm py-2 text-left font-label-sm text-label-sm text-on-surface-variant">Motivo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importResult.skipped.map((user, index) => (
                          <tr key={`${user.email}-${index}`} className="border-b border-outline-variant last:border-0">
                            <td className="px-sm py-2 font-body-sm text-body-sm text-primary font-bold">{user.name}</td>
                            <td className="px-sm py-2 font-body-sm text-body-sm text-on-surface-variant">{user.email}</td>
                            <td className="px-sm py-2 font-body-sm text-body-sm text-on-surface-variant">{user.reason || 'omitido'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
            <h3 className="font-headline-sm text-headline-sm text-on-surface mb-lg">Crear Usuario</h3>
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
{ROLE_OPTIONS.map(opt => (
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
                onClick={() => setShowCreateModal(false)}
                className="px-lg py-2 text-on-surface-variant font-label-md text-label-md hover:bg-secondary-container rounded-full transition-colors flex items-center gap-xs"
              >
                <span className="material-symbols-outlined text-lg">close</span>
                Cancelar
              </button>
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
{ROLE_OPTIONS.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
              </div>
              <div className="border-t border-outline-variant pt-md mt-md">
                <label htmlFor="edit-password" className="block font-label-md text-label-md text-on-surface mb-xs">Nueva contraseña (opcional)</label>
                <input
                  type="password"
                  id="edit-password"
                  name="password"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
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
