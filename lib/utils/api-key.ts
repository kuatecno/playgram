import crypto from 'crypto'
import { db } from '@/lib/db'
import { UnauthorizedError, TooManyRequestsError } from './errors'

/**
 * Generate a new API key
 */
export function generateApiKey(): string {
  return `pk_${crypto.randomBytes(32).toString('hex')}`
}

/**
 * Hash API key for storage
 */
export function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex')
}

/**
 * Verify API key and return client
 */
export async function verifyApiKey(apiKey: string) {
  if (!apiKey) {
    throw new UnauthorizedError('API key is required')
  }

  const hashedKey = hashApiKey(apiKey)

  const client = await db.flowkickClient.findUnique({
    where: { apiKey: hashedKey },
  })

  if (!client) {
    throw new UnauthorizedError('Invalid API key')
  }

  if (!client.isActive) {
    throw new UnauthorizedError('API key is inactive')
  }

  // Check rate limit (monthly)
  if (client.requestLimit !== -1 && client.requestCount >= client.requestLimit) {
    throw new TooManyRequestsError('Monthly request limit exceeded')
  }

  return client
}

/**
 * Increment API usage counter
 */
export async function incrementApiUsage(clientId: string) {
  await db.flowkickClient.update({
    where: { id: clientId },
    data: {
      requestCount: { increment: 1 },
    },
  })
}

/**
 * Track API usage for analytics
 */
export async function trackApiUsage(
  clientId: string,
  platform: string,
  endpoint: string,
  responseTime: number,
  cacheHit: boolean,
  statusCode: number
) {
  await db.apiUsage.create({
    data: {
      clientId,
      platform,
      endpoint,
      responseTime,
      cacheHit,
      statusCode,
    },
  })
}

/**
 * Reset monthly usage counters (run on 1st of each month)
 */
export async function resetMonthlyUsage() {
  await db.flowkickClient.updateMany({
    data: {
      requestCount: 0,
    },
  })
}
