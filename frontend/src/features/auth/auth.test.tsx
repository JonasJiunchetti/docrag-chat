import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { expect, it } from 'vitest'
import { ada, mockApi } from '../../../tests/mockApi.ts'
import App from '../../App.tsx'
import { AuthProvider } from './AuthProvider.tsx'

function renderApp(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  )
}

const loggedIn = { 'GET /api/me': () => ({ json: { data: ada } }) }
const guest = {
  'GET /api/me': () => ({ status: 401, json: { message: 'Unauthenticated.' } }),
}

it('shows no protected content while the session check is pending', () => {
  mockApi({ 'GET /api/me': () => new Promise(() => {}) })
  renderApp()

  expect(screen.getByRole('status')).toHaveTextContent('Loading')
  expect(
    screen.queryByRole('heading', { name: 'docrag-chat' }),
  ).not.toBeInTheDocument()
  expect(
    screen.queryByRole('heading', { name: 'Log in' }),
  ).not.toBeInTheDocument()
})

it('shows the app to a logged-in user with their name', async () => {
  mockApi(loggedIn)
  renderApp()

  expect(
    await screen.findByRole('heading', { name: 'docrag-chat' }),
  ).toBeInTheDocument()
  expect(screen.getByText('Ada Admin')).toBeInTheDocument()
})

it('sends a guest to the login page and back to the page they asked for', async () => {
  const user = userEvent.setup()
  mockApi({
    ...guest,
    'POST /api/login': (body) => {
      expect(body).toEqual({
        email: 'ada@example.com',
        password: 'secret-password',
      })
      return { json: { data: ada } }
    },
  })
  renderApp('/password')

  expect(
    await screen.findByRole('heading', { name: 'Log in' }),
  ).toBeInTheDocument()
  await user.type(screen.getByLabelText('Email'), 'ada@example.com')
  await user.type(screen.getByLabelText('Password'), 'secret-password')
  await user.click(screen.getByRole('button', { name: 'Log in' }))

  expect(
    await screen.findByRole('heading', { name: 'Change password' }),
  ).toBeInTheDocument()
})

it('shows the server message when credentials are wrong', async () => {
  const user = userEvent.setup()
  mockApi({
    ...guest,
    'POST /api/login': () => ({
      status: 422,
      json: {
        message: 'x',
        errors: { email: ['These credentials do not match our records.'] },
      },
    }),
  })
  renderApp()

  await user.type(await screen.findByLabelText('Email'), 'ada@example.com')
  await user.type(screen.getByLabelText('Password'), 'wrong')
  await user.click(screen.getByRole('button', { name: 'Log in' }))

  expect(await screen.findByRole('alert')).toHaveTextContent('do not match')
})

it('tells the user when they are throttled', async () => {
  const user = userEvent.setup()
  mockApi({
    ...guest,
    'POST /api/login': () => ({ status: 429, json: { message: 'Too many' } }),
  })
  renderApp()

  await user.type(await screen.findByLabelText('Email'), 'ada@example.com')
  await user.type(screen.getByLabelText('Password'), 'wrong')
  await user.click(screen.getByRole('button', { name: 'Log in' }))

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Too many attempts',
  )
})

it('logs out and returns to the login page', async () => {
  const user = userEvent.setup()
  mockApi({ ...loggedIn, 'POST /api/logout': () => ({ status: 204 }) })
  renderApp()

  await user.click(await screen.findByRole('button', { name: 'Log out' }))

  expect(
    await screen.findByRole('heading', { name: 'Log in' }),
  ).toBeInTheDocument()
  expect(screen.queryByText(/session expired/i)).not.toBeInTheDocument()
})

it('shows a session-expired message when a request comes back 401', async () => {
  const user = userEvent.setup()
  mockApi({
    ...loggedIn,
    'PUT /api/me/password': () => ({
      status: 401,
      json: { message: 'Unauthenticated.' },
    }),
  })
  renderApp('/password')

  await user.type(
    await screen.findByLabelText('Current password'),
    'old-password-1',
  )
  await user.type(screen.getByLabelText('New password'), 'new-password-123')
  await user.type(
    screen.getByLabelText('Confirm new password'),
    'new-password-123',
  )
  await user.click(screen.getByRole('button', { name: 'Change password' }))

  expect(
    await screen.findByRole('heading', { name: 'Log in' }),
  ).toBeInTheDocument()
  expect(screen.getByRole('status')).toHaveTextContent('session expired')
})

it('offers a retry when the server cannot be reached', async () => {
  const user = userEvent.setup()
  let calls = 0
  mockApi({
    'GET /api/me': () =>
      ++calls === 1 ? { status: 500 } : { json: { data: ada } },
  })
  renderApp()

  await user.click(await screen.findByRole('button', { name: 'Try again' }))

  expect(
    await screen.findByRole('heading', { name: 'docrag-chat' }),
  ).toBeInTheDocument()
})

it('shows field errors on the change-password form and confirms success', async () => {
  const user = userEvent.setup()
  let attempt = 0
  mockApi({
    ...loggedIn,
    'PUT /api/me/password': () =>
      ++attempt === 1
        ? {
            status: 422,
            json: {
              message: 'x',
              errors: { current_password: ['Wrong password.'] },
            },
          }
        : { status: 204 },
  })
  renderApp('/password')

  await user.type(await screen.findByLabelText('Current password'), 'nope')
  await user.type(screen.getByLabelText('New password'), 'new-password-123')
  await user.type(
    screen.getByLabelText('Confirm new password'),
    'new-password-123',
  )
  await user.click(screen.getByRole('button', { name: 'Change password' }))

  const field = await screen.findByLabelText(/Current password/)
  expect(field).toHaveAccessibleDescription('Wrong password.')
  expect(field).toBeInvalid()

  await user.type(field, 'right-password')
  await user.type(screen.getByLabelText('New password'), 'new-password-123')
  await user.type(
    screen.getByLabelText('Confirm new password'),
    'new-password-123',
  )
  await user.click(screen.getByRole('button', { name: 'Change password' }))

  await waitFor(() =>
    expect(screen.getByRole('status')).toHaveTextContent('Password changed'),
  )
})
