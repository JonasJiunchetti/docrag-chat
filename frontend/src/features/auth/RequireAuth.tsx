import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from './useAuth.ts'

export function RequireAuth() {
  const { state, retry } = useAuth()
  const location = useLocation()

  switch (state.status) {
    case 'loading':
      return <p role="status">Loading…</p>
    case 'error':
      return (
        <main>
          <p role="alert">Could not reach the server.</p>
          <button type="button" onClick={retry}>
            Try again
          </button>
        </main>
      )
    case 'guest':
      return <Navigate to="/login" replace state={{ from: location }} />
    case 'authed':
      return <Outlet />
  }
}
