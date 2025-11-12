import { db } from '@/lib/db'
import { emitWebhookEvent, WEBHOOK_EVENTS } from './webhook-service'

/**
 * Prepare user data for webhook payload
 */
export async function prepareUserWebhookPayload(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      tags: true,
      customFieldValues: {
        include: {
          field: true,
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
  })

  if (!user) {
    throw new Error('User not found')
  }

  // Get latest interaction
  const latestInteraction = await db.interactionHistory.findFirst({
    where: { userId },
    orderBy: { date: 'desc' },
  })

  return {
    id: user.id,
    manychatId: user.manychatId,
    instagramUsername: user.igUsername,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: [user.firstName, user.lastName].filter(Boolean).join(' '),
    profilePic: user.profilePicUrl,
    followerCount: user.followerCount,
    isSubscribed: user.isSubscribed,
    tags: user.tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      manychatId: tag.manychatId,
    })),
    customFields: Object.fromEntries(
      user.customFieldValues.map((cfv) => [
        cfv.field.name,
        cfv.value,
      ])
    ),
    interactions: latestInteraction
      ? {
          messageCount: latestInteraction.messageCount,
          commentCount: latestInteraction.commentCount,
          storyReplyCount: latestInteraction.storyReplyCount,
          flowCompletions: latestInteraction.flowCompletions,
          lastActivity: latestInteraction.lastActivity?.toISOString(),
        }
      : null,
    stats: {
      bookingsCount: user._count.bookings,
      qrScansCount: user._count.qrCodes,
      conversationsCount: user._count.conversations,
    },
    timestamps: {
      lastInteraction: user.lastInteraction?.toISOString(),
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    },
  }
}

/**
 * Prepare booking data for webhook payload
 */
export async function prepareBookingWebhookPayload(bookingId: string) {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: {
      user: true,
      tool: true,
    },
  })

  if (!booking) {
    throw new Error('Booking not found')
  }

  return {
    id: booking.id,
    bookingDate: booking.bookingDate.toISOString(),
    startTime: booking.startTime,
    endTime: booking.endTime,
    status: booking.status,
    helperName: booking.helperName,
    serviceType: booking.serviceType,
    notes: booking.notes,
    metadata: booking.metadata,
    tool: {
      id: booking.tool.id,
      name: booking.tool.name,
      type: booking.tool.toolType,
    },
    user: {
      id: booking.user.id,
      manychatId: booking.user.manychatId,
      instagramUsername: booking.user.igUsername,
      firstName: booking.user.firstName,
      lastName: booking.user.lastName,
    },
    timestamps: {
      createdAt: booking.createdAt.toISOString(),
      updatedAt: booking.updatedAt.toISOString(),
    },
  }
}

/**
 * Prepare QR code data for webhook payload
 */
export async function prepareQRCodeWebhookPayload(qrCodeId: string) {
  const qrCode = await db.qRCode.findUnique({
    where: { id: qrCodeId },
    include: {
      user: true,
      tool: true,
    },
  })

  if (!qrCode) {
    throw new Error('QR code not found')
  }

  return {
    id: qrCode.id,
    code: qrCode.code,
    type: qrCode.qrType,
    metadata: qrCode.metadata,
    scanCount: qrCode.scanCount,
    scannedAt: qrCode.scannedAt?.toISOString(),
    expiresAt: qrCode.expiresAt?.toISOString(),
    tool: {
      id: qrCode.tool.id,
      name: qrCode.tool.name,
      type: qrCode.tool.toolType,
    },
    user: qrCode.user
      ? {
          id: qrCode.user.id,
          manychatId: qrCode.user.manychatId,
          instagramUsername: qrCode.user.igUsername,
          firstName: qrCode.user.firstName,
          lastName: qrCode.user.lastName,
        }
      : null,
    timestamps: {
      createdAt: qrCode.createdAt.toISOString(),
      updatedAt: qrCode.updatedAt.toISOString(),
    },
  }
}

/**
 * Emit user created event
 */
export async function emitUserCreated(adminId: string, userId: string) {
  const userData = await prepareUserWebhookPayload(userId)
  await emitWebhookEvent(adminId, WEBHOOK_EVENTS.USER_CREATED, {
    user: userData,
  })
}

/**
 * Emit user updated event
 */
export async function emitUserUpdated(
  adminId: string,
  userId: string,
  changes?: Record<string, { old: any; new: any }>
) {
  const userData = await prepareUserWebhookPayload(userId)
  await emitWebhookEvent(
    adminId,
    WEBHOOK_EVENTS.USER_UPDATED,
    {
      user: userData,
    },
    changes ? { changes } : undefined
  )
}

/**
 * Emit user deleted event
 */
export async function emitUserDeleted(
  adminId: string,
  userId: string,
  userData: any
) {
  await emitWebhookEvent(adminId, WEBHOOK_EVENTS.USER_DELETED, {
    user: userData,
  })
}

/**
 * Emit booking created event
 */
export async function emitBookingCreated(adminId: string, bookingId: string) {
  const bookingData = await prepareBookingWebhookPayload(bookingId)
  await emitWebhookEvent(adminId, WEBHOOK_EVENTS.BOOKING_CREATED, {
    booking: bookingData,
  })
}

/**
 * Emit booking updated event
 */
export async function emitBookingUpdated(
  adminId: string,
  bookingId: string,
  changes?: Record<string, { old: any; new: any }>
) {
  const bookingData = await prepareBookingWebhookPayload(bookingId)
  await emitWebhookEvent(
    adminId,
    WEBHOOK_EVENTS.BOOKING_UPDATED,
    {
      booking: bookingData,
    },
    changes ? { changes } : undefined
  )
}

/**
 * Emit booking cancelled event
 */
export async function emitBookingCancelled(adminId: string, bookingId: string) {
  const bookingData = await prepareBookingWebhookPayload(bookingId)
  await emitWebhookEvent(adminId, WEBHOOK_EVENTS.BOOKING_CANCELLED, {
    booking: bookingData,
  })
}

/**
 * Emit booking completed event
 */
export async function emitBookingCompleted(adminId: string, bookingId: string) {
  const bookingData = await prepareBookingWebhookPayload(bookingId)
  await emitWebhookEvent(adminId, WEBHOOK_EVENTS.BOOKING_COMPLETED, {
    booking: bookingData,
  })
}

/**
 * Emit QR code created event
 */
export async function emitQRCreated(adminId: string, qrCodeId: string) {
  const qrData = await prepareQRCodeWebhookPayload(qrCodeId)
  await emitWebhookEvent(adminId, WEBHOOK_EVENTS.QR_CREATED, {
    qrCode: qrData,
  })
}

/**
 * Emit QR code scanned event
 */
export async function emitQRScanned(
  adminId: string,
  qrCodeId: string,
  scannerId?: string
) {
  const qrData = await prepareQRCodeWebhookPayload(qrCodeId)
  await emitWebhookEvent(
    adminId,
    WEBHOOK_EVENTS.QR_SCANNED,
    {
      qrCode: qrData,
    },
    scannerId ? { scannedBy: scannerId } : undefined
  )
}

/**
 * Emit QR code validated event
 */
export async function emitQRValidated(adminId: string, qrCodeId: string) {
  const qrData = await prepareQRCodeWebhookPayload(qrCodeId)
  await emitWebhookEvent(adminId, WEBHOOK_EVENTS.QR_VALIDATED, {
    qrCode: qrData,
  })
}

/**
 * Emit tag added event
 */
export async function emitTagAdded(
  adminId: string,
  userId: string,
  tagId: string,
  tagName: string
) {
  const userData = await prepareUserWebhookPayload(userId)
  await emitWebhookEvent(
    adminId,
    WEBHOOK_EVENTS.TAG_ADDED,
    {
      user: userData,
    },
    {
      tag: { id: tagId, name: tagName },
    }
  )
}

/**
 * Emit tag removed event
 */
export async function emitTagRemoved(
  adminId: string,
  userId: string,
  tagId: string,
  tagName: string
) {
  const userData = await prepareUserWebhookPayload(userId)
  await emitWebhookEvent(
    adminId,
    WEBHOOK_EVENTS.TAG_REMOVED,
    {
      user: userData,
    },
    {
      tag: { id: tagId, name: tagName },
    }
  )
}

/**
 * Emit custom field updated event
 */
export async function emitCustomFieldUpdated(
  adminId: string,
  userId: string,
  fieldName: string,
  oldValue: any,
  newValue: any
) {
  const userData = await prepareUserWebhookPayload(userId)
  await emitWebhookEvent(
    adminId,
    WEBHOOK_EVENTS.CUSTOM_FIELD_UPDATED,
    {
      user: userData,
    },
    {
      field: fieldName,
      oldValue,
      newValue,
    }
  )
}
