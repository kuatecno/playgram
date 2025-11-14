import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { apiResponse } from '@/lib/utils/api-response'
import { dynamicGalleryService } from '@/features/dynamic-gallery/service'

/**
 * GET /api/v1/dynamic-gallery
 * Get complete dynamic gallery summary for authenticated admin
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()

    // Get base URL from environment or request headers
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
                    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` :
                    `${request.nextUrl.protocol}//${request.nextUrl.host}`

    const summary = await dynamicGalleryService.getSummary(user.id, baseUrl)
    return apiResponse.success(summary)
  } catch (error) {
    return apiResponse.error(error)
  }
}
