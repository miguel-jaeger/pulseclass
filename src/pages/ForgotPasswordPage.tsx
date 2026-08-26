import { useState } from 'react'
import { Link } from 'react-router-dom'
import { insforge } from '../lib/insforge'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error } = await insforge.auth.sendResetPasswordEmail({
        email,
        redirectTo: `${window.location.origin}/reset-password`
      })
      if (error) throw error
      setSent(true)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al enviar el correo'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface p-margin-mobile">
        <div className="max-w-md w-full space-y-lg p-lg bg-surface-container-lowest rounded-xl border border-outline-variant">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-md rounded-full bg-success-container flex items-center justify-center">
              <span className="material-symbols-outlined text-on-success-container text-3xl">mail</span>
            </div>
            <h1 className="font-headline-lg-mobile text-headline-lg-mobile font-bold text-on-surface mb-sm">Correo enviado</h1>
            <p className="font-body-md text-body-md text-on-surface-variant mb-lg">
              Revisa tu bandeja de entrada y sigue las instrucciones para restablecer tu contraseña.
            </p>
            <Link
              to="/login"
              className="inline-block w-full py-3 bg-primary text-on-primary font-bold rounded-full font-label-md text-label-md hover:opacity-90 transition-opacity text-center"
            >
              Volver al inicio de sesión
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-margin-mobile">
      <div className="max-w-md w-full space-y-lg p-lg bg-surface-container-lowest rounded-xl border border-outline-variant">
        <div className="text-center">
          <div className="flex items-center justify-center gap-sm mb-md">
            <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-on-primary-container">lock_reset</span>
            </div>
            <h1 className="font-headline-lg-mobile text-headline-lg-mobile font-bold text-primary">PulseClass</h1>
          </div>
          <h2 className="font-title-lg text-title-lg text-on-surface mb-sm">Recuperar contraseña</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Ingresa tu correo electrónico y te enviaremos un código para restablecer tu contraseña.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-md">
          <div>
            <label htmlFor="recovery-email" className="block font-label-md text-label-md text-on-surface mb-xs">Correo electrónico</label>
            <input
              id="recovery-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-md py-2 border border-outline-variant rounded-xl bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="correo@ejemplo.com"
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
            <span className="material-symbols-outlined text-lg">send</span>
            {loading ? 'Enviando...' : 'Enviar código'}
          </button>
        </form>

        <div className="text-center">
          <Link to="/login" className="font-body-sm text-body-sm text-primary hover:underline">
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    </div>
  )
}
