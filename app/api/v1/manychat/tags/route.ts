import { NextRequest } from 'next/server'
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

/**
 * POST /api/v1/manychat/tags
 * Create a new tag in ManyChat
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const { name } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return apiResponse.validationError('Tag name is required')
    }

    const tag = await manychatService.createTag(user.id, name.trim())

    return apiResponse.success(tag)
  } catch (error) {
    console.error('Failed to create ManyChat tag:', error)
    return apiResponse.error(error)
  }
}
