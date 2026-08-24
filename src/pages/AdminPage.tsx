import { useState, useEffect } from 'react'
import { insforge } from '../lib/insforge'
import { useAuth } from '../hooks/useAuth'

interface UserProfile {
  id: string
  user_id: string
  name: string
  email: string
  role: string
  created_at: string
}

export function AdminPage() {
  const { profile } = useAuth()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null)
  const [createForm, setCreateForm] = useState({ name: '', email: '', password: '', role: 'student' as string })
  const [editForm, setEditForm] = useState({ name: '', email: '', role: 'Estudiante' as string, password: '' })
  const [formError, setFormError] = useState('')
  const [formLoading, setFormLoading] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const roleLabel = (role: string) => {
    if (role === 'admin') return 'Administrador'
    if (role === 'teacher') return 'Profesor'
    return 'Estudiante'
  }

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    const { data, error } = await insforge.database
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setUsers(data as UserProfile[])
    }
    setLoading(false)
  }

  const createUser = async () => {
    setFormError('')
    setFormLoading(true)
    try {
      const { data, error } = await insforge.auth.signUp({
        email: createForm.email,
        password: createForm.password,
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
      setCreateForm({ name: '', email: '', password: '', role: 'student' })
      fetchUsers()
      showToast('Usuario creado exitosamente')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al crear usuario'
      setFormError(message)
    } finally {
      setFormLoading(false)
    }
  }

  const openEditModal = (user: UserProfile) => {
    setEditingUser(user)
    setEditForm({ name: user.name, email: user.email, role: user.role, password: '' })
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
        const { error: passwordError } = await insforge.functions.invoke('admin-change-password', {
          method: 'POST',
          body: { userId: editingUser.user_id, newPassword: editForm.password }
        })
        if (passwordError) throw passwordError
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

  const deleteUser = async (userId: string) => {
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

  if (profile?.role !== 'admin') {
    return (
      <div className="p-lg">
        <p className="font-body-md text-body-md text-error bg-error-container p-md rounded-xl">Acceso denegado. Solo administradores pueden ver esta página.</p>
      </div>
    )
  }

  return (
    <div>
      <header className="mb-xl flex justify-between items-end">
        <div>
          <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface">Gestión de Usuarios</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-xs">Administra los roles y permisos de los usuarios.</p>
        </div>
        <button
          onClick={() => { setCreateForm({ name: '', email: '', password: '', role: 'student' }); setFormError(''); setShowCreateModal(true) }}
          className="bg-primary text-on-primary font-bold py-1 px-lg rounded-full font-label-md text-label-md hover:opacity-90 transition-opacity flex items-center gap-xs"
        >
          <span className="material-symbols-outlined text-lg">person_add</span>
          Crear usuario
        </button>
      </header>

      <div className="flex flex-col md:flex-row gap-md mb-lg">
        <div className="flex-1 relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
          <input
            type="text"
            placeholder="Buscar por nombre o correo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full border border-outline-variant rounded-xl pl-10 pr-md py-2 bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="border border-outline-variant rounded-xl px-md py-2 bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary appearance-none pr-10"
        >
          <option value="all">Todos los roles</option>
          <option value="admin">Administradores</option>
          <option value="teacher">Profesores</option>
          <option value="student">Estudiantes</option>
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
        Mostrando <span className="font-bold text-on-surface">{filteredUsers.length}</span> de <span className="font-bold text-on-surface">{users.length}</span> usuarios
      </p>

      {loading ? (
        <p className="font-body-md text-body-md text-on-surface-variant">Cargando usuarios...</p>
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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant">
                  <th className="px-md py-3 text-left w-10">
                    <input
                      type="checkbox"
                      checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                      onChange={toggleSelectAllUsers}
                      className="w-4 h-4 accent-primary rounded"
                    />
                  </th>
                  <th className="px-md py-3 text-left font-label-md text-label-md text-on-surface-variant">Nombre</th>
                  <th className="px-md py-3 text-left font-label-md text-label-md text-on-surface-variant hidden md:table-cell">Correo</th>
                  <th className="px-md py-3 text-left font-label-md text-label-md text-on-surface-variant">Rol</th>
                  <th className="px-md py-3 text-left font-label-md text-label-md text-on-surface-variant">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-outline-variant hover:bg-surface-container-low transition-colors">
                    <td className="px-md py-3">
                      <input
                        type="checkbox"
                        checked={selectedUsers.has(user.user_id)}
                        onChange={() => toggleSelectUser(user.user_id)}
                        className="w-4 h-4 accent-primary rounded"
                      />
                    </td>
                    <td className="px-md py-3">
                      <div className="font-body-sm text-body-sm text-on-surface font-medium">{user.name}</div>
                      <div className="font-body-sm text-body-sm text-on-surface-variant md:hidden">{user.email}</div>
                    </td>
                    <td className="px-md py-3 font-body-sm text-body-sm text-on-surface-variant hidden md:table-cell">{user.email}</td>
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
                        <button
                          onClick={() => openEditModal(user)}
                          className="text-primary font-label-sm text-label-sm hover:underline flex items-center gap-1"
                          title="Editar usuario"
                        >
                          <span className="material-symbols-outlined text-sm">edit</span>
                        </button>
                        <button
                          onClick={() => deleteUser(user.user_id)}
                          className="text-error font-label-sm text-label-sm hover:underline flex items-center gap-1"
                          title="Eliminar usuario"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-scrim/60 flex items-center justify-center z-50 p-margin-mobile">
          <div className="bg-surface-container-lowest rounded-xl p-lg w-full max-w-md border border-outline-variant">
            <h3 className="font-headline-sm text-headline-sm text-on-surface mb-lg">Crear Usuario</h3>
            <div className="space-y-md">
              <div>
                <label className="block font-label-md text-label-md text-on-surface mb-xs">Nombre</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full border border-outline-variant rounded-xl px-md py-2 bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary"
                  placeholder="Nombre completo"
                />
              </div>
              <div>
                <label className="block font-label-md text-label-md text-on-surface mb-xs">Correo electrónico</label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  className="w-full border border-outline-variant rounded-xl px-md py-2 bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary"
                  placeholder="correo@ejemplo.com"
                />
              </div>
              <div>
                <label className="block font-label-md text-label-md text-on-surface mb-xs">Contraseña</label>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  className="w-full border border-outline-variant rounded-xl px-md py-2 bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              <div>
                <label className="block font-label-md text-label-md text-on-surface mb-xs">Rol</label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                  className="w-full border border-outline-variant rounded-xl px-md py-2 bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary"
                >
                  <option value="student">Estudiante</option>
                  <option value="teacher">Profesor</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
            </div>
            {formError && (
              <p className="font-body-sm text-body-sm text-on-error bg-error-container p-sm rounded-xl mt-md">{formError}</p>
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
                disabled={formLoading || !createForm.name || !createForm.email || !createForm.password}
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
                <label className="block font-label-md text-label-md text-on-surface mb-xs">Nombre</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full border border-outline-variant rounded-xl px-md py-2 bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block font-label-md text-label-md text-on-surface mb-xs">Correo electrónico</label>
                <input
                  type="email"
                  value={editForm.email}
                  disabled
                  className="w-full border border-outline-variant rounded-xl px-md py-2 bg-surface-container font-body-sm text-body-sm text-on-surface-variant cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block font-label-md text-label-md text-on-surface mb-xs">Rol</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full border border-outline-variant rounded-xl px-md py-2 bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary"
                >
                  <option value="student">Estudiante</option>
                  <option value="teacher">Profesor</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <div className="border-t border-outline-variant pt-md mt-md">
                <label className="block font-label-md text-label-md text-on-surface mb-xs">Nueva contraseña (opcional)</label>
                <input
                  type="password"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  className="w-full border border-outline-variant rounded-xl px-md py-2 bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary"
                  placeholder="Dejar en blanco para no cambiar"
                />
              </div>
            </div>
            {formError && (
              <p className="font-body-sm text-body-sm text-on-error bg-error-container p-sm rounded-xl mt-md">{formError}</p>
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
        <div className={`fixed bottom-lg left-1/2 -translate-x-1/2 z-50 px-lg py-sm rounded-xl shadow-lg font-body-sm text-body-sm font-medium transition-opacity ${
          toast.type === 'success' ? 'bg-success-container text-on-success-container' : 'bg-error-container text-on-error-container'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  )
}
