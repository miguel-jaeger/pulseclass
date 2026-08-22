import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import type { ReactNode } from 'react'

const navItems = [
  { to: '/', icon: 'dashboard', label: 'Dashboard' },
  { to: '/courses', icon: 'star_rate', label: 'Cursos' },
  { to: '/admin', icon: 'person', label: 'Admin', adminOnly: true },
]

const bottomNavItems = [
  { to: '/', icon: 'home', label: 'Home', fill: true },
  { to: '/courses', icon: 'grade', label: 'Cursos' },
  { to: '/admin', icon: 'person', label: 'Admin', adminOnly: true },
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
          <div className="flex items-center gap-sm mb-xs">
            <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-on-primary-container text-lg">school</span>
            </div>
            <div className="font-headline-sm text-headline-sm font-bold text-primary">PulseClass</div>
          </div>
          <div className="text-on-surface-variant font-label-sm text-label-sm">Academic Portal</div>
        </div>

        <div className="flex-1 space-y-sm">
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
            <div className="flex items-center gap-md px-4 py-2 text-on-surface-variant">
              <span className="material-symbols-outlined">account_circle</span>
              <span className="truncate">{profile?.name || 'Usuario'}</span>
            </div>
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
        <div className="font-headline-sm text-headline-sm font-bold text-primary">PulseClass</div>
        <div className="flex items-center gap-4 text-primary">
          <span className="material-symbols-outlined">account_circle</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 ml-0 md:ml-64 pt-16 md:pt-0 pb-16 md:pb-0 p-margin-mobile md:p-margin-desktop max-w-[max-width] mx-auto w-full min-h-screen">
        {children}
      </main>

      {/* BottomNavBar (Mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center h-16 px-4 bg-surface border-t border-outline-variant shadow-md rounded-t-xl">
        {filteredBottomNav.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={`flex flex-col items-center justify-center rounded-full px-4 py-1 scale-95 duration-100 ${
              isActive(item.to)
                ? 'bg-primary-container text-on-primary-container'
                : 'text-on-surface-variant active:bg-surface-variant'
            }`}
          >
            <span
              className="material-symbols-outlined"
              style={item.fill ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              {item.icon}
            </span>
            <span className="font-label-sm text-label-sm mt-1">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
