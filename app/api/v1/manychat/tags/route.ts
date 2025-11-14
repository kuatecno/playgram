import { requireAuth } from '@/lib/auth/session'
import { apiResponse } from '@/lib/utils/api-response'
import { manychatService } from '@/features/manychat/services/ManychatService'

/**
 * GET /api/v1/manychat/tags
 * Get all ManyChat tags for the admin
 */
export async function GET() {
  try {
    const user = await requireAuth()
    const tags = await manychatService.getTags(user.id)

    return apiResponse.success(tags)
  } catch (error) {
    console.error('Failed to fetch ManyChat tags:', error)
    return apiResponse.error(error)
  }
}
