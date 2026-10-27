export type SuggestionStatus = 'recibida' | 'aprobada' | 'implementada' | 'rechazada'
export type SuggestionType = 'mejora' | 'nuevo' | 'problema' | 'contenido'

export interface Suggestion {
  id: string
  user_id: string
  type: string
  description: string
  status: string
  rejection_reason?: string | null
  images: string[]
  created_at: string
  updated_at: string
  deleted_at?: string | null
  deleted_by?: string | null
  profiles?: { name: string; email: string; role: string }
}

export const STATUS_ORDER: SuggestionStatus[] = ['recibida', 'aprobada', 'implementada', 'rechazada']
export const TYPE_ORDER: SuggestionType[] = ['mejora', 'nuevo', 'problema', 'contenido']

export const statusLabels: Record<string, string> = {
  recibida: 'Recibida',
  aprobada: 'Aprobada',
  implementada: 'Implementada',
  rechazada: 'Rechazada',
}

export const typeLabels: Record<string, string> = {
  mejora: 'Mejora',
  nuevo: 'Nuevo',
  problema: 'Problema',
  contenido: 'Contenido',
}

export const statusStyles: Record<string, string> = {
  recibida: 'bg-gray-100 text-gray-800 border border-gray-300',
  aprobada: 'bg-green-100 text-green-800 border border-green-300',
  rechazada: 'bg-error-container text-on-error-container border border-error/30',
  implementada: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
}

export const typeStyles: Record<string, string> = {
  mejora: 'bg-blue-100 text-blue-800 border border-blue-300',
  nuevo: 'bg-purple-100 text-purple-800 border border-purple-300',
  problema: 'bg-orange-100 text-orange-800 border border-orange-300',
  contenido: 'bg-cyan-100 text-cyan-800 border border-cyan-300',
}

export function isSuggestionStatus(value: string): value is SuggestionStatus {
  return STATUS_ORDER.includes(value as SuggestionStatus)
}
