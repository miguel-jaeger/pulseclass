import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function DashboardPage() {
  const { profile } = useAuth()

  return (
    <div>
      <header className="mb-xl flex justify-between items-end">
        <div>
          <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface">Dashboard</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-xs">Resumen de tus cursos actuales.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
        {(profile?.role === 'admin' || profile?.role === 'teacher') && (
          <Link to="/admin" className="bg-surface border border-outline-variant border-t-[3px] border-t-primary rounded-xl p-lg flex flex-col hover:shadow-sm hover:scale-[1.01] transition-all duration-200">
            <div className="flex justify-between items-start mb-md">
              <div>
                <span className="font-label-sm text-label-sm text-on-surface-variant block mb-xs">ADMIN</span>
                <h2 className="font-headline-sm text-headline-sm text-on-surface">Gestión de Usuarios</h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Administrar usuarios y roles</p>
              </div>
              <div className="bg-surface-container rounded-full p-sm flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">admin_panel_settings</span>
              </div>
            </div>
          </Link>
        )}

        <Link to="/courses" className="bg-surface border border-outline-variant border-t-[3px] border-t-primary rounded-xl p-lg flex flex-col hover:shadow-sm hover:scale-[1.01] transition-all duration-200">
          <div className="flex justify-between items-start mb-md">
            <div>
              <span className="font-label-sm text-label-sm text-on-surface-variant block mb-xs">CURSOS</span>
              <h2 className="font-headline-sm text-headline-sm text-on-surface">Mis Cursos</h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Ver y gestionar cursos asignados</p>
            </div>
            <div className="bg-surface-container rounded-full p-sm flex items-center justify-center">
              <span className="material-symbols-outlined text-primary">menu_book</span>
            </div>
          </div>
        </Link>


      </div>
    </div>
  )
}
