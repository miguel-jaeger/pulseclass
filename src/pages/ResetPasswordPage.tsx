import { useState } from 'react'
import { Link } from 'react-router-dom'
import { insforge } from '../lib/insforge'

export function ResetPasswordPage() {
  const [step, setStep] = useState<'code' | 'password'>('code')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [token, setToken] = useState('')

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data, error } = await insforge.auth.exchangeResetPasswordToken({
        email,
        code
      })
      if (error) throw error
      setToken(data.token)
      setStep('password')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Código inválido o expirado'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }
    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    setLoading(true)
    try {
      const { error } = await insforge.auth.resetPassword({
        newPassword,
        otp: token
      })
      if (error) throw error
      setSuccess(true)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al restablecer la contraseña'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface p-margin-mobile">
        <div className="max-w-md w-full space-y-lg p-lg bg-surface-container-lowest rounded-xl border border-outline-variant">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-md rounded-full bg-success-container flex items-center justify-center">
              <span className="material-symbols-outlined text-on-success-container text-3xl">check_circle</span>
            </div>
            <h1 className="font-headline-lg-mobile text-headline-lg-mobile font-bold text-on-surface mb-sm">Contraseña actualizada</h1>
            <p className="font-body-md text-body-md text-on-surface-variant mb-lg">
              Tu contraseña ha sido restablecida correctamente. Ya puedes iniciar sesión con tu nueva contraseña.
            </p>
            <Link
              to="/login"
              className="inline-block w-full py-3 bg-primary text-on-primary font-bold rounded-full font-label-md text-label-md hover:opacity-90 transition-opacity text-center"
            >
              Iniciar sesión
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
          <h2 className="font-title-lg text-title-lg text-on-surface mb-sm">
            {step === 'code' ? 'Verificar código' : 'Nueva contraseña'}
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            {step === 'code'
              ? 'Ingresa el código de 6 dígitos que recibiste en tu correo.'
              : 'Ingresa tu nueva contraseña.'}
          </p>
        </div>

        {step === 'code' ? (
          <form onSubmit={handleVerifyCode} className="space-y-md">
            <div>
              <label htmlFor="reset-email" className="block font-label-md text-label-md text-on-surface mb-xs">Correo electrónico</label>
              <input
                id="reset-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-md py-2 border border-outline-variant rounded-xl bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                placeholder="correo@ejemplo.com"
              />
            </div>

            <div>
              <label htmlFor="reset-code" className="block font-label-md text-label-md text-on-surface mb-xs">Código de verificación</label>
              <input
                id="reset-code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                maxLength={6}
                className="w-full px-md py-2 border border-outline-variant rounded-xl bg-surface font-body-sm text-body-sm text-on-surface text-center tracking-[0.5em] font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                placeholder="000000"
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
              <span className="material-symbols-outlined text-lg">verified</span>
              {loading ? 'Verificando...' : 'Verificar código'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-md">
            <div>
              <label htmlFor="new-password" className="block font-label-md text-label-md text-on-surface mb-xs">Nueva contraseña</label>
              <input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-md py-2 border border-outline-variant rounded-xl bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            <div>
              <label htmlFor="confirm-password" className="block font-label-md text-label-md text-on-surface mb-xs">Confirmar contraseña</label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-md py-2 border border-outline-variant rounded-xl bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                placeholder="Repite tu contraseña"
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
              <span className="material-symbols-outlined text-lg">lock_reset</span>
              {loading ? 'Guardando...' : 'Restablecer contraseña'}
            </button>
          </form>
        )}

        <div className="text-center">
          <Link to="/login" className="font-body-sm text-body-sm text-primary hover:underline">
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    </div>
  )
}
