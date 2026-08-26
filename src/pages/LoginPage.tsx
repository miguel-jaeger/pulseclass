import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export function LoginPage() {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, signInWithGithub } = useAuth()
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password, name)
      } else {
        await signInWithEmail(email, password)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al autenticarse'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-margin-mobile">
      <div className="max-w-md w-full space-y-lg p-lg bg-surface-container-lowest rounded-xl border border-outline-variant">
        <div className="text-center">
          <div className="flex items-center justify-center gap-sm mb-md">
            <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-on-primary-container">school</span>
            </div>
            <h1 className="font-headline-lg-mobile text-headline-lg-mobile font-bold text-primary">PulseClass</h1>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant">Evalúa la satisfacción de tus estudiantes al finalizar cada clase</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-md">
          {isSignUp && (
            <div>
              <label htmlFor="name" className="block font-label-md text-label-md text-on-surface mb-xs">Nombre</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-md py-2 border border-outline-variant rounded-xl bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                placeholder="Tu nombre"
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="block font-label-md text-label-md text-on-surface mb-xs">Correo electrónico</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-md py-2 border border-outline-variant rounded-xl bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="correo@ejemplo.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block font-label-md text-label-md text-on-surface mb-xs">Contraseña</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-md py-2 border border-outline-variant rounded-xl bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          {error && (
            <p className="font-body-sm text-body-sm text-on-error-container bg-error-container p-sm rounded-xl">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary text-on-primary font-bold rounded-full font-label-md text-label-md hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-xs"
          >
            <span className="material-symbols-outlined text-lg">{isSignUp ? 'person_add' : 'login'}</span>
            {loading ? 'Cargando...' : isSignUp ? 'Crear cuenta' : 'Iniciar sesión'}
          </button>
        </form>

        <div className="text-center">
          <button
            onClick={() => { setIsSignUp(!isSignUp); setError('') }}
            className="font-body-sm text-body-sm text-primary hover:underline"
          >
            {isSignUp ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
          </button>
        </div>

        <div className="relative my-md">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-outline-variant" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-sm bg-surface-container-lowest text-on-surface-variant font-body-sm text-body-sm">o continúa con</span>
          </div>
        </div>

        <div className="space-y-sm">
          <button
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-md px-md py-3 border border-outline-variant rounded-full bg-surface-container-lowest text-on-surface font-label-md text-label-md hover:bg-surface-container-low transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google
          </button>

          <button
            onClick={signInWithGithub}
            className="w-full flex items-center justify-center gap-md px-md py-3 border border-outline-variant rounded-full bg-surface-container-lowest text-on-surface font-label-md text-label-md hover:bg-surface-container-low transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            GitHub
          </button>
        </div>
      </div>
    </div>
  )
}
