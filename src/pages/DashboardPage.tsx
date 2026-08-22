import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function DashboardPage() {
  const { user, profile, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-semibold text-gray-900">PulseClass</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user?.email}</span>
            <span className={`text-xs px-2 py-1 rounded ${
              profile?.role === 'admin' ? 'bg-red-100 text-red-800' :
              profile?.role === 'teacher' ? 'bg-blue-100 text-blue-800' :
              'bg-green-100 text-green-800'
            }`}>
              {profile?.role || 'loading...'}
            </span>
            <button
              onClick={signOut}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-6">Bienvenido, {profile?.name || user?.email}</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(profile?.role === 'admin' || profile?.role === 'teacher') && (
            <Link to="/admin" className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <h3 className="text-lg font-semibold mb-2">Gestión de Usuarios</h3>
              <p className="text-gray-600">Administrar usuarios y roles del sistema</p>
            </Link>
          )}

          <div className="block p-6 bg-white rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-2">Mis Cursos</h3>
            <p className="text-gray-600">Ver cursos asignados</p>
          </div>

          <div className="block p-6 bg-white rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-2">Sesiones</h3>
            <p className="text-gray-600">Gestionar sesiones de clase</p>
          </div>
        </div>
      </main>
    </div>
  )
}
