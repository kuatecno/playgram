import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { apiResponse } from '@/lib/utils/api-response'
import { dynamicGalleryService } from '@/features/dynamic-gallery/service'
import { dynamicGalleryCardListSchema } from '@/features/dynamic-gallery/types'
import { z } from 'zod'

const storeCardsSchema = z.object({
  cards: dynamicGalleryCardListSchema,
})

/**
 * POST /api/v1/dynamic-gallery/cards
 * Store gallery cards manually (not via webhook)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()

    // Validate input
    const validated = storeCardsSchema.parse(body)

    // Store cards
    const result = await dynamicGalleryService.storeCardsForAdmin(
      user.id,
      validated.cards,
      'manual'
    )

    return apiResponse.success({
      snapshotId: result.snapshotId,
      version: result.version,
      created: result.created,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiResponse.validationError(error.errors[0].message)
    }
    return apiResponse.error(error)
  }
}
