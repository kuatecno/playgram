import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth/session'
import { apiResponse } from '@/lib/utils/api-response'
import { db } from '@/lib/db'

const updateWebhookSchema = z.object({
  url: z.string().url().optional(),
  events: z.array(z.string()).min(1).optional(),
  customHeaders: z.record(z.string()).optional(),
  isActive: z.boolean().optional(),
})

/**
 * GET /api/v1/webhooks/[id]
 * Get a single webhook subscription
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const user = await requireAuth()

    const webhook = await db.webhookSubscription.findFirst({
      where: {
        id,
        adminId: user.id,
      },
      include: {
        deliveries: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    })

    if (!webhook) {
      return apiResponse.notFound('Webhook not found')
    }

    // Calculate stats
    const successCount = await db.webhookDelivery.count({
      where: {
        subscriptionId: webhook.id,
        status: 'success',
      },
    })

    const failedCount = await db.webhookDelivery.count({
      where: {
        subscriptionId: webhook.id,
        status: 'failed',
      },
    })

    return apiResponse.success({
      webhook: {
        id: webhook.id,
        url: webhook.url,
        events: webhook.events,
        customHeaders: webhook.customHeaders,
        isActive: webhook.isActive,
        stats: {
          totalDeliveries: webhook.deliveries.length,
          successCount,
          failedCount,
          successRate:
            webhook.deliveries.length > 0
              ? (successCount / webhook.deliveries.length) * 100
              : 0,
        },
        recentDeliveries: webhook.deliveries.map((d) => ({
          id: d.id,
          event: d.event,
          status: d.status,
          attempts: d.attempts,
          responseStatus: d.responseStatus,
          errorMessage: d.errorMessage,
          createdAt: d.createdAt,
        })),
        createdAt: webhook.createdAt,
        updatedAt: webhook.updatedAt,
      },
    })
  } catch (error) {
    return apiResponse.error(error)
  }
}

/**
 * PATCH /api/v1/webhooks/[id]
 * Update a webhook subscription
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const user = await requireAuth()
    const body = await request.json()

    // Validate input
    const validated = updateWebhookSchema.parse(body)

    // Verify ownership
    const existing = await db.webhookSubscription.findFirst({
      where: {
        id,
        adminId: user.id,
      },
    })

    if (!existing) {
      return apiResponse.notFound('Webhook not found')
    }

    // Update webhook
    const webhook = await db.webhookSubscription.update({
      where: { id },
      data: {
        url: validated.url,
        events: validated.events,
        customHeaders: validated.customHeaders,
        isActive: validated.isActive,
      },
    })

    return apiResponse.success({
      webhook: {
        id: webhook.id,
        url: webhook.url,
        events: webhook.events,
        customHeaders: webhook.customHeaders,
        isActive: webhook.isActive,
        updatedAt: webhook.updatedAt,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiResponse.validationError(error.errors[0].message)
    }
    return apiResponse.error(error)
  }
}

/**
 * DELETE /api/v1/webhooks/[id]
 * Delete a webhook subscription
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const user = await requireAuth()

    // Verify ownership
    const webhook = await db.webhookSubscription.findFirst({
      where: {
        id,
        adminId: user.id,
      },
    })

    if (!webhook) {
      return apiResponse.notFound('Webhook not found')
    }

    // Delete webhook (deliveries will cascade delete)
    await db.webhookSubscription.delete({
      where: { id },
    })

    return apiResponse.success({
      message: 'Webhook deleted successfully',
    })
  } catch (error) {
    return apiResponse.error(error)
  }
}
