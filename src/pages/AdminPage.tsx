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
      fetchUsers()
    }
  }

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
                {users.map((user) => (
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
                      <select
                        value={user.role}
                        onChange={(e) => updateRole(user.user_id, e.target.value as 'admin' | 'teacher' | 'student')}
                        className="border border-outline-variant rounded-xl px-sm py-1 bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary"
                      >
                        <option value="student">Estudiante</option>
                        <option value="teacher">Profesor</option>
                        <option value="admin">Administrador</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
