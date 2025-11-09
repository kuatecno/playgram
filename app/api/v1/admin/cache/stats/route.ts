import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { apiResponse } from '@/lib/utils/api-response'
import { socialDataService } from '@/features/social-data/services/SocialDataService'
import { cache } from '@/lib/cache'

/**
 * GET /api/v1/admin/cache/stats
 * Get cache statistics
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth()

    const stats = await socialDataService.getCacheStats()
    const cacheServiceStats = cache.getStats()

    return apiResponse.success({
      database: stats,
      redis: cacheServiceStats,
      performance: {
        targetCacheHitRate: 0.95,
        currentCacheHitRate: stats.cacheHitRate,
        memoryKeys: cacheServiceStats.memoryKeys,
        redisConnected: cacheServiceStats.redisConnected,
      },
    })
  } catch (error) {
    return apiResponse.error(error)
  }
}
