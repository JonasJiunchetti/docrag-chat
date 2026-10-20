import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'
import { setUnauthorizedHandler } from '../src/lib/api.ts'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  setUnauthorizedHandler(null)
  document.cookie = 'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT'
})
