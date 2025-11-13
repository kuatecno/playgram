import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'

const contactWebhookSchema = z.object({
  admin_id: z.string().min(1, 'Admin ID is required'),
  subscriber_id: z.union([z.string(), z.number()]),
})

/**
 * POST /api/manychat/webhook/contact
 * Incoming webhook from Manychat when a user interacts
 *
 * This is a lightweight endpoint that creates placeholder users
 * for later full sync via API polling.
 *
 * From Manychat automation:
 * External Request → POST https://playgram.kua.cl/api/manychat/webhook/contact
 * Body: { "admin_id": "{{admin_id}}", "subscriber_id": {{subscriber_id}} }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    const validated = contactWebhookSchema.parse(body)
    const subscriberId = String(validated.subscriber_id)

    // Check if admin/config exists
    const config = await db.manychatConfig.findUnique({
      where: { adminId: validated.admin_id },
    })

    if (!config || !config.isConnected) {
      return NextResponse.json(
        {
          success: false,
          error: 'Manychat not configured for this admin'
        },
        { status: 404 }
      )
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { manychatId: subscriberId },
    })

    if (existingUser) {
      // User exists, just update last interaction
      await db.user.update({
        where: { id: existingUser.id },
        data: { lastInteraction: new Date() },
      })

      return NextResponse.json({
        success: true,
        contact_id: existingUser.id,
        message: 'Contact already exists, updated last interaction',
      })
    }

    // Create placeholder user (minimal data)
    // Full sync will happen later via API polling
    const newUser = await db.user.create({
      data: {
        manychatId: subscriberId,
        firstName: null,
        lastName: null,
        igUsername: null,
        lastInteraction: new Date(),
        isSubscribed: true,
      },
    })

    return NextResponse.json({
      success: true,
      contact_id: newUser.id,
      message: 'Contact queued for sync',
    })
  } catch (error) {
    console.error('Incoming Manychat webhook error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid webhook payload',
          details: error.errors
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Webhook processing failed'
      },
      { status: 500 }
    )
  }
}
