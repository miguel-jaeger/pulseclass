import { useState } from 'react'

interface PasswordInputProps {
  id?: string
  name?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  required?: boolean
  minLength?: number
  autoFocus?: boolean
}

export function PasswordInput({
  id,
  name,
  value,
  onChange,
  placeholder,
  className,
  required,
  minLength,
  autoFocus
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        autoFocus={autoFocus}
        className={`${className || ''} pr-12`}
      />
      <button
        type="button"
        onClick={() => setVisible(current => !current)}
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        aria-pressed={visible}
        className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-secondary-container transition-colors"
      >
        <span className="material-symbols-outlined text-lg">
          {visible ? 'visibility_off' : 'visibility'}
        </span>
      </button>
    </div>
  )
}
