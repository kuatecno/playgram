import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { apiResponse } from '@/lib/utils/api-response'
import { db } from '@/lib/db'

/**
 * GET /api/v1/contacts
 * List all contacts (users) with filtering and search
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth()
    const { searchParams } = request.nextUrl

    const search = searchParams.get('search') || ''
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')
    const tagId = searchParams.get('tagId') || undefined
    const isSubscribed = searchParams.get('isSubscribed')
      ? searchParams.get('isSubscribed') === 'true'
      : undefined

    // Build where clause
    const where: any = {}

    // Search filter
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { igUsername: { contains: search, mode: 'insensitive' } },
        { manychatId: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Tag filter
    if (tagId) {
      where.tags = {
        some: {
          id: tagId,
        },
      }
    }

    // Subscription filter
    if (isSubscribed !== undefined) {
      where.isSubscribed = isSubscribed
    }

    // Get contacts
    const contacts = await db.user.findMany({
      where,
      include: {
        tags: {
          select: {
            id: true,
            name: true,
            manychatId: true,
          },
        },
        customFieldValues: {
          include: {
            field: {
              select: {
                id: true,
                name: true,
                fieldType: true,
              },
            },
          },
        },
        _count: {
          select: {
            bookings: true,
            qrCodes: true,
            conversations: true,
          },
        },
      },
      orderBy: [
        { lastInteraction: 'desc' },
        { createdAt: 'desc' },
      ],
      skip: offset,
      take: limit,
    })

    // Get total count
    const total = await db.user.count({ where })

    // Format response
    const formattedContacts = contacts.map((contact) => ({
      id: contact.id,
      manychatId: contact.manychatId,
      instagramUsername: contact.igUsername,
      firstName: contact.firstName,
      lastName: contact.lastName,
      fullName: [contact.firstName, contact.lastName].filter(Boolean).join(' ') || 'Unknown',
      profilePic: contact.profilePicUrl,
      followerCount: contact.followerCount,
      isSubscribed: contact.isSubscribed,
      tags: contact.tags,
      customFields: Object.fromEntries(
        contact.customFieldValues.map((cfv) => [
          cfv.field.name,
          {
            value: cfv.value,
            type: cfv.field.fieldType,
          },
        ])
      ),
      stats: {
        bookings: contact._count.bookings,
        qrScans: contact._count.qrCodes,
        conversations: contact._count.conversations,
      },
      lastInteraction: contact.lastInteraction,
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt,
    }))

    return apiResponse.success({
      contacts: formattedContacts,
      total,
      limit,
      offset,
    })
  } catch (error) {
    return apiResponse.error(error)
  }
}
