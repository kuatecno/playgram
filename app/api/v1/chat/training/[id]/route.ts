import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth/session'
import { apiResponse } from '@/lib/utils/api-response'
import { aiChatService } from '@/features/ai-chat/services/AIChatService'

const updateTrainingSchema = z.object({
  category: z.string().min(1).optional(),
  question: z.string().min(1).optional(),
  answer: z.string().min(1).optional(),
  keywords: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
})

/**
 * PATCH /api/v1/chat/training/:id
 * Update training data
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    const body = await request.json()

    // Validate input
    const validated = updateTrainingSchema.parse(body)

    await aiChatService.updateTrainingData(params.id, user.id, validated)

    return apiResponse.success({ message: 'Training data updated successfully' })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiResponse.validationError(error.errors[0].message)
    }
    if (error instanceof Error && error.message === 'Training data not found') {
      return apiResponse.notFound('Training data not found')
    }
    return apiResponse.error(error)
  }
}

/**
 * DELETE /api/v1/chat/training/:id
 * Delete training data
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()

    await aiChatService.deleteTrainingData(params.id, user.id)

    return apiResponse.success({ message: 'Training data deleted successfully' })
  } catch (error) {
    if (error instanceof Error && error.message === 'Training data not found') {
      return apiResponse.notFound('Training data not found')
    }
    return apiResponse.error(error)
  }
}
