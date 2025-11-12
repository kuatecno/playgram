import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { apiResponse } from '@/lib/utils/api-response'
import { db } from '@/lib/db'

/**
 * GET /api/v1/contacts/stats
 * Get contact statistics
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth()

    // Total contacts
    const totalContacts = await db.user.count()

    // Subscribed contacts
    const subscribedContacts = await db.user.count({
      where: { isSubscribed: true },
    })

    // Contacts with Manychat ID
    const manychatContacts = await db.user.count({
      where: { manychatId: { not: null } },
    })

    // Contacts with Instagram username
    const instagramContacts = await db.user.count({
      where: { igUsername: { not: null } },
    })

    // New contacts this month
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const newThisMonth = await db.user.count({
      where: {
        createdAt: { gte: startOfMonth },
      },
    })

    // Active contacts (interacted in last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const activeContacts = await db.user.count({
      where: {
        lastInteraction: { gte: thirtyDaysAgo },
      },
    })

    // Top tags
    const topTags = await db.tag.findMany({
      include: {
        _count: {
          select: {
            users: true,
          },
        },
      },
      orderBy: {
        users: {
          _count: 'desc',
        },
      },
      take: 10,
    })

    return apiResponse.success({
      stats: {
        total: totalContacts,
        subscribed: subscribedContacts,
        unsubscribed: totalContacts - subscribedContacts,
        withManychat: manychatContacts,
        withInstagram: instagramContacts,
        newThisMonth,
        active: activeContacts,
      },
      topTags: topTags.map((tag) => ({
        id: tag.id,
        name: tag.name,
        contactCount: tag._count.users,
      })),
    })
  } catch (error) {
    return apiResponse.error(error)
  }
}
