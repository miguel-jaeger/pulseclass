import { useState, useEffect } from 'react'
import { insforge } from '../lib/insforge'
import { useAuth } from '../hooks/useAuth'

interface UserProfile {
  id: string
  user_id: string
  name: string
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
      <div className="p-8">
        <p className="text-red-600">Acceso denegado. Solo administradores pueden ver esta página.</p>
      </div>
    )
  }

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-6">Gestión de Usuarios</h2>

      {loading ? (
        <p>Cargando...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 text-left border-b">Nombre</th>
                <th className="px-4 py-2 text-left border-b">Email</th>
                <th className="px-4 py-2 text-left border-b">Rol</th>
                <th className="px-4 py-2 text-left border-b">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 border-b">{user.name}</td>
                  <td className="px-4 py-2 border-b">{user.user_id}</td>
                  <td className="px-4 py-2 border-b">
                    <span className={`px-2 py-1 rounded text-sm ${
                      user.role === 'admin' ? 'bg-red-100 text-red-800' :
                      user.role === 'teacher' ? 'bg-blue-100 text-blue-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-2 border-b">
                    <select
                      value={user.role}
                      onChange={(e) => updateRole(user.user_id, e.target.value as 'admin' | 'teacher' | 'student')}
                      className="border rounded px-2 py-1 text-sm"
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
      )}
    </div>
  )
}
