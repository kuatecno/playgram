import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth/session'
import { apiResponse } from '@/lib/utils/api-response'
import { db } from '@/lib/db'
import crypto from 'crypto'

const createWebhookSchema = z.object({
  url: z.string().url('Invalid URL'),
  events: z.array(z.string()).min(1, 'At least one event is required'),
  customHeaders: z.record(z.string()).optional(),
})

/**
 * GET /api/v1/webhooks
 * List all webhook subscriptions for authenticated admin
 */
export async function GET(_request: NextRequest) {
  try {
    const user = await requireAuth()

    const webhooks = await db.webhookSubscription.findMany({
      where: { adminId: user.id },
      include: {
        _count: {
          select: {
            deliveries: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Get delivery stats for each webhook
    const webhooksWithStats = await Promise.all(
      webhooks.map(async (webhook) => {
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

        const lastDelivery = await db.webhookDelivery.findFirst({
          where: { subscriptionId: webhook.id },
          orderBy: { createdAt: 'desc' },
        })

        return {
          id: webhook.id,
          url: webhook.url,
          events: webhook.events,
          isActive: webhook.isActive,
          customHeaders: webhook.customHeaders,
          stats: {
            totalDeliveries: webhook._count.deliveries,
            successCount,
            failedCount,
            successRate:
              webhook._count.deliveries > 0
                ? (successCount / webhook._count.deliveries) * 100
                : 0,
          },
          lastDelivery: lastDelivery
            ? {
                event: lastDelivery.event,
                status: lastDelivery.status,
                timestamp: lastDelivery.createdAt,
              }
            : null,
          createdAt: webhook.createdAt,
          updatedAt: webhook.updatedAt,
        }
      })
    )

    return apiResponse.success({
      webhooks: webhooksWithStats,
      total: webhooks.length,
    })
  } catch (error) {
    return apiResponse.error(error)
  }
}

/**
 * POST /api/v1/webhooks
 * Create a new webhook subscription
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()

    // Validate input
    const validated = createWebhookSchema.parse(body)

    // Generate secure random secret for HMAC signing
    const secret = crypto.randomBytes(32).toString('hex')

    // Create webhook subscription
    const webhook = await db.webhookSubscription.create({
      data: {
        adminId: user.id,
        url: validated.url,
        events: validated.events,
        secret,
        customHeaders: validated.customHeaders || {},
        isActive: true,
      },
    })

    return apiResponse.success(
      {
        webhook: {
          id: webhook.id,
          url: webhook.url,
          events: webhook.events,
          secret, // Return secret only on creation
          customHeaders: webhook.customHeaders,
          isActive: webhook.isActive,
          createdAt: webhook.createdAt,
        },
      },
      201
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiResponse.validationError(error.errors[0].message)
    }
    return apiResponse.error(error)
  }
}
