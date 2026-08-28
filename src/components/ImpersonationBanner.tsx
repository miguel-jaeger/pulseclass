import { useImpersonation } from '../hooks/useImpersonation'

const roleLabels = {
  admin: 'Administrador',
  teacher: 'Profesor',
  student: 'Estudiante'
}

export function ImpersonationBanner() {
  const { impersonatedRole, isImpersonating, stopImpersonation } = useImpersonation()

  if (!isImpersonating || !impersonatedRole) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] bg-tertiary-container border-b border-tertiary">
      <div className="flex items-center justify-center gap-sm px-4 py-2">
        <span className="material-symbols-outlined text-on-tertiary-container text-lg">visibility</span>
        <span className="font-body-sm text-body-sm text-on-tertiary-container font-medium">
          Estás viendo el sistema como {roleLabels[impersonatedRole]}
        </span>
        <button
          onClick={stopImpersonation}
          className="ml-2 bg-tertiary text-on-tertiary font-bold py-1 px-3 rounded-full font-label-sm text-label-sm hover:opacity-90 transition-opacity flex items-center gap-xs"
        >
          <span className="material-symbols-outlined text-sm">close</span>
          Volver a Admin
        </button>
      </div>
    </div>
  )
}
