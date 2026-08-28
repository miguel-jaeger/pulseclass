import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Avatar } from '../pages/ProfilePage'
import type { ReactNode } from 'react'

const navItems = [
  { to: '/', icon: 'dashboard', label: 'Resumen' },
  { to: '/courses', icon: 'menu_book', label: 'Cursos' },
  { to: '/statistics', icon: 'bar_chart', label: 'Estadísticas' },
  { to: '/suggestions', icon: 'feedback', label: 'Sugerencias' },
  { to: '/videos', icon: 'help', label: 'Ayuda' },
  { to: '/admin', icon: 'manage_accounts', label: 'Administrar', adminOnly: true },
]

const adminSubItems = [
  { to: '/admin', icon: 'people', label: 'Usuarios' },
  { to: '/admin/videos', icon: 'video_library', label: 'Videos' },
]

const bottomNavItems = [
  { to: '/', icon: 'home', label: 'Inicio', fill: true },
  { to: '/courses', icon: 'menu_book', label: 'Cursos' },
  { to: '/statistics', icon: 'bar_chart', label: 'Estadísticas' },
  { to: '/suggestions', icon: 'feedback', label: 'Sugerencias' },
  { to: '/videos', icon: 'help', label: 'Ayuda' },
  { to: '/admin', icon: 'manage_accounts', label: 'Administrar', adminOnly: true },
]

export function Layout({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth()
  const location = useLocation()
  const [adminOpen, setAdminOpen] = useState(location.pathname.startsWith('/admin'))
  const [mobileAdminOpen, setMobileAdminOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebarCollapsed') === 'true')

  useEffect(() => {
    setMobileAdminOpen(false)
  }, [location.pathname])

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', String(collapsed))
  }, [collapsed])

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  const filteredNavItems = navItems.filter(item => !item.adminOnly || profile?.role === 'admin')
  const filteredBottomNav = bottomNavItems.filter(item => !item.adminOnly || profile?.role === 'admin')

  return (
    <div className="flex h-full">
      {/* SideNavBar (Desktop) */}
      <nav className={`hidden md:flex flex-col h-screen fixed left-0 top-0 bg-surface-container-low border-r border-outline-variant transition-all duration-200 ease-in-out z-40 ${collapsed ? 'w-16 p-2' : 'w-64 p-md'}`}>
        {/* Logo + Toggle */}
        <div className={`mb-lg ${collapsed ? 'flex justify-center' : ''}`}>
          <Link to="/" className={`group ${collapsed ? 'flex items-center justify-center' : 'flex items-center gap-sm mb-xs'}`}>
            <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
              <span className="material-symbols-outlined text-on-primary-container text-xl">school</span>
            </div>
            {!collapsed && (
              <div>
                <div className="font-headline-sm text-headline-sm font-bold text-primary">PulseClass</div>
                <div className="text-on-surface-variant font-label-sm text-label-sm">Satisfacción Estudiantil</div>
              </div>
            )}
          </Link>
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="absolute top-4 -right-3 flex items-center justify-center w-6 h-6 bg-surface-container-low border border-outline-variant text-on-surface-variant hover:text-on-surface hover:bg-secondary-container rounded-full transition-all shadow-sm z-50"
              title="Colapsar menú"
            >
              <span className="material-symbols-outlined text-sm">dock_left</span>
            </button>
          )}
        </div>

        {/* Expand button when collapsed */}
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="mb-sm flex items-center justify-center w-10 h-10 mx-auto text-on-surface-variant hover:text-on-surface hover:bg-secondary-container rounded-full transition-all"
            title="Expandir menú"
          >
            <span className="material-symbols-outlined text-lg">dock_left</span>
          </button>
        )}

        {/* Navigation */}
        <div className={`flex-1 space-y-xs ${collapsed ? 'flex flex-col items-center' : ''}`}>
          {filteredNavItems.map((item) => {
            const isLast = item.to === '/admin'

            if (collapsed) {
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  title={item.label}
                  className={`flex items-center justify-center w-10 h-10 rounded-full transition-all ${
                    isActive(item.to)
                      ? 'bg-primary-container text-on-primary-container font-bold'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-secondary-container'
                  }`}
                >
                  <span className="material-symbols-outlined">{item.icon}</span>
                </Link>
              )
            }

            if (isLast) {
              return (
                <div key={item.to}>
                  <button
                    onClick={() => setAdminOpen(!adminOpen)}
                    className={`w-full flex items-center gap-md px-4 py-2 rounded-full font-label-md text-label-md transition-all ${
                      location.pathname.startsWith('/admin')
                        ? 'bg-primary-container text-on-primary-container font-bold'
                        : 'text-on-surface-variant hover:text-on-surface hover:bg-secondary-container'
                    }`}
                  >
                    <span className="material-symbols-outlined">{item.icon}</span>
                    <span className="flex-1 text-left">{item.label}</span>
                    <span className={`material-symbols-outlined text-lg transition-transform ${adminOpen ? 'rotate-180' : ''}`}>expand_more</span>
                  </button>
                  {adminOpen && (
                    <div className="ml-5 mt-xs space-y-xs border-l-2 border-outline-variant pl-3">
                      {adminSubItems.map(sub => (
                        <Link
                          key={sub.to}
                          to={sub.to}
                          className={`flex items-center gap-sm px-3 py-1.5 rounded-lg font-body-sm text-body-sm transition-all ${
                            (sub.to === '/admin' ? location.pathname === '/admin' : isActive(sub.to))
                              ? 'bg-secondary-container text-on-surface font-medium'
                              : 'text-on-surface-variant hover:text-on-surface hover:bg-secondary-container'
                          }`}
                        >
                          <span className="material-symbols-outlined text-base">{sub.icon}</span>
                          <span>{sub.label}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )
            }
            return (
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
            )
          })}
        </div>

        {/* Bottom section: profile + logout */}
        <div className={`mt-auto space-y-sm ${collapsed ? 'flex flex-col items-center' : ''}`}>
          <div className={`border-t border-outline-variant pt-sm space-y-sm ${collapsed ? 'flex flex-col items-center border-t w-full' : ''}`}>
            <Link
              to="/profile"
              title={profile?.name || 'Usuario'}
              className={`flex items-center text-on-surface-variant hover:text-on-surface hover:bg-secondary-container rounded-full transition-all ${
                collapsed ? 'justify-center w-10 h-10' : 'gap-md px-4 py-2'
              }`}
            >
              <Avatar url={profile?.avatar_url} name={profile?.name} size="sm" />
              {!collapsed && <span className="truncate">{profile?.name || 'Usuario'}</span>}
            </Link>
            <button
              onClick={signOut}
              title="Cerrar sesión"
              className={`w-full flex items-center text-on-surface-variant hover:text-on-surface hover:bg-secondary-container rounded-full font-label-md text-label-md transition-all ${
                collapsed ? 'justify-center w-10 h-10' : 'gap-md px-4 py-2'
              }`}
            >
              <span className="material-symbols-outlined">logout</span>
              {!collapsed && <span>Cerrar sesión</span>}
            </button>
          </div>
        </div>
      </nav>

      {/* TopAppBar (Mobile) */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-4 md:px-12 h-16 bg-surface border-b border-outline-variant md:hidden">
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
      <main className={`flex-1 ml-0 pt-16 md:pt-xl pb-16 md:pb-xl px-4 md:px-12 max-w-[1200px] mx-auto w-full min-h-screen transition-all duration-200 ease-in-out ${collapsed ? 'md:ml-16' : 'md:ml-64'}`}>
        {children}
      </main>

      {/* Admin submenu (Mobile) */}
      {mobileAdminOpen && (
        <div className="md:hidden fixed bottom-14 left-0 right-0" style={{ zIndex: 10000 }}>
          <div className="mx-2 mb-2 bg-surface-container-high rounded-xl border border-outline-variant shadow-lg overflow-hidden">
            {adminSubItems.map(sub => (
              <Link
                key={sub.to}
                to={sub.to}
                onClick={() => setMobileAdminOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 border-b border-outline-variant last:border-0 transition-colors ${
                  (sub.to === '/admin' ? location.pathname === '/admin' : isActive(sub.to))
                    ? 'bg-primary-container text-on-primary-container'
                    : 'text-on-surface hover:bg-secondary-container'
                }`}
              >
                <span className="material-symbols-outlined text-xl">{sub.icon}</span>
                <span className="font-body-md text-body-md">{sub.label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* BottomNavBar (Mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-surface border-t border-outline-variant flex justify-around items-center px-2" style={{ zIndex: 9999 }}>
        {filteredBottomNav.map((item) => {
          if (item.to === '/admin') {
            return (
              <button
                key={item.to}
                onClick={() => setMobileAdminOpen(!mobileAdminOpen)}
                className={`flex flex-col items-center justify-center px-3 py-1 ${
                  isActive(item.to)
                    ? 'text-primary'
                    : 'text-on-surface-variant'
                }`}
              >
                <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
              </button>
            )
          }
          return (
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
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
