import { useEffect, useRef } from 'react'

interface TurnstileProps {
  siteKey: string
  onVerify: (token: string) => void
  resetKey?: number
  theme?: 'auto' | 'light' | 'dark'
  className?: string
}

interface TurnstileApi {
  render: (container: HTMLElement, options: Record<string, unknown>) => string
  remove: (widgetId: string) => void
  reset: (widgetId?: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

const SCRIPT_ID = 'cf-turnstile-script'
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

let loadPromise: Promise<void> | null = null

function loadTurnstile(): Promise<void> {
  if (window.turnstile) return Promise.resolve()
  if (loadPromise) return loadPromise

  loadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null
    const script = existing ?? document.createElement('script')

    script.addEventListener('load', () => resolve())
    script.addEventListener('error', () => {
      loadPromise = null
      reject(new Error('No se pudo cargar Turnstile'))
    })

    if (!existing) {
      script.id = SCRIPT_ID
      script.src = SCRIPT_SRC
      script.async = true
      script.defer = true
      document.head.appendChild(script)
    }
  })

  return loadPromise
}

function currentTheme(): 'light' | 'dark' {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

export function Turnstile({ siteKey, onVerify, resetKey = 0, theme, className }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetRef = useRef<string | null>(null)
  const onVerifyRef = useRef(onVerify)

  useEffect(() => {
    onVerifyRef.current = onVerify
  }, [onVerify])

  useEffect(() => {
    let cancelled = false

    loadTurnstile()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return

        if (widgetRef.current) {
          try {
            window.turnstile.remove(widgetRef.current)
          } catch {}
        }

        widgetRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          size: 'flexible',
          theme: theme ?? currentTheme(),
          language: 'es',
          'refresh-expired': 'auto',
          callback: (token: string) => onVerifyRef.current(token),
          'expired-callback': () => onVerifyRef.current(''),
          'error-callback': () => onVerifyRef.current('')
        })
      })
      .catch(() => onVerifyRef.current(''))

    return () => {
      cancelled = true
      if (widgetRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetRef.current)
        } catch {}
      }
      widgetRef.current = null
    }
  }, [siteKey, theme, resetKey])

  return <div ref={containerRef} className={className ?? 'flex justify-center w-full min-h-[65px]'} />
}
