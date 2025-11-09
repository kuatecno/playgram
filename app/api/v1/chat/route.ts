import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth/session'
import { apiResponse } from '@/lib/utils/api-response'
import { aiChatService } from '@/features/ai-chat/services/AIChatService'

const chatSchema = z.object({
  userId: z.string(),
  message: z.string().min(1, 'Message is required'),
  conversationId: z.string().optional(),
})

/**
 * POST /api/v1/chat
 * Send a message and get AI response
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()

    // Validate input
    const validated = chatSchema.parse(body)

    // Send message and get AI response
    const result = await aiChatService.chat({
      adminId: user.id,
      userId: validated.userId,
      message: validated.message,
      conversationId: validated.conversationId,
    })

    return apiResponse.success(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiResponse.validationError(error.errors[0].message)
    }
    if (error instanceof Error && error.message === 'OpenAI API key not configured') {
      return apiResponse.error(error, 503)
    }
    return apiResponse.error(error)
  }
}

/**
 * GET /api/v1/chat
 * List conversations for authenticated admin
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = request.nextUrl

    const userId = searchParams.get('userId') || undefined
    const limit = searchParams.get('limit')
      ? parseInt(searchParams.get('limit')!)
      : 50
    const offset = searchParams.get('offset')
      ? parseInt(searchParams.get('offset')!)
      : 0

    const result = await aiChatService.listConversations(user.id, {
      userId,
      limit,
      offset,
    })

    return apiResponse.success(result)
  } catch (error) {
    return apiResponse.error(error)
  }
}
