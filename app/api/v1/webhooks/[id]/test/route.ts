import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { apiResponse } from '@/lib/utils/api-response'
import { db } from '@/lib/db'
import { sendWebhook, WEBHOOK_EVENTS } from '@/lib/webhooks/webhook-service'

/**
 * POST /api/v1/webhooks/[id]/test
 * Send a test webhook delivery
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const user = await requireAuth()

    // Get webhook
    const webhook = await db.webhookSubscription.findFirst({
      where: {
        id,
        adminId: user.id,
      },
    })

    if (!webhook) {
      return apiResponse.notFound('Webhook not found')
    }

    // Send test payload
    const testPayload = {
      event: WEBHOOK_EVENTS.WEBHOOK_TEST,
      timestamp: new Date().toISOString(),
      data: {
        message: 'This is a test webhook from Playgram',
        webhookId: webhook.id,
        subscribedEvents: webhook.events,
      },
      metadata: {
        test: true,
      },
    }

    const result = await sendWebhook(
      {
        id: webhook.id,
        url: webhook.url,
        secret: webhook.secret,
        customHeaders: webhook.customHeaders,
      },
      testPayload
    )

    if (result.success) {
      return apiResponse.success({
        message: 'Test webhook sent successfully',
        result: {
          statusCode: result.statusCode,
          durationMs: result.durationMs,
          deliveryId: result.deliveryId,
        },
      })
    } else {
      return apiResponse.error(
        new Error(`Webhook test failed: ${result.error}`)
      )
    }
  } catch (error) {
    return apiResponse.error(error)
  }
}
