import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { apiResponse } from '@/lib/utils/api-response'
import { dynamicGalleryService } from '@/features/dynamic-gallery/service'

/**
 * GET /api/v1/dynamic-gallery
 * Get complete dynamic gallery summary for authenticated admin
 */
export async function GET(_request: NextRequest) {
  try {
    const user = await requireAuth()
    const summary = await dynamicGalleryService.getSummary(user.id)
    return apiResponse.success(summary)
  } catch (error) {
    return apiResponse.error(error)
  }
}
