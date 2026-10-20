export class ApiError extends Error {
  status: number
  errors: Record<string, string[]>

  constructor(
    status: number,
    message: string,
    errors: Record<string, string[]> = {},
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  // For calls where a 401 is an expected answer (the initial "who am I" check).
  quiet401?: boolean
}

let onUnauthorized: (() => void) | null = null

// Called when a request that needed a session comes back 401 (e.g. it expired).
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler
}

function readXsrfToken(): string | undefined {
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : undefined
}

export async function fetchCsrfCookie(): Promise<void> {
  await fetch('/api/sanctum/csrf-cookie', {
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
  })
}

export async function apiFetch<T = undefined>(
  path: string,
  { method = 'GET', body, quiet401 = false }: RequestOptions = {},
): Promise<T> {
  const send = () => {
    const headers: Record<string, string> = { Accept: 'application/json' }
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    const token = readXsrfToken()
    if (method !== 'GET' && token) headers['X-XSRF-TOKEN'] = token

    return fetch(`/api${path}`, {
      method,
      headers,
      credentials: 'same-origin',
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  }

  if (method !== 'GET' && !readXsrfToken()) await fetchCsrfCookie()

  let response = await send()
  if (response.status === 419) {
    // Stale CSRF token (e.g. the session changed): get a fresh one and retry once.
    await fetchCsrfCookie()
    response = await send()
  }

  if (response.status === 401 && !quiet401) onUnauthorized?.()

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as {
      message?: string
      errors?: Record<string, string[]>
    }
    throw new ApiError(
      response.status,
      data.message ?? 'Request failed',
      data.errors,
    )
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}
