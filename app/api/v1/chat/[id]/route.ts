import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { apiResponse } from '@/lib/utils/api-response'
import { aiChatService } from '@/features/ai-chat/services/AIChatService'

/**
 * GET /api/v1/chat/:id
 * Get conversation details with full message history
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params

    const conversation = await aiChatService.getConversation(id, user.id)

    return apiResponse.success(conversation)
  } catch (error) {
    if (error instanceof Error && error.message === 'Conversation not found') {
      return apiResponse.notFound('Conversation not found')
    }
    return apiResponse.error(error)
  }
}
