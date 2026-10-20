import { expect, it, vi } from 'vitest'
import { mockApi } from '../../tests/mockApi.ts'
import { ApiError, apiFetch, setUnauthorizedHandler } from './api.ts'

it('fetches the csrf cookie before a write and sends it as a header', async () => {
  const fetchMock = mockApi({ 'POST /api/things': () => ({ status: 204 }) })

  await apiFetch('/things', { method: 'POST', body: { a: 1 } })

  expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
    '/api/sanctum/csrf-cookie',
    '/api/things',
  ])
  const [, init] = fetchMock.mock.calls[1]
  expect((init?.headers as Record<string, string>)['X-XSRF-TOKEN']).toBe(
    'test-token',
  )
})

it('does not fetch the csrf cookie for reads', async () => {
  const fetchMock = mockApi({
    'GET /api/things': () => ({ json: { ok: true } }),
  })

  await expect(apiFetch('/things')).resolves.toEqual({ ok: true })
  expect(fetchMock).toHaveBeenCalledTimes(1)
})

it('retries once with a fresh csrf cookie after a 419', async () => {
  let calls = 0
  mockApi({
    'POST /api/things': () =>
      ++calls === 1 ? { status: 419 } : { status: 204 },
  })

  await expect(apiFetch('/things', { method: 'POST' })).resolves.toBeUndefined()
  expect(calls).toBe(2)
})

it('turns validation failures into an ApiError with field errors', async () => {
  mockApi({
    'GET /api/things': () => ({
      status: 422,
      json: { message: 'Invalid', errors: { name: ['Required'] } },
    }),
  })

  const error = await apiFetch('/things').catch((e: unknown) => e)
  expect(error).toBeInstanceOf(ApiError)
  expect(error).toMatchObject({ status: 422, errors: { name: ['Required'] } })
})

it('reports a 401 to the unauthorized handler unless quiet', async () => {
  const handler = vi.fn()
  setUnauthorizedHandler(handler)
  mockApi({ 'GET /api/me': () => ({ status: 401 }) })

  await apiFetch('/me', { quiet401: true }).catch(() => undefined)
  expect(handler).not.toHaveBeenCalled()

  await apiFetch('/me').catch(() => undefined)
  expect(handler).toHaveBeenCalledOnce()
})
