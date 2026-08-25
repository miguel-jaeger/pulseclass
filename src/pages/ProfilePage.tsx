import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { insforge } from '../lib/insforge'
import { useAuth } from '../hooks/useAuth'

const CLOUDINARY_CLOUD = 'dhecags26'
const CLOUDINARY_UPLOAD_PRESET = 'ml_default'

async function uploadToCloudinary(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
  formData.append('folder', 'pulseclass/avatars')
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) throw new Error('Error al subir imagen')
  const data = await res.json()
  return data.secure_url
}

function Avatar({ url, name, size = 'lg' }: { url?: string; name?: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'w-8 h-8 text-sm', md: 'w-12 h-12 text-lg', lg: 'w-24 h-24 text-3xl' }
  const initials = (name || '?').charAt(0).toUpperCase()

  if (url) {
    return <img src={url} alt={name} className={`${sizes[size]} rounded-full object-cover`} />
  }
  return (
    <div className={`${sizes[size]} rounded-full bg-primary-container flex items-center justify-center`}>
      <span className="text-on-primary-container font-bold">{initials}</span>
    </div>
  )
}

export { Avatar }

export function ProfilePage() {
  const { profile, user, signOut, refreshProfile } = useAuth()
  const [editing, setEditing] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [name, setName] = useState(profile?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingAvatar(true)
    setError('')
    try {
      const url = await uploadToCloudinary(file)
      const { error } = await insforge.database
        .from('profiles')
        .update({ avatar_url: url })
        .eq('user_id', profile?.user_id)
      if (error) throw error
      await refreshProfile()
      setSuccess('Foto de perfil actualizada.')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al subir imagen'
      setError(message)
    } finally {
      setUploadingAvatar(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

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
      await refreshProfile()
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
        body: { newPassword }
      })
      if (error) throw error
      setSuccess('Contraseña cambiada correctamente.')
      setChangingPassword(false)
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al cambiar contraseña'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const roleLabel = profile?.role === 'admin' ? 'Administrador' : profile?.role === 'teacher' ? 'Profesor' : 'Estudiante'
  const roleIcon = profile?.role === 'admin' ? 'admin_panel_settings' : profile?.role === 'teacher' ? 'school' : 'person'

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

      {/* Avatar Section */}
      <div className="bg-surface border border-outline-variant rounded-xl p-lg mb-xl">
        <h2 className="font-headline-sm text-headline-sm text-on-surface mb-lg">Foto de perfil</h2>
        <div className="flex items-center gap-lg">
          <div className="relative group">
            <Avatar url={profile?.avatar_url} name={profile?.name} size="lg" />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute inset-0 rounded-full bg-scrim/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-on-primary text-2xl">
                {uploadingAvatar ? 'hourglass_empty' : 'photo_camera'}
              </span>
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarUpload}
            className="hidden"
          />
          <div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              {uploadingAvatar ? 'Subiendo...' : 'Haz clic en la imagen para cambiarla'}
            </p>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">JPG, PNG. Máx 5MB.</p>
          </div>
        </div>
      </div>

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
                disabled={loading || !newPassword || !confirmPassword}
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
