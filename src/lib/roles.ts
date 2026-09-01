export type Role = 'admin' | 'teacher' | 'student'

const ROLE_VARIANTS: Record<string, Role> = {
  admin: 'admin',
  Administrador: 'admin',
  teacher: 'teacher',
  Profesor: 'teacher',
  student: 'student',
  Estudiante: 'student'
}

export function normalizeRole(role?: string | null): Role {
  return ROLE_VARIANTS[role || 'student'] || 'student'
}

export function roleLabel(role?: string | null): string {
  const r = normalizeRole(role)
  return r === 'admin' ? 'Administrador' : r === 'teacher' ? 'Profesor' : 'Estudiante'
}

export function roleLabelPlural(role?: string | null): string {
  const r = normalizeRole(role)
  return r === 'admin' ? 'Administradores' : r === 'teacher' ? 'Profesores' : 'Estudiantes'
}

export const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'student', label: 'Estudiante' },
  { value: 'teacher', label: 'Profesor' },
  { value: 'admin', label: 'Administrador' }
]

export const ROLE_FILTER_OPTIONS = [
  { value: 'all', label: 'Todos los roles' },
  ...ROLE_OPTIONS.map(o => ({ value: o.value, label: roleLabelPlural(o.value) }))
]