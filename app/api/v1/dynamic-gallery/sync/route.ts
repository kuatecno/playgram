import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { apiResponse } from '@/lib/utils/api-response'
import { dynamicGalleryService } from '@/features/dynamic-gallery/service'
import { z } from 'zod'

const syncSchema = z.object({
  snapshotId: z.string().optional(),
  dryRun: z.boolean().optional(),
  contactIds: z.array(z.string()).optional(),
})

/**
 * POST /api/v1/dynamic-gallery/sync
 * Manually trigger sync to ManyChat
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()

    // Validate input
    const validated = syncSchema.parse(body)

    // Trigger sync
    const result = await dynamicGalleryService.syncToManychat(user.id, {
      trigger: 'manual',
      snapshotId: validated.snapshotId,
      dryRun: validated.dryRun,
      contactIds: validated.contactIds,
    })

    return apiResponse.success(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiResponse.validationError(error.errors[0].message)
    }
    return apiResponse.error(error)
  }
}
