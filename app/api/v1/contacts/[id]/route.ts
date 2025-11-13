import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { apiResponse } from '@/lib/utils/api-response'
import { db } from '@/lib/db'

/**
 * GET /api/v1/contacts/[id]
 * Get detailed contact information
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    await requireAuth()

    const contact = await db.user.findUnique({
      where: { id },
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
                description: true,
              },
            },
          },
        },
        bookings: {
          include: {
            tool: {
              select: {
                id: true,
                name: true,
                toolType: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        qrCodes: {
          include: {
            tool: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        interactionHistory: {
          orderBy: { date: 'desc' },
          take: 30,
        },
      },
    })

    if (!contact) {
      return apiResponse.notFound('Contact not found')
    }

    // Calculate total interactions
    const totalInteractions = contact.interactionHistory.reduce(
      (sum, h) =>
        sum +
        h.messageCount +
        h.commentCount +
        h.storyReplyCount +
        h.flowCompletions,
      0
    )

    // Format response
    const formattedContact = {
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
      customFields: contact.customFieldValues.map((cfv) => ({
        id: cfv.field.id,
        name: cfv.field.name,
        type: cfv.field.fieldType,
        description: cfv.field.description,
        value: cfv.value,
        updatedAt: cfv.updatedAt,
      })),
      stats: {
        totalBookings: contact.bookings.length,
        totalQRScans: contact.qrCodes.length,
        totalInteractions,
      },
      recentBookings: contact.bookings.map((b) => ({
        id: b.id,
        date: b.bookingDate,
        startTime: b.startTime,
        endTime: b.endTime,
        status: b.status,
        tool: b.tool,
        createdAt: b.createdAt,
      })),
      recentQRScans: contact.qrCodes.map((qr) => ({
        id: qr.id,
        code: qr.code,
        type: qr.qrType,
        scanCount: qr.scanCount,
        scannedAt: qr.scannedAt,
        tool: qr.tool,
      })),
      interactionHistory: contact.interactionHistory.map((h) => ({
        date: h.date,
        messages: h.messageCount,
        comments: h.commentCount,
        storyReplies: h.storyReplyCount,
        flowCompletions: h.flowCompletions,
        lastActivity: h.lastActivity,
      })),
      lastInteraction: contact.lastInteraction,
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt,
    }

    return apiResponse.success({
      contact: formattedContact,
    })
  } catch (error) {
    return apiResponse.error(error)
  }
}
