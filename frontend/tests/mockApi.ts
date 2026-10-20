import { vi } from 'vitest'

interface MockResponse {
  status?: number
  json?: unknown
}

type Handler = (body: unknown) => MockResponse | Promise<MockResponse>

// Routes are keyed like 'POST /api/login'. An unlisted request fails the test.
export function mockApi(routes: Record<string, Handler>) {
  const all: Record<string, Handler> = {
    'GET /api/sanctum/csrf-cookie': () => {
      document.cookie = 'XSRF-TOKEN=test-token'
      return { status: 204 }
    },
    ...routes,
  }

  const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
    const key = `${init?.method ?? 'GET'} ${input}`
    const handler = all[key]
    if (!handler) throw new Error(`Unhandled request: ${key}`)

    const body =
      typeof init?.body === 'string' ? JSON.parse(init.body) : undefined
    const { status = 200, json } = await handler(body)
    return new Response(status === 204 ? null : JSON.stringify(json ?? {}), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  })

  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

export const ada = {
  id: 1,
  name: 'Ada Admin',
  email: 'ada@example.com',
  role: 'admin',
}
