import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router'
import { ApiError } from '../../lib/api.ts'
import { useAuth } from './useAuth.ts'

interface LocationState {
  from?: { pathname: string; search?: string }
}

export function LoginPage() {
  const { state, login } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const from = (location.state as LocationState | null)?.from
  const destination = from ? `${from.pathname}${from.search ?? ''}` : '/'

  if (state.status === 'authed') return <Navigate to={destination} replace />

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await login(email, password)
    } catch (e) {
      if (e instanceof ApiError && e.status === 429) {
        setError('Too many attempts. Wait a minute and try again.')
      } else if (e instanceof ApiError && e.status === 422) {
        setError(e.errors.email?.[0] ?? e.message)
      } else {
        setError('Could not log in. Try again.')
      }
      setSubmitting(false)
    }
  }

  return (
    <main className="narrow">
      <h1>Log in</h1>
      {state.status === 'guest' && state.expired && (
        <p role="status">Your session expired. Please log in again.</p>
      )}
      <form onSubmit={onSubmit}>
        <label>
          Email
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={submitting}>
          Log in
        </button>
      </form>
    </main>
  )
}
