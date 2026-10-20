import { useState, type FormEvent } from 'react'
import { ApiError, apiFetch } from '../../lib/api.ts'

const FIELDS = [
  {
    name: 'current_password',
    label: 'Current password',
    autoComplete: 'current-password',
  },
  { name: 'password', label: 'New password', autoComplete: 'new-password' },
  {
    name: 'password_confirmation',
    label: 'Confirm new password',
    autoComplete: 'new-password',
  },
] as const

type FieldName = (typeof FIELDS)[number]['name']

const EMPTY: Record<FieldName, string> = {
  current_password: '',
  password: '',
  password_confirmation: '',
}

export function ChangePasswordPage() {
  const [values, setValues] = useState(EMPTY)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [done, setDone] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setErrors({})
    setFailure(null)
    setDone(false)
    try {
      await apiFetch('/me/password', { method: 'PUT', body: values })
      setValues(EMPTY)
      setDone(true)
    } catch (e) {
      if (e instanceof ApiError && e.status === 422) setErrors(e.errors)
      else if (!(e instanceof ApiError && e.status === 401))
        setFailure('Could not change the password. Try again.')
    }
  }

  return (
    <section className="narrow">
      <h1>Change password</h1>
      <form onSubmit={onSubmit}>
        {FIELDS.map(({ name, label, autoComplete }) => (
          <label key={name}>
            {label}
            <input
              type="password"
              autoComplete={autoComplete}
              value={values[name]}
              onChange={(e) => setValues({ ...values, [name]: e.target.value })}
              aria-invalid={errors[name] ? true : undefined}
              aria-describedby={errors[name] ? `${name}-error` : undefined}
              required
            />
            {errors[name] && (
              <span id={`${name}-error`} className="field-error">
                {errors[name][0]}
              </span>
            )}
          </label>
        ))}
        {failure && <p role="alert">{failure}</p>}
        {done && <p role="status">Password changed.</p>}
        <button type="submit">Change password</button>
      </form>
    </section>
  )
}
