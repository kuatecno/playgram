import { db } from '@/lib/db'
import { cache } from '@/lib/cache'
import { apifyService } from './ApifyService'
import { TTL } from '@/config/constants'
import type {
  Platform,
  DataType,
  SocialMediaResponse,
  InstagramPost,
  TikTokVideo,
  GoogleReview,
} from '@/types/social-media'

/**
 * Social Data Service
 * Multi-layer caching: Memory → Redis → Database → Apify
 * This is the main service exposed to API endpoints
 */
export class SocialDataService {
  /**
   * Fetch social media data with intelligent caching
   */
  async fetchData<T = unknown>(
    platform: Platform,
    dataType: DataType,
    identifier: string,
    options: {
      limit?: number
      forceRefresh?: boolean
    } = {}
  ): Promise<SocialMediaResponse<T>> {
    const { limit = 12, forceRefresh = false } = options
    const cacheKey = `social:${platform}:${dataType}:${identifier}`

    const startTime = Date.now()

    // Skip cache if force refresh
    if (!forceRefresh) {
      // Layer 1 & 2: Memory + Redis cache
      const cached = await cache.get<SocialMediaResponse<T>>(cacheKey)
      if (cached) {
        return {
          ...cached,
          metadata: {
            ...cached.metadata,
            cached: true,
            cacheAge: Math.floor((Date.now() - new Date(cached.metadata.timestamp).getTime()) / 1000),
          },
        }
      }

      // Layer 3: Database cache
      const dbCached = await db.socialMediaCache.findUnique({
        where: {
          platform_identifier_dataType: {
            platform,
            identifier,
            dataType,
          },
        },
      })

      if (dbCached && dbCached.expiresAt > new Date()) {
        const response: SocialMediaResponse<T> = {
          platform,
          dataType,
          identifier,
          data: dbCached.cachedData as T[],
          metadata: {
            total: (dbCached.cachedData as T[]).length,
            fetched: (dbCached.cachedData as T[]).length,
            cached: true,
            cacheAge: Math.floor((Date.now() - dbCached.lastFetched.getTime()) / 1000),
            fetchDuration: dbCached.fetchDuration || undefined,
            timestamp: dbCached.lastFetched.toISOString(),
          },
        }

        // Promote to Redis + Memory cache
        await cache.set(cacheKey, response, TTL.ONE_HOUR)

        return response
      }
    }

    // Layer 4: Fetch from Apify (source of truth)
    const data = await this.fetchFromSource<T>(platform, dataType, identifier, limit)
    const fetchDuration = Date.now() - startTime

    const response: SocialMediaResponse<T> = {
      platform,
      dataType,
      identifier,
      data,
      metadata: {
        total: data.length,
        fetched: data.length,
        cached: false,
        fetchDuration,
        timestamp: new Date().toISOString(),
      },
    }

    // Cache in all layers
    await this.cacheResponse(platform, dataType, identifier, data, fetchDuration)

    return response
  }

  /**
   * Fetch from source (Apify) based on platform and type
   */
  private async fetchFromSource<T>(
    platform: Platform,
    dataType: DataType,
    identifier: string,
    limit: number
  ): Promise<T[]> {
    switch (platform) {
      case 'instagram':
        if (dataType === 'posts') {
          return (await apifyService.fetchInstagramPosts(identifier, limit)) as T[]
        }
        break

      case 'tiktok':
        if (dataType === 'videos') {
          return (await apifyService.fetchTikTokVideos(identifier, limit)) as T[]
        }
        break

      case 'google':
        if (dataType === 'reviews') {
          return (await apifyService.fetchGoogleReviews(identifier, limit)) as T[]
        }
        break

      default:
        throw new Error(`Unsupported platform: ${platform}`)
    }

    throw new Error(`Unsupported data type: ${dataType} for platform: ${platform}`)
  }

  /**
   * Cache response in all layers
   */
  private async cacheResponse(
    platform: Platform,
    dataType: DataType,
    identifier: string,
    data: unknown,
    fetchDuration: number
  ): Promise<void> {
    const cacheKey = `social:${platform}:${dataType}:${identifier}`

    // Get cache duration from config
    const actorConfig = await db.apifyDataSource.findUnique({
      where: { platform },
    })

    const cacheDurationHours = actorConfig?.cacheDuration || 24
    const ttlSeconds = cacheDurationHours * 3600

    // Layer 1 & 2: Redis + Memory
    await cache.set(
      cacheKey,
      {
        platform,
        dataType,
        identifier,
        data,
        metadata: {
          total: (data as unknown[]).length,
          fetched: (data as unknown[]).length,
          cached: true,
          fetchDuration,
          timestamp: new Date().toISOString(),
        },
      },
      ttlSeconds
    )

    // Layer 3: Database
    await db.socialMediaCache.upsert({
      where: {
        platform_identifier_dataType: {
          platform,
          identifier,
          dataType,
        },
      },
      create: {
        platform,
        identifier,
        dataType,
        cachedData: data,
        lastFetched: new Date(),
        expiresAt: new Date(Date.now() + ttlSeconds * 1000),
        fetchDuration,
      },
      update: {
        cachedData: data,
        lastFetched: new Date(),
        expiresAt: new Date(Date.now() + ttlSeconds * 1000),
        fetchDuration,
      },
    })
  }

  /**
   * Invalidate cache for specific data
   */
  async invalidateCache(platform: Platform, identifier: string, dataType?: DataType): Promise<void> {
    if (dataType) {
      // Invalidate specific data type
      const cacheKey = `social:${platform}:${dataType}:${identifier}`
      await cache.delete(cacheKey)

      await db.socialMediaCache.deleteMany({
        where: { platform, identifier, dataType },
      })
    } else {
      // Invalidate all data types for this identifier
      await cache.deletePattern(`social:${platform}:*:${identifier}`)

      await db.socialMediaCache.deleteMany({
        where: { platform, identifier },
      })
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats() {
    const total = await db.socialMediaCache.count()
    const expired = await db.socialMediaCache.count({
      where: { expiresAt: { lt: new Date() } },
    })

    const platformStats = await db.socialMediaCache.groupBy({
      by: ['platform'],
      _count: true,
    })

    return {
      total,
      expired,
      active: total - expired,
      byPlatform: platformStats.reduce(
        (acc, stat) => {
          acc[stat.platform] = stat._count
          return acc
        },
        {} as Record<string, number>
      ),
      cacheHitRate: this.calculateCacheHitRate(),
    }
  }

  /**
   * Calculate cache hit rate (rough estimate)
   */
  private calculateCacheHitRate(): number {
    // This is a placeholder - you can track this more accurately
    // by logging cache hits/misses in ApiUsage table
    return 0.95 // 95% target
  }
}

/**
 * Singleton instance
 */
export const socialDataService = new SocialDataService()
