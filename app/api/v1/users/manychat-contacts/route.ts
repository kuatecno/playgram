import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { apiResponse } from '@/lib/utils/api-response'
import { db } from '@/lib/db'

/**
 * GET /api/v1/users/manychat-contacts
 * Get users with Manychat IDs for QR code personalization
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth()
    const { searchParams } = request.nextUrl

    const search = searchParams.get('search') || ''
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)

    // Build where clause
    const where: any = {
      manychatId: { not: null },
    }

    // Add search filter if provided
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { igUsername: { contains: search, mode: 'insensitive' } },
      ]
    }

    const users = await db.user.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        igUsername: true,
        manychatId: true,
      },
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' },
      ],
      take: limit,
    })

    return apiResponse.success({
      users: users.map(u => ({
        id: u.id,
        name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Unknown',
        firstName: u.firstName,
        lastName: u.lastName,
        username: u.igUsername,
        manychatId: u.manychatId,
      })),
      total: users.length,
    })
  } catch (error) {
    return apiResponse.error(error)
  }
}
