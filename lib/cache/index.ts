import Redis from 'ioredis'
import { TTL } from '@/config/constants'

// Memory cache (in-process, fastest)
const memoryCache = new Map<string, { value: unknown; expires: number }>()

// Redis client (distributed cache)
let redis: Redis | null = null

// Initialize Redis only if URL is provided
if (process.env.REDIS_URL) {
  try {
    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) return null
        return Math.min(times * 50, 2000)
      },
    })

    redis.on('error', (err) => {
      console.error('Redis error:', err)
    })

    redis.on('connect', () => {
      console.log('Redis connected')
    })
  } catch (error) {
    console.error('Failed to initialize Redis:', error)
    redis = null
  }
}

/**
 * Multi-layer cache service
 * Layers: Memory → Redis → Database → Source
 */
export const cache = {
  /**
   * Get value from cache (checks all layers)
   */
  async get<T = unknown>(key: string): Promise<T | null> {
    // Layer 1: Memory cache (fastest, ~1ms)
    const memoryValue = memoryCache.get(key)
    if (memoryValue && memoryValue.expires > Date.now()) {
      return memoryValue.value as T
    }

    // Layer 2: Redis cache (fast, ~10-50ms)
    if (redis) {
      try {
        const redisValue = await redis.get(key)
        if (redisValue) {
          const parsed = JSON.parse(redisValue) as T
          // Promote to memory cache
          memoryCache.set(key, {
            value: parsed,
            expires: Date.now() + TTL.FIVE_MINUTES * 1000,
          })
          return parsed
        }
      } catch (error) {
        console.error('Redis get error:', error)
      }
    }

    return null
  },

  /**
   * Set value in cache (all layers)
   */
  async set(key: string, value: unknown, ttlSeconds: number = TTL.ONE_HOUR): Promise<void> {
    // Layer 1: Memory cache
    memoryCache.set(key, {
      value,
      expires: Date.now() + Math.min(ttlSeconds, TTL.FIVE_MINUTES) * 1000,
    })

    // Layer 2: Redis cache
    if (redis) {
      try {
        await redis.setex(key, ttlSeconds, JSON.stringify(value))
      } catch (error) {
        console.error('Redis set error:', error)
      }
    }
  },

  /**
   * Delete value from cache (all layers)
   */
  async delete(key: string): Promise<void> {
    // Layer 1: Memory cache
    memoryCache.delete(key)

    // Layer 2: Redis cache
    if (redis) {
      try {
        await redis.del(key)
      } catch (error) {
        console.error('Redis delete error:', error)
      }
    }
  },

  /**
   * Delete all keys matching pattern
   */
  async deletePattern(pattern: string): Promise<void> {
    // Memory cache: delete matching keys
    for (const key of memoryCache.keys()) {
      if (key.includes(pattern)) {
        memoryCache.delete(key)
      }
    }

    // Redis: delete matching keys
    if (redis) {
      try {
        const keys = await redis.keys(pattern)
        if (keys.length > 0) {
          await redis.del(...keys)
        }
      } catch (error) {
        console.error('Redis deletePattern error:', error)
      }
    }
  },

  /**
   * Check if key exists in cache
   */
  async exists(key: string): Promise<boolean> {
    // Check memory cache
    const memoryValue = memoryCache.get(key)
    if (memoryValue && memoryValue.expires > Date.now()) {
      return true
    }

    // Check Redis cache
    if (redis) {
      try {
        const exists = await redis.exists(key)
        return exists === 1
      } catch (error) {
        console.error('Redis exists error:', error)
      }
    }

    return false
  },

  /**
   * Clear all cache (memory only, use with caution)
   */
  clearMemory(): void {
    memoryCache.clear()
  },

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      memoryKeys: memoryCache.size,
      redisConnected: redis?.status === 'ready',
    }
  },
}

/**
 * Cleanup expired memory cache entries (run periodically)
 */
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of memoryCache.entries()) {
    if (value.expires < now) {
      memoryCache.delete(key)
    }
  }
}, 60000) // Clean up every minute
