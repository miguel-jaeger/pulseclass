import { createContext, useContext, useState, useCallback } from 'react'
import type { ReactNode } from 'react'

type Role = 'admin' | 'teacher' | 'student'

interface ImpersonationContextType {
  impersonatedRole: Role | null
  startImpersonation: (role: Role) => void
  stopImpersonation: () => void
  isImpersonating: boolean
}

const ImpersonationContext = createContext<ImpersonationContextType | null>(null)

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const [impersonatedRole, setImpersonatedRole] = useState<Role | null>(null)

  const startImpersonation = useCallback((role: Role) => {
    setImpersonatedRole(role)
  }, [])

  const stopImpersonation = useCallback(() => {
    setImpersonatedRole(null)
  }, [])

  return (
    <ImpersonationContext.Provider value={{
      impersonatedRole,
      startImpersonation,
      stopImpersonation,
      isImpersonating: impersonatedRole !== null
    }}>
      {children}
    </ImpersonationContext.Provider>
  )
}

export function useImpersonation() {
  const context = useContext(ImpersonationContext)
  if (!context) throw new Error('useImpersonation must be used within ImpersonationProvider')
  return context
}

export function useEffectiveRole(realRole: Role | undefined): Role {
  const { impersonatedRole, isImpersonating } = useImpersonation()
  if (isImpersonating && impersonatedRole) return impersonatedRole
  return realRole || 'student'
}
