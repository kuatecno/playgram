import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { apiResponse } from '@/lib/utils/api-response'
import { db } from '@/lib/db'

/**
 * GET /api/v1/webhooks/deliveries
 * Get webhook delivery logs for authenticated admin
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = request.nextUrl

    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')
    const status = searchParams.get('status') || undefined
    const event = searchParams.get('event') || undefined
    const subscriptionId = searchParams.get('subscriptionId') || undefined

    // Build where clause
    const where: any = {
      subscription: {
        adminId: user.id,
      },
    }

    if (status) {
      where.status = status
    }

    if (event) {
      where.event = event
    }

    if (subscriptionId) {
      where.subscriptionId = subscriptionId
    }

    // Get deliveries
    const deliveries = await db.webhookDelivery.findMany({
      where,
      include: {
        subscription: {
          select: {
            id: true,
            url: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    })

    // Get total count
    const total = await db.webhookDelivery.count({ where })

    return apiResponse.success({
      deliveries: deliveries.map((d) => ({
        id: d.id,
        subscriptionId: d.subscriptionId,
        subscriptionUrl: d.subscription.url,
        event: d.event,
        status: d.status,
        attempts: d.attempts,
        responseStatus: d.responseStatus,
        errorMessage: d.errorMessage,
        createdAt: d.createdAt,
        lastAttemptAt: d.lastAttemptAt,
      })),
      total,
      limit,
      offset,
    })
  } catch (error) {
    return apiResponse.error(error)
  }
}
