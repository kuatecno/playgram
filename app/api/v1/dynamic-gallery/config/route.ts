import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { apiResponse } from '@/lib/utils/api-response'
import { dynamicGalleryService } from '@/features/dynamic-gallery/service'
import { z } from 'zod'

const updateConfigSchema = z.object({
  autoSyncEnabled: z.boolean().optional(),
})

/**
 * PATCH /api/v1/dynamic-gallery/config
 * Update dynamic gallery configuration
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()

    // Validate input
    const validated = updateConfigSchema.parse(body)

    // Update config
    if (validated.autoSyncEnabled !== undefined) {
      await dynamicGalleryService.setAutoSync(user.id, validated.autoSyncEnabled)
    }

    // Return updated summary
    const summary = await dynamicGalleryService.getSummary(user.id)
    return apiResponse.success(summary)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiResponse.validationError(error.errors[0].message)
    }
    return apiResponse.error(error)
  }
}
