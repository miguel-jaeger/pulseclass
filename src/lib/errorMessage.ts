const ERROR_CODE_PATTERN = /^[A-Z0-9_]+$/

export function getErrorMessage(error: unknown, fallback: string): string {
  if (!error) return fallback
  const source = error as { message?: unknown; error?: unknown }
  const message = typeof source.message === 'string' ? source.message.trim() : ''
  if (message) return message
  const detail = typeof source.error === 'string' ? source.error.trim() : ''
  if (detail && !ERROR_CODE_PATTERN.test(detail)) return detail
  return fallback
}
