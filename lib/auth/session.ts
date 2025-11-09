import { auth } from './config'
import { cache } from 'react'

/**
 * Get current session (cached)
 * Use in Server Components
 */
export const getCurrentSession = cache(async () => {
  return await auth()
})

/**
 * Get current user from session
 */
export async function getCurrentUser() {
  const session = await getCurrentSession()
  return session?.user
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated() {
  const session = await getCurrentSession()
  return !!session?.user
}

/**
 * Require authentication (throw error if not authenticated)
 */
export async function requireAuth() {
  const session = await getCurrentSession()

  if (!session?.user) {
    throw new Error('Unauthorized - Please log in')
  }

  return session.user
}
