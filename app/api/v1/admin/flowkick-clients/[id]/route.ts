import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth/session'
import { apiResponse } from '@/lib/utils/api-response'
import { db } from '@/lib/db'

const updateClientSchema = z.object({
  name: z.string().min(2).optional(),
  isActive: z.boolean().optional(),
  webhookUrl: z.string().url().optional().nullable(),
  allowedPlatforms: z.array(z.string()).optional(),
})

/**
 * GET /api/v1/admin/flowkick-clients/:id
 * Get client details with usage stats
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()

    // Get client
    const client = await db.flowkickClient.findFirst({
      where: {
        id: params.id,
        adminId: user.id,
      },
      select: {
        id: true,
        name: true,
        tier: true,
        requestLimit: true,
        requestCount: true,
        allowedPlatforms: true,
        isActive: true,
        webhookUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!client) {
      return apiResponse.notFound('Client not found')
    }

    // Get usage stats
    const usageStats = await db.apiUsage.groupBy({
      by: ['platform'],
      where: { clientId: params.id },
      _count: true,
      _avg: {
        responseTime: true,
      },
    })

    // Get cache hit rate
    const totalRequests = await db.apiUsage.count({
      where: { clientId: params.id },
    })

    const cacheHits = await db.apiUsage.count({
      where: {
        clientId: params.id,
        cacheHit: true,
      },
    })

    const cacheHitRate = totalRequests > 0 ? (cacheHits / totalRequests) * 100 : 0

    // Recent usage (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const recentUsage = await db.apiUsage.groupBy({
      by: ['timestamp'],
      where: {
        clientId: params.id,
        timestamp: { gte: sevenDaysAgo },
      },
      _count: true,
    })

    return apiResponse.success({
      client,
      stats: {
        usageByPlatform: usageStats.map((stat) => ({
          platform: stat.platform,
          requests: stat._count,
          avgResponseTime: Math.round(stat._avg.responseTime || 0),
        })),
        totalRequests,
        cacheHitRate: Math.round(cacheHitRate * 100) / 100,
        requestsThisMonth: client.requestCount,
        limitUtilization:
          client.requestLimit === -1
            ? 0
            : Math.round((client.requestCount / client.requestLimit) * 100),
        recentActivity: recentUsage.length,
      },
    })
  } catch (error) {
    return apiResponse.error(error)
  }
}

/**
 * PATCH /api/v1/admin/flowkick-clients/:id
 * Update client settings
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    const body = await request.json()

    // Validate input
    const validated = updateClientSchema.parse(body)

    // Update client
    const client = await db.flowkickClient.updateMany({
      where: {
        id: params.id,
        adminId: user.id,
      },
      data: validated,
    })

    if (client.count === 0) {
      return apiResponse.notFound('Client not found')
    }

    return apiResponse.success({ message: 'Client updated successfully' })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiResponse.validationError(error.errors[0].message)
    }
    return apiResponse.error(error)
  }
}

/**
 * DELETE /api/v1/admin/flowkick-clients/:id
 * Delete a client
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()

    const deleted = await db.flowkickClient.deleteMany({
      where: {
        id: params.id,
        adminId: user.id,
      },
    })

    if (deleted.count === 0) {
      return apiResponse.notFound('Client not found')
    }

    return apiResponse.success({ message: 'Client deleted successfully' })
  } catch (error) {
    return apiResponse.error(error)
  }
}
