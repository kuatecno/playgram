import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth/session'
import { apiResponse } from '@/lib/utils/api-response'
import { socialDataService } from '@/features/social-data/services/SocialDataService'

const invalidateSchema = z.object({
  platform: z.enum(['instagram', 'tiktok', 'google', 'twitter', 'youtube', 'facebook']),
  identifier: z.string(),
  dataType: z.enum(['posts', 'videos', 'reviews', 'profile', 'hashtag']).optional(),
})

/**
 * POST /api/v1/admin/cache/invalidate
 * Invalidate cache for specific data
 */
export async function POST(request: NextRequest) {
  try {
    await requireAuth()

    const body = await request.json()
    const validated = invalidateSchema.parse(body)

    await socialDataService.invalidateCache(
      validated.platform,
      validated.identifier,
      validated.dataType
    )

    return apiResponse.success({
      message: 'Cache invalidated successfully',
      platform: validated.platform,
      identifier: validated.identifier,
      dataType: validated.dataType || 'all',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiResponse.validationError(error.errors[0].message)
    }
    return apiResponse.error(error)
  }
}
