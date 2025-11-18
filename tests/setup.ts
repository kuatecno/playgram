/**
 * Vitest Setup File
 * Runs before all tests
 */

import { vi } from 'vitest'

// Mock environment variables
// Note: These are only for tests, not used in build
// The build process uses actual .env files

// Mock Next.js modules
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}))

// Mock NextAuth
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(() => ({
    data: null,
    status: 'unauthenticated',
  })),
  signIn: vi.fn(),
  signOut: vi.fn(),
}))

// Suppress console errors during tests (optional)
global.console = {
  ...console,
  error: vi.fn(),
  warn: vi.fn(),
}
