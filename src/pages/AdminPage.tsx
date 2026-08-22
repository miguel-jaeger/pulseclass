import { useState, useEffect } from 'react'
import { insforge } from '../lib/insforge'
import { useAuth } from '../hooks/useAuth'

interface UserProfile {
  id: string
  user_id: string
  name: string
  email: string
  role: 'admin' | 'teacher' | 'student'
  created_at: string
}

export function AdminPage() {
  const { profile } = useAuth()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')

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

  const updateRole = async (userId: string, newRole: 'admin' | 'teacher' | 'student') => {
    const { error } = await insforge.database
      .from('profiles')
      .update({ role: newRole })
      .eq('user_id', userId)

    if (!error) {
      setUsers(prev => prev.map(u =>
        u.user_id === userId ? { ...u, role: newRole } : u
      ))
    }
  }

  const deleteUser = async (userId: string, userName: string) => {
    if (!confirm(`¿Eliminar al usuario "${userName}"? Esta acción no se puede deshacer.`)) return

    const { error } = await insforge.database
      .from('profiles')
      .delete()
      .eq('user_id', userId)

    if (!error) {
      setUsers(prev => prev.filter(u => u.user_id !== userId))
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
      <header className="mb-xl">
        <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface">Gestión de Usuarios</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-xs">Administra los roles y permisos de los usuarios.</p>
      </header>

      <div className="flex flex-col md:flex-row gap-md mb-lg">
        <div className="flex-1 relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full border border-outline-variant rounded-xl pl-10 pr-md py-2 bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="border border-outline-variant rounded-xl px-md py-2 bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary"
        >
          <option value="all">Todos los roles</option>
          <option value="admin">Administradores</option>
          <option value="teacher">Profesores</option>
          <option value="student">Estudiantes</option>
        </select>
      </div>

      {loading ? (
        <p className="font-body-md text-body-md text-on-surface-variant">Cargando usuarios...</p>
      ) : (
        <div className="bg-surface border border-outline-variant rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant">
                  <th className="px-md py-3 text-left font-label-md text-label-md text-on-surface-variant">Nombre</th>
                  <th className="px-md py-3 text-left font-label-md text-label-md text-on-surface-variant hidden md:table-cell">Email</th>
                  <th className="px-md py-3 text-left font-label-md text-label-md text-on-surface-variant">Rol</th>
                  <th className="px-md py-3 text-left font-label-md text-label-md text-on-surface-variant">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-outline-variant hover:bg-surface-container-low transition-colors">
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
                        {user.role === 'admin' ? 'Admin' : user.role === 'teacher' ? 'Profesor' : 'Estudiante'}
                      </span>
                    </td>
                    <td className="px-md py-3">
                      <div className="flex items-center gap-sm">
                        <select
                          value={user.role}
                          onChange={(e) => updateRole(user.user_id, e.target.value as 'admin' | 'teacher' | 'student')}
                          className="border border-outline-variant rounded-xl px-sm py-1 bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary"
                        >
                          <option value="student">Estudiante</option>
                          <option value="teacher">Profesor</option>
                          <option value="admin">Administrador</option>
                        </select>
                        <button
                          onClick={() => deleteUser(user.user_id, user.name)}
                          className="text-error font-label-sm text-label-sm hover:underline flex items-center gap-1"
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
    </div>
  )
}
