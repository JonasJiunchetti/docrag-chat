import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { expect, it } from 'vitest'
import { ada, mockApi } from '../tests/mockApi.ts'
import App from './App.tsx'
import { AuthProvider } from './features/auth/AuthProvider.tsx'

it('renders the app heading for a logged-in user', async () => {
  mockApi({ 'GET /api/me': () => ({ json: { data: ada } }) })
  render(
    <MemoryRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  )

  expect(
    await screen.findByRole('heading', { name: 'docrag-chat' }),
  ).toBeInTheDocument()
})
