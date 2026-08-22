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
            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
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
        <p>Bienvenido a PulseClass</p>
      </main>
    </div>
  )
}
