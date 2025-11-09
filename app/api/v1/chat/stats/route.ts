import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { apiResponse } from '@/lib/utils/api-response'
import { aiChatService } from '@/features/ai-chat/services/AIChatService'

/**
 * GET /api/v1/chat/stats
 * Get AI chat statistics for authenticated admin
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()

    const stats = await aiChatService.getChatStats(user.id)

    return apiResponse.success(stats)
  } catch (error) {
    return apiResponse.error(error)
  }
}
