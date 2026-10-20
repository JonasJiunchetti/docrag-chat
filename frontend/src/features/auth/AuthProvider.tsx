import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  ApiError,
  apiFetch,
  fetchCsrfCookie,
  setUnauthorizedHandler,
} from '../../lib/api.ts'
import {
  AuthContext,
  type AuthContextValue,
  type AuthState,
  type User,
} from './authContext.ts'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false

    apiFetch<{ data: User }>('/me', { quiet401: true })
      .then(
        ({ data }) => !cancelled && setState({ status: 'authed', user: data }),
      )
      .catch((error: unknown) => {
        if (cancelled) return
        const unauthenticated =
          error instanceof ApiError && error.status === 401
        setState(
          unauthenticated
            ? { status: 'guest', expired: false }
            : { status: 'error' },
        )
      })

    return () => {
      cancelled = true
    }
  }, [attempt])

  useEffect(() => {
    setUnauthorizedHandler(() =>
      setState((current) =>
        current.status === 'authed'
          ? { status: 'guest', expired: true }
          : current,
      ),
    )
    return () => setUnauthorizedHandler(null)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    await fetchCsrfCookie()
    const { data } = await apiFetch<{ data: User }>('/login', {
      method: 'POST',
      body: { email, password },
    })
    setState({ status: 'authed', user: data })
  }, [])

  const logout = useCallback(async () => {
    try {
      await apiFetch('/logout', { method: 'POST' })
    } finally {
      setState({ status: 'guest', expired: false })
    }
  }, [])

  const retry = useCallback(() => {
    setState({ status: 'loading' })
    setAttempt((n) => n + 1)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ state, login, logout, retry }),
    [state, login, logout, retry],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
