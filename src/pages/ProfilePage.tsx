import { useState } from 'react'
import { Link } from 'react-router-dom'
import { insforge } from '../lib/insforge'
import { useAuth } from '../hooks/useAuth'

export function ProfilePage() {
  const { profile, user, signOut } = useAuth()
  const [editing, setEditing] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [name, setName] = useState(profile?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSaveProfile = async () => {
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      const { error } = await insforge.database
        .from('profiles')
        .update({ name, email })
        .eq('user_id', profile?.user_id)

      if (error) throw error
      setSuccess('Perfil actualizado correctamente.')
      setEditing(false)
      window.location.reload()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar cambios'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = async () => {
    setError('')
    setSuccess('')
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }
    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    setLoading(true)
    try {
      const { error } = await insforge.functions.invoke('change-password', {
        method: 'POST',
        body: { currentPassword, newPassword }
      })
      if (error) throw error
      setSuccess('Contraseña cambiada correctamente.')
      setChangingPassword(false)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al cambiar contraseña'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const roleLabel = profile?.role === 'Administrador' ? 'Administrador' : profile?.role === 'Profesor' ? 'Profesor' : 'Estudiante'
  const roleIcon = profile?.role === 'Administrador' ? 'admin_panel_settings' : profile?.role === 'Profesor' ? 'school' : 'person'

  return (
    <div>
      <div className="mb-lg">
        <Link to="/" className="flex items-center gap-xs text-primary font-body-sm text-body-sm hover:underline">
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          Volver al resumen
        </Link>
      </div>

      <header className="mb-xl">
        <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface">Mi Perfil</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-xs">Gestiona tu información personal.</p>
      </header>

      {error && (
        <div className="bg-error-container border border-error rounded-xl p-md mb-lg">
          <p className="font-body-sm text-body-sm text-on-error-container">{error}</p>
        </div>
      )}
      {success && (
        <div className="bg-secondary-container border border-secondary rounded-xl p-md mb-lg">
          <p className="font-body-sm text-body-sm text-on-secondary-container">{success}</p>
        </div>
      )}

      <div className="bg-surface border border-outline-variant rounded-xl p-lg mb-xl">
        <div className="flex justify-between items-center mb-lg">
          <h2 className="font-headline-sm text-headline-sm text-on-surface">Datos personales</h2>
          {!editing && (
            <button
              onClick={() => { setEditing(true); setName(profile?.name || ''); setEmail(user?.email || ''); setError(''); setSuccess('') }}
              className="text-primary font-label-md text-label-md hover:underline flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">edit</span>
              Editar
            </button>
          )}
        </div>

        {editing ? (
          <div className="space-y-md">
            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-xs">Nombre</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-outline-variant rounded-xl px-md py-2 bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-xs">Correo electrónico</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-outline-variant rounded-xl px-md py-2 bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
            <div className="flex justify-end gap-sm">
              <button
                onClick={() => setEditing(false)}
                className="px-lg py-2 text-on-surface-variant font-label-md text-label-md hover:bg-secondary-container rounded-full transition-colors flex items-center gap-xs"
              >
                <span className="material-symbols-outlined text-lg">close</span>
                Cancelar
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={loading || !name || !email}
                className="bg-primary text-on-primary font-bold px-lg py-2 rounded-full font-label-md text-label-md hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-xs"
              >
                <span className="material-symbols-outlined text-lg">save</span>
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-md">
            <div className="flex items-center gap-md">
              <span className="material-symbols-outlined text-on-surface-variant">account_circle</span>
              <div>
                <p className="font-body-sm text-body-sm text-on-surface-variant">Nombre</p>
                <p className="font-body-md text-body-md text-on-surface font-medium">{profile?.name || 'Sin nombre'}</p>
              </div>
            </div>
            <div className="flex items-center gap-md">
              <span className="material-symbols-outlined text-on-surface-variant">email</span>
              <div>
                <p className="font-body-sm text-body-sm text-on-surface-variant">Correo electrónico</p>
                <p className="font-body-md text-body-md text-on-surface font-medium">{user?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-md">
              <span className="material-symbols-outlined text-on-surface-variant">{roleIcon}</span>
              <div>
                <p className="font-body-sm text-body-sm text-on-surface-variant">Rol</p>
                <p className="font-body-md text-body-md text-on-surface font-medium">{roleLabel}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-surface border border-outline-variant rounded-xl p-lg">
        <div className="flex justify-between items-center mb-lg">
          <h2 className="font-headline-sm text-headline-sm text-on-surface">Contraseña</h2>
          {!changingPassword && (
            <button
              onClick={() => { setChangingPassword(true); setError(''); setSuccess('') }}
              className="text-primary font-label-md text-label-md hover:underline flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">lock</span>
              Cambiar contraseña
            </button>
          )}
        </div>

        {changingPassword ? (
          <div className="space-y-md">
            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-xs">Contraseña actual</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full border border-outline-variant rounded-xl px-md py-2 bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-xs">Nueva contraseña</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full border border-outline-variant rounded-xl px-md py-2 bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary"
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-xs">Confirmar nueva contraseña</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border border-outline-variant rounded-xl px-md py-2 bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
            <div className="flex justify-end gap-sm">
              <button
                onClick={() => setChangingPassword(false)}
                className="px-lg py-2 text-on-surface-variant font-label-md text-label-md hover:bg-secondary-container rounded-full transition-colors flex items-center gap-xs"
              >
                <span className="material-symbols-outlined text-lg">close</span>
                Cancelar
              </button>
              <button
                onClick={handleChangePassword}
                disabled={loading || !currentPassword || !newPassword || !confirmPassword}
                className="bg-primary text-on-primary font-bold px-lg py-2 rounded-full font-label-md text-label-md hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-xs"
              >
                <span className="material-symbols-outlined text-lg">lock_reset</span>
                {loading ? 'Cambiando...' : 'Cambiar contraseña'}
              </button>
            </div>
          </div>
        ) : (
          <p className="font-body-sm text-body-sm text-on-surface-variant">Para cambiar tu contraseña, haz clic en el enlace de arriba.</p>
        )}
      </div>

      <div className="md:hidden mt-xl">
        <button
          onClick={signOut}
          className="w-full flex items-center justify-center gap-sm bg-error-container text-on-error-container font-bold py-3 px-lg rounded-full font-label-md text-label-md hover:opacity-90 transition-opacity"
        >
          <span className="material-symbols-outlined text-sm">logout</span>
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
