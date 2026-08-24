import { useState, useEffect } from 'react'
import { insforge } from '../lib/insforge'
import { useAuth } from '../hooks/useAuth'

interface Role {
  id: string
  name: string
  description: string
  created_at: string
}

interface UserProfile {
  id: string
  user_id: string
  name: string
  email: string
  role: string
}

export function RolesPage() {
  const { profile } = useAuth()
  const [roles, setRoles] = useState<Role[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [createForm, setCreateForm] = useState({ name: '', description: '' })
  const [editForm, setEditForm] = useState({ name: '', description: '' })
  const [formError, setFormError] = useState('')
  const [formLoading, setFormLoading] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const [rolesResult, usersResult] = await Promise.all([
      insforge.database.from('roles').select('*').order('name'),
      insforge.database.from('profiles').select('id, user_id, name, email, role'),
    ])
    if (!rolesResult.error && rolesResult.data) {
      setRoles(rolesResult.data as Role[])
    }
    if (!usersResult.error && usersResult.data) {
      setUsers(usersResult.data as UserProfile[])
    }
    setLoading(false)
  }

  const getUsersByRole = (roleName: string) => users.filter(u => u.role === roleName)

  const createRole = async () => {
    setFormError('')
    setFormLoading(true)
    try {
      const { error } = await insforge.database
        .from('roles')
        .insert([{ name: createForm.name.trim(), description: createForm.description.trim() }])

      if (error) {
        if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
          setFormError('Ya existe un rol con ese nombre.')
        } else {
          throw error
        }
        return
      }

      setShowCreateModal(false)
      setCreateForm({ name: '', description: '' })
      fetchData()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al crear rol'
      setFormError(message)
    } finally {
      setFormLoading(false)
    }
  }

  const openEditModal = (role: Role) => {
    setEditingRole(role)
    setEditForm({ name: role.name, description: role.description || '' })
    setFormError('')
    setShowEditModal(true)
  }

  const saveRole = async () => {
    if (!editingRole) return
    setFormError('')
    setFormLoading(true)
    try {
      const { error } = await insforge.database
        .from('roles')
        .update({ name: editForm.name.trim(), description: editForm.description.trim() })
        .eq('id', editingRole.id)

      if (error) {
        if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
          setFormError('Ya existe un rol con ese nombre.')
        } else {
          throw error
        }
        return
      }

      setShowEditModal(false)
      setEditingRole(null)
      fetchData()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar cambios'
      setFormError(message)
    } finally {
      setFormLoading(false)
    }
  }

  const deleteRole = async (role: Role) => {
    const usersWithRole = getUsersByRole(role.name)
    if (usersWithRole.length > 0) {
      setFormError(`No se puede eliminar el rol "${role.name}" porque tiene ${usersWithRole.length} usuario(s) asignado(s). Reasigna los usuarios antes de eliminar.`)
      return
    }

    if (!confirm(`Eliminar el rol "${role.name}"? Esta accion no se puede deshacer.`)) return

    const { error } = await insforge.database
      .from('roles')
      .delete()
      .eq('id', role.id)

    if (!error) {
      fetchData()
    }
  }

  if (profile?.role !== 'admin') {
    return (
      <div className="p-lg">
        <p className="font-body-md text-body-md text-error bg-error-container p-md rounded-xl">Acceso denegado. Solo administradores pueden ver esta pagina.</p>
      </div>
    )
  }

  return (
    <div>
      <header className="mb-xl flex justify-between items-end">
        <div>
          <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface">Roles</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-xs">Administra los roles del sistema.</p>
        </div>
        <button
          onClick={() => { setCreateForm({ name: '', description: '' }); setFormError(''); setShowCreateModal(true) }}
          className="bg-primary text-on-primary font-bold py-2 px-lg rounded-full font-label-md text-label-md hover:opacity-90 transition-opacity"
        >
          Crear rol
        </button>
      </header>

      {loading ? (
        <p className="font-body-md text-body-md text-on-surface-variant">Cargando roles...</p>
      ) : roles.length === 0 ? (
        <div className="text-center py-xl">
          <span className="material-symbols-outlined text-on-surface-variant text-[48px] mb-md block">shield</span>
          <p className="font-body-md text-body-md text-on-surface-variant">No hay roles creados.</p>
        </div>
      ) : (
        <div className="space-y-lg">
          {roles.map(role => {
            const roleUsers = getUsersByRole(role.name)
            return (
              <div key={role.id} className="bg-surface border border-outline-variant rounded-xl overflow-hidden">
                <div className="px-lg py-md border-b border-outline-variant bg-surface-container-low flex items-center justify-between">
                  <div className="flex items-center gap-sm">
                    <span className="material-symbols-outlined text-primary">shield</span>
                    <div>
                      <h2 className="font-headline-sm text-headline-sm text-on-surface">{role.name}</h2>
                      {role.description && (
                        <p className="font-body-sm text-body-sm text-on-surface-variant">{role.description}</p>
                      )}
                    </div>
                    <span className="ml-sm inline-flex items-center px-sm py-xs rounded-full font-label-sm text-label-sm bg-secondary-container text-on-secondary-container">
                      {roleUsers.length} usuario{roleUsers.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-sm">
                    <button
                      onClick={() => openEditModal(role)}
                      className="text-primary font-label-sm text-label-sm hover:underline flex items-center gap-1"
                      title="Editar rol"
                    >
                      <span className="material-symbols-outlined text-sm">edit</span>
                    </button>
                    <button
                      onClick={() => deleteRole(role)}
                      className="text-error font-label-sm text-label-sm hover:underline flex items-center gap-1"
                      title="Eliminar rol"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-outline-variant">
                        <th className="px-lg py-3 text-left font-label-md text-label-md text-on-surface-variant">Nombre</th>
                        <th className="px-lg py-3 text-left font-label-md text-label-md text-on-surface-variant hidden md:table-cell">Correo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roleUsers.map(user => (
                        <tr key={user.id} className="border-b border-outline-variant last:border-0 hover:bg-surface-container-low transition-colors">
                          <td className="px-lg py-3 font-body-sm text-body-sm text-on-surface">{user.name}</td>
                          <td className="px-lg py-3 font-body-sm text-body-sm text-on-surface-variant hidden md:table-cell">{user.email}</td>
                        </tr>
                      ))}
                      {roleUsers.length === 0 && (
                        <tr>
                          <td colSpan={2} className="px-lg py-4 text-center font-body-sm text-body-sm text-on-surface-variant">
                            No hay usuarios con este rol.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Role Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-scrim/60 flex items-center justify-center z-50 p-margin-mobile">
          <div className="bg-surface-container-lowest rounded-xl p-lg w-full max-w-md border border-outline-variant">
            <h3 className="font-headline-sm text-headline-sm text-on-surface mb-lg">Crear Rol</h3>
            <div className="space-y-md">
              <div>
                <label className="block font-label-md text-label-md text-on-surface mb-xs">Nombre</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full border border-outline-variant rounded-xl px-md py-2 bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary"
                  placeholder="Nombre del rol (ej: coordinador)"
                />
              </div>
              <div>
                <label className="block font-label-md text-label-md text-on-surface mb-xs">Descripcion</label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full border border-outline-variant rounded-xl px-md py-2 bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary"
                  placeholder="Descripcion opcional del rol"
                  rows={2}
                />
              </div>
            </div>
            {formError && (
              <p className="font-body-sm text-body-sm text-on-error bg-error-container p-sm rounded-xl mt-md">{formError}</p>
            )}
            <div className="flex justify-end gap-sm mt-lg">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-lg py-2 text-on-surface-variant font-label-md text-label-md hover:bg-secondary-container rounded-full transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={createRole}
                disabled={formLoading || !createForm.name.trim()}
                className="bg-primary text-on-primary font-bold px-lg py-2 rounded-full font-label-md text-label-md hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {formLoading ? 'Creando...' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {showEditModal && editingRole && (
        <div className="fixed inset-0 bg-scrim/60 flex items-center justify-center z-50 p-margin-mobile">
          <div className="bg-surface-container-lowest rounded-xl p-lg w-full max-w-md border border-outline-variant">
            <h3 className="font-headline-sm text-headline-sm text-on-surface mb-lg">Editar Rol</h3>
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
                <label className="block font-label-md text-label-md text-on-surface mb-xs">Descripcion</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full border border-outline-variant rounded-xl px-md py-2 bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary"
                  rows={2}
                />
              </div>
            </div>
            {formError && (
              <p className="font-body-sm text-body-sm text-on-error bg-error-container p-sm rounded-xl mt-md">{formError}</p>
            )}
            <div className="flex justify-end gap-sm mt-lg">
              <button
                onClick={() => { setShowEditModal(false); setEditingRole(null) }}
                className="px-lg py-2 text-on-surface-variant font-label-md text-label-md hover:bg-secondary-container rounded-full transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={saveRole}
                disabled={formLoading || !editForm.name.trim()}
                className="bg-primary text-on-primary font-bold px-lg py-2 rounded-full font-label-md text-label-md hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {formLoading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
