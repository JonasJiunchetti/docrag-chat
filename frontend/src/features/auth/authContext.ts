import { createContext } from 'react'

export interface User {
  id: number
  name: string
  email: string
  role: 'admin' | 'employee'
}

export type AuthState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'guest'; expired: boolean }
  | { status: 'authed'; user: User }

export interface AuthContextValue {
  state: AuthState
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  retry: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
