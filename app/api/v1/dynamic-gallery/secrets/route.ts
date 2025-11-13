import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { apiResponse } from '@/lib/utils/api-response'
import { dynamicGalleryService } from '@/features/dynamic-gallery/service'
import { z } from 'zod'

const createSecretSchema = z.object({
  label: z.string().min(1).max(100).optional(),
})

/**
 * POST /api/v1/dynamic-gallery/secrets
 * Generate a new webhook secret
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()

    // Validate input
    const validated = createSecretSchema.parse(body)

    // Generate secret
    const result = await dynamicGalleryService.generateSecretForAdmin(user.id, validated.label)

    return apiResponse.success(result, 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiResponse.validationError(error.errors[0].message)
    }
    return apiResponse.error(error)
  }
}
