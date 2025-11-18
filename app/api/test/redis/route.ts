/**
 * Redis Connection Test Endpoint
 * Test at: /api/test/redis
 */

import { NextResponse } from 'next/server'
import Redis from 'ioredis'

export async function GET() {
  const redisUrl = process.env.REDIS_URL

  // Check if REDIS_URL is configured
  if (!redisUrl) {
    return NextResponse.json(
      {
        success: false,
        error: 'REDIS_URL environment variable not set',
        tip: 'Add REDIS_URL to your Vercel environment variables',
      },
      { status: 500 }
    )
  }

  // Show configuration (hide password)
  const sanitizedUrl = redisUrl.replace(/:([^@]+)@/, ':****@')

  try {
    // Create Redis client with TLS support for Upstash
    const redis = new Redis(redisUrl, {
      tls: redisUrl.startsWith('rediss://')
        ? {
            rejectUnauthorized: false,
          }
        : undefined,
      // Set timeout for faster response
      connectTimeout: 5000,
      maxRetriesPerRequest: 2,
    })

    // Test basic operations
    const testKey = `test:${Date.now()}`
    const testValue = 'Hello from Vercel!'

    // Set a value
    await redis.set(testKey, testValue, 'EX', 60) // Expires in 60 seconds

    // Get the value back
    const retrievedValue = await redis.get(testKey)

    // Get Redis info
    const info = await redis.info('server')
    const redisVersion = info.match(/redis_version:([^\r\n]+)/)?.[1] || 'unknown'

    // Clean up
    await redis.del(testKey)

    // Close connection
    await redis.quit()

    return NextResponse.json({
      success: true,
      message: 'Redis connection successful!',
      details: {
        url: sanitizedUrl,
        protocol: redisUrl.startsWith('rediss://') ? 'TLS (Secure)' : 'Plain',
        redisVersion,
        testPassed: retrievedValue === testValue,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        url: sanitizedUrl,
        tips: [
          'Check that REDIS_URL is correct',
          'Ensure it starts with "rediss://" for Upstash (double s)',
          'Verify the password is correct',
          'Check Upstash dashboard for connection limits',
        ],
      },
      { status: 500 }
    )
  }
}
