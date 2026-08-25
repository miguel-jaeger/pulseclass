import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Avatar } from '../pages/ProfilePage'
import type { ReactNode } from 'react'

const navItems = [
  { to: '/', icon: 'dashboard', label: 'Resumen' },
  { to: '/courses', icon: 'star_rate', label: 'Cursos' },
  { to: '/statistics', icon: 'bar_chart', label: 'Estadísticas' },
  { to: '/suggestions', icon: 'feedback', label: 'Sugerencias' },
  { to: '/admin', icon: 'manage_accounts', label: 'Administrar', adminOnly: true },
]

const bottomNavItems = [
  { to: '/', icon: 'home', label: 'Inicio', fill: true },
  { to: '/courses', icon: 'grade', label: 'Cursos' },
  { to: '/statistics', icon: 'bar_chart', label: 'Estadísticas' },
  { to: '/suggestions', icon: 'feedback', label: 'Sugerencias' },
  { to: '/admin', icon: 'manage_accounts', label: 'Administrar', adminOnly: true },
]

export function Layout({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth()
  const location = useLocation()

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  const filteredNavItems = navItems.filter(item => !item.adminOnly || profile?.role === 'admin')
  const filteredBottomNav = bottomNavItems.filter(item => !item.adminOnly || profile?.role === 'admin')

  return (
    <div className="flex h-full">
      {/* SideNavBar (Desktop) */}
      <nav className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 p-md bg-surface-container-low border-r border-outline-variant transition-all duration-200 ease-in-out z-40">
        <div className="mb-lg">
          <Link to="/" className="flex items-center gap-sm mb-xs group">
            <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-on-primary-container text-xl">school</span>
            </div>
            <div>
              <div className="font-headline-sm text-headline-sm font-bold text-primary">PulseClass</div>
              <div className="text-on-surface-variant font-label-sm text-label-sm">Satisfacción Estudiantil</div>
            </div>
          </Link>
        </div>

        <div className="flex-1 space-y-xs">
          {filteredNavItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-md px-4 py-2 rounded-full font-label-md text-label-md transition-all ${
                isActive(item.to)
                  ? 'bg-primary-container text-on-primary-container font-bold'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-secondary-container'
              }`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>

        <div className="mt-auto space-y-sm">
          <div className="border-t border-outline-variant pt-sm space-y-sm">
            <Link
              to="/profile"
              className="flex items-center gap-md px-4 py-2 text-on-surface-variant hover:text-on-surface hover:bg-secondary-container rounded-full transition-all"
            >
              <Avatar url={profile?.avatar_url} name={profile?.name} size="sm" />
              <span className="truncate">{profile?.name || 'Usuario'}</span>
            </Link>
            <button
              onClick={signOut}
              className="w-full flex items-center gap-md px-4 py-2 text-on-surface-variant hover:text-on-surface hover:bg-secondary-container rounded-full font-label-md text-label-md transition-all"
            >
              <span className="material-symbols-outlined">logout</span>
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>
      </nav>

      {/* TopAppBar (Mobile) */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-margin-mobile md:px-margin-desktop h-16 bg-surface border-b border-outline-variant md:hidden">
        <div className="flex items-center gap-sm">
          <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center">
            <span className="material-symbols-outlined text-on-primary-container text-lg">school</span>
          </div>
          <div className="font-headline-sm text-headline-sm font-bold text-primary">PulseClass</div>
        </div>
        <Link to="/profile" className="flex items-center gap-4 text-primary">
          <Avatar url={profile?.avatar_url} name={profile?.name} size="sm" />
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 ml-0 md:ml-64 pt-16 md:pt-xl pb-16 md:pb-xl px-margin-mobile md:px-margin-desktop max-w-[max-width] mx-auto w-full min-h-screen">
        {children}
      </main>

      {/* BottomNavBar (Mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-surface border-t border-outline-variant flex justify-around items-center px-2" style={{ zIndex: 9999 }}>
        {filteredBottomNav.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={`flex flex-col items-center justify-center px-3 py-1 ${
              isActive(item.to)
                ? 'text-primary'
                : 'text-on-surface-variant'
            }`}
          >
            <span
              className="material-symbols-outlined text-[22px]"
              style={item.fill ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              {item.icon}
            </span>
            <span className="font-label-xs text-label-xs mt-0.5">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
