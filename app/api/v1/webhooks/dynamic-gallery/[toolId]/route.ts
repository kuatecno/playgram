import { NextRequest } from 'next/server'
import { apiResponse } from '@/lib/utils/api-response'
import { db } from '@/lib/db'
import { dynamicGalleryService } from '@/features/dynamic-gallery/service'
import { dynamicGalleryCardListSchema } from '@/features/dynamic-gallery/types'
import { z } from 'zod'

const webhookPayloadSchema = z.object({
  cards: dynamicGalleryCardListSchema,
})

/**
 * POST /api/v1/webhooks/dynamic-gallery/:toolId
 * Public webhook endpoint for receiving gallery card updates from external systems
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ toolId: string }> }
) {
  try {
    const { toolId } = await params
    const signature = request.headers.get('x-playgram-signature')

    if (!signature) {
      return apiResponse.unauthorized('Missing webhook signature')
    }

    // Read the raw body for signature verification
    const rawBody = await request.text()

    // Verify webhook signature
    try {
      await dynamicGalleryService.verifyWebhookSignature(toolId, rawBody, signature)
    } catch (error) {
      console.error('Webhook signature verification failed:', error)
      return apiResponse.unauthorized('Invalid webhook signature')
    }

    // Parse and validate payload
    let payload: z.infer<typeof webhookPayloadSchema>
    try {
      payload = webhookPayloadSchema.parse(JSON.parse(rawBody))
    } catch (error) {
      if (error instanceof z.ZodError) {
        return apiResponse.validationError(error.errors[0].message)
      }
      return apiResponse.badRequest('Invalid payload format')
    }

    // Store the cards
    const result = await dynamicGalleryService.storeCardsForTool(
      toolId,
      payload.cards,
      'webhook'
    )

    // Get the config to check if auto-sync is enabled
    const tool = await db.tool.findUnique({
      where: { id: toolId },
      select: { adminId: true },
    })

    if (!tool) {
      return apiResponse.notFound('Tool not found')
    }

    const summary = await dynamicGalleryService.getSummary(tool.adminId)

    // Temporarily disabled auto-sync to prevent connection pool exhaustion
    // TODO: Re-enable after implementing job queue
    // if (summary.config.autoSyncEnabled && result.created) {
    //   dynamicGalleryService
    //     .syncToManychat(tool.adminId, {
    //       trigger: 'webhook',
    //       snapshotId: result.snapshotId,
    //     })
    //     .catch((error) => {
    //       console.error('Background sync failed:', error)
    //       })
    // }

    return apiResponse.success({
      snapshotId: result.snapshotId,
      version: result.version,
      created: result.created,
      autoSyncQueued: summary.config.autoSyncEnabled && result.created,
    })
  } catch (error) {
    console.error('Dynamic gallery webhook error:', error)
    return apiResponse.error(error)
  }
}
