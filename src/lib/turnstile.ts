export const TURNSTILE_SITE_KEY = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined)?.trim() || ''

export const isTurnstileEnabled = TURNSTILE_SITE_KEY.length > 0
