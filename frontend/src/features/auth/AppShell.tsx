import { Link, Outlet } from 'react-router'
import { useAuth } from './useAuth.ts'

export function AppShell() {
  const { state, logout } = useAuth()
  if (state.status !== 'authed') return null

  return (
    <>
      <header className="app-header">
        <Link to="/">docrag-chat</Link>
        <nav>
          <span>{state.user.name}</span>
          <Link to="/password">Change password</Link>
          <button type="button" onClick={() => void logout()}>
            Log out
          </button>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </>
  )
}
