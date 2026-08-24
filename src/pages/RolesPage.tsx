import { useState, useEffect } from 'react'
import { insforge } from '../lib/insforge'
import { useAuth } from '../hooks/useAuth'

interface UserProfile {
  id: string
  user_id: string
  name: string
  email: string
  role: 'admin' | 'teacher' | 'student'
}

interface RoleCount {
  role: string
  label: string
  icon: string
  count: number
  color: string
  bgColor: string
}

export function RolesPage() {
  const { profile } = useAuth()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchUsers() {
      const { data, error } = await insforge.database
        .from('profiles')
        .select('id, user_id, name, email, role')
      if (!error && data) {
        setUsers(data as UserProfile[])
      }
      setLoading(false)
    }
    fetchUsers()
  }, [])

  if (profile?.role !== 'admin') {
    return (
      <div className="p-lg">
        <p className="font-body-md text-body-md text-error bg-error-container p-md rounded-xl">Acceso denegado. Solo administradores pueden ver esta pagina.</p>
      </div>
    )
  }

  const roleConfig: Record<string, Omit<RoleCount, 'count'>> = {
    admin: {
      role: 'admin',
      label: 'Administradores',
      icon: 'admin_panel_settings',
      color: 'text-on-primary-container',
      bgColor: 'bg-primary-container',
    },
    teacher: {
      role: 'teacher',
      label: 'Docentes',
      icon: 'school',
      color: 'text-on-secondary-container',
      bgColor: 'bg-secondary-container',
    },
    student: {
      role: 'student',
      label: 'Estudiantes',
      icon: 'person',
      color: 'text-on-surface',
      bgColor: 'bg-surface-container',
    },
  }

  const roles: RoleCount[] = ['admin', 'teacher', 'student'].map(roleKey => ({
    ...roleConfig[roleKey],
    count: users.filter(u => u.role === roleKey).length,
  }))

  const usersByRole = (role: string) => users.filter(u => u.role === role)

  return (
    <div>
      <header className="mb-xl">
        <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface">Roles</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-xs">Vista general de usuarios por rol.</p>
      </header>

      {loading ? (
        <p className="font-body-md text-body-md text-on-surface-variant">Cargando roles...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-lg mb-xl">
            {roles.map(r => (
              <div key={r.role} className="bg-surface border border-outline-variant rounded-xl p-lg">
                <div className="flex items-center gap-sm mb-sm">
                  <span className={`material-symbols-outlined ${r.color}`}>{r.icon}</span>
                  <h3 className="font-label-md text-label-md text-on-surface-variant">{r.label}</h3>
                </div>
                <p className="font-headline-lg text-headline-lg text-primary font-bold">{r.count}</p>
              </div>
            ))}
          </div>

          <div className="space-y-xl">
            {roles.map(r => (
              <div key={r.role} className="bg-surface border border-outline-variant rounded-xl overflow-hidden">
                <div className="px-lg py-md border-b border-outline-variant bg-surface-container-low">
                  <h2 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-sm">
                    <span className={`material-symbols-outlined ${r.color}`}>{r.icon}</span>
                    {r.label}
                    <span className="ml-auto font-label-sm text-label-sm text-on-surface-variant">{r.count} usuario{r.count !== 1 ? 's' : ''}</span>
                  </h2>
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
                      {usersByRole(r.role).map(user => (
                        <tr key={user.id} className="border-b border-outline-variant last:border-0 hover:bg-surface-container-low transition-colors">
                          <td className="px-lg py-3 font-body-sm text-body-sm text-on-surface">{user.name}</td>
                          <td className="px-lg py-3 font-body-sm text-body-sm text-on-surface-variant hidden md:table-cell">{user.email}</td>
                        </tr>
                      ))}
                      {usersByRole(r.role).length === 0 && (
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
            ))}
          </div>
        </>
      )}
    </div>
  )
}
