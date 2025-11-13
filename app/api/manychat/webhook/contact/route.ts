import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { emitUserCreated, emitUserUpdated } from '@/lib/webhooks/webhook-events'

// Comprehensive schema for full subscriber_data from Manychat
const fullSubscriberDataSchema = z.object({
  admin_id: z.string().min(1, 'Admin ID is required'),
  subscriber_data: z.object({
    id: z.union([z.string(), z.number()]),
    first_name: z.string().optional().nullable(),
    last_name: z.string().optional().nullable(),
    profile_pic: z.string().url().optional().nullable(),
    instagram_username: z.string().optional().nullable(),
    custom_fields: z.record(z.any()).optional().nullable(),
    tags: z.array(z.object({
      id: z.union([z.string(), z.number()]),
      name: z.string(),
    })).optional().nullable(),
  }),
})

// Backward compatible minimal schema (old format)
const minimalContactWebhookSchema = z.object({
  admin_id: z.string().min(1, 'Admin ID is required'),
  subscriber_id: z.union([z.string(), z.number()]),
})

/**
 * POST /api/manychat/webhook/contact
 * Incoming webhook from Manychat when a user interacts
 *
 * Supports two formats:
 * 1. Full subscriber_data: { "admin_id": "...", "subscriber_data": {...} }
 * 2. Minimal (legacy): { "admin_id": "...", "subscriber_id": "..." }
 *
 * From Manychat automation:
 * External Request → POST https://playgram.kua.cl/api/manychat/webhook/contact
 * Body: { "admin_id": "{{admin_id}}", "subscriber_data": {{subscriber_data|to_json:true}} }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Try to parse as full subscriber_data first, fall back to minimal
    let adminId: string
    let subscriberId: string
    let fullData: any = null

    const fullParse = fullSubscriberDataSchema.safeParse(body)
    if (fullParse.success) {
      adminId = fullParse.data.admin_id
      subscriberId = String(fullParse.data.subscriber_data.id)
      fullData = fullParse.data.subscriber_data
    } else {
      // Try minimal schema
      const minimalParse = minimalContactWebhookSchema.safeParse(body)
      if (!minimalParse.success) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid webhook payload',
            details: fullParse.error.errors
          },
          { status: 400 }
        )
      }
      adminId = minimalParse.data.admin_id
      subscriberId = String(minimalParse.data.subscriber_id)
    }

    // Check if admin/config exists
    const config = await db.manychatConfig.findUnique({
      where: { adminId },
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

    if (fullData) {
      // Process full subscriber data
      return await processFullSubscriberData(existingUser, subscriberId, fullData, adminId)
    } else {
      // Legacy minimal format - create placeholder
      if (existingUser) {
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
    }
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

/**
 * Process full subscriber_data from Manychat webhook
 */
async function processFullSubscriberData(
  existingUser: any,
  subscriberId: string,
  subscriberData: any,
  adminId: string
) {
  const isNewUser = !existingUser

  // Prepare user data
  const userData = {
    manychatId: subscriberId,
    firstName: subscriberData.first_name || null,
    lastName: subscriberData.last_name || null,
    igUsername: subscriberData.instagram_username || null,
    profilePicUrl: subscriberData.profile_pic || null,
    lastInteraction: new Date(),
    isSubscribed: true,
  }

  let user: any

  if (isNewUser) {
    // Create new user
    user = await db.user.create({
      data: userData,
    })
  } else {
    // Track changes for webhook emission
    const changes: Record<string, { old: any; new: any }> = {}
    if (subscriberData.first_name && subscriberData.first_name !== existingUser.firstName) {
      changes.firstName = { old: existingUser.firstName, new: subscriberData.first_name }
    }
    if (subscriberData.last_name && subscriberData.last_name !== existingUser.lastName) {
      changes.lastName = { old: existingUser.lastName, new: subscriberData.last_name }
    }
    if (subscriberData.instagram_username && subscriberData.instagram_username !== existingUser.igUsername) {
      changes.igUsername = { old: existingUser.igUsername, new: subscriberData.instagram_username }
    }

    // Update existing user
    user = await db.user.update({
      where: { id: existingUser.id },
      data: userData,
    })

    // Emit user updated webhook if there were changes
    if (Object.keys(changes).length > 0) {
      emitUserUpdated(adminId, user.id, changes).catch((error) => {
        console.error('Failed to emit user updated webhook:', error)
      })
    }
  }

  // Process tags if present
  if (subscriberData.tags && Array.isArray(subscriberData.tags)) {
    await processTags(user.id, subscriberData.tags, adminId)
  }

  // Process custom fields if present
  if (subscriberData.custom_fields && typeof subscriberData.custom_fields === 'object') {
    await processCustomFields(user.id, subscriberData.custom_fields)
  }

  // Emit user created webhook for new users
  if (isNewUser) {
    emitUserCreated(adminId, user.id).catch((error) => {
      console.error('Failed to emit user created webhook:', error)
    })
  }

  return NextResponse.json({
    success: true,
    contact_id: user.id,
    message: isNewUser ? 'Contact created with full data' : 'Contact updated with full data',
    tags_synced: subscriberData.tags?.length || 0,
    custom_fields_synced: Object.keys(subscriberData.custom_fields || {}).length,
  })
}

/**
 * Process and sync tags for a user
 */
async function processTags(userId: string, tags: Array<{ id: string | number; name: string }>, adminId: string) {
  for (const tag of tags) {
    const tagId = String(tag.id)

    // Find or create tag
    let dbTag = await db.tag.findUnique({
      where: { manychatId: tagId },
    })

    if (!dbTag) {
      // Create new tag
      dbTag = await db.tag.create({
        data: {
          name: tag.name,
          manychatId: tagId,
          adminId,
        },
      })
    }

    // Create user-tag relationship if it doesn't exist
    await db.user.update({
      where: { id: userId },
      data: {
        tags: {
          connect: { id: dbTag.id },
        },
      },
    }).catch(() => {
      // Ignore if relationship already exists
    })
  }
}

/**
 * Process and sync custom fields for a user
 */
async function processCustomFields(userId: string, customFields: Record<string, any>) {
  for (const [fieldName, fieldValue] of Object.entries(customFields)) {
    if (fieldValue === null || fieldValue === undefined) continue

    // Find or create custom field definition
    // Note: CustomField is global (no adminId in schema)
    let field = await db.customField.findFirst({
      where: {
        name: fieldName,
      },
    })

    if (!field) {
      // Create new custom field
      field = await db.customField.create({
        data: {
          name: fieldName,
          fieldType: typeof fieldValue === 'number' ? 'number' : 'text',
        },
      })
    }

    // Store/update custom field value
    await db.customFieldValue.upsert({
      where: {
        userId_fieldId: {
          userId,
          fieldId: field.id,
        },
      },
      create: {
        userId,
        fieldId: field.id,
        value: String(fieldValue),
      },
      update: {
        value: String(fieldValue),
        updatedAt: new Date(),
      },
    })
  }
}
