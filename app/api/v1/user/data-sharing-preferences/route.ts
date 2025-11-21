import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { apiResponse } from '@/lib/utils/api-response'
import { z } from 'zod'
import {
  updateUserDataSharingPreferences,
  getUserDataSharingPreferences,
} from '@/features/verification/services/UserDataFilterService'

const UpdatePreferencesSchema = z.object({
  manychat_user_id: z.string().min(1),
  preferences: z.object({
    shareFirstName: z.boolean().optional(),
    shareLastName: z.boolean().optional(),
    shareFullName: z.boolean().optional(),
    shareProfilePic: z.boolean().optional(),
    shareIgUsername: z.boolean().optional(),
    shareFollowerCount: z.boolean().optional(),
    shareEmail: z.boolean().optional(),
    sharePhone: z.boolean().optional(),
    shareCustomFields: z.record(z.string(), z.boolean()).optional(),
  }),
})

/**
 * GET /api/v1/user/data-sharing-preferences
 * Get user's current data sharing preferences
 * 
 * Query params:
 * - manychat_user_id: User's ManyChat subscriber ID
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const manychatUserId = searchParams.get('manychat_user_id')

    if (!manychatUserId) {
      return apiResponse.validationError('Missing manychat_user_id parameter')
    }

    // Find user by ManyChat ID
    const user = await db.user.findUnique({
      where: { manychatId: manychatUserId },
      select: { id: true },
    })

    if (!user) {
      return apiResponse.validationError('User not found')
    }

    const preferences = await getUserDataSharingPreferences(user.id)

    return apiResponse.success({
      preferences,
    })
  } catch (error) {
    console.error('Error fetching data sharing preferences:', error)
    return apiResponse.error(error)
  }
}

/**
 * POST /api/v1/user/data-sharing-preferences
 * Update user's data sharing preferences
 * 
 * Body:
 * - manychat_user_id: User's ManyChat subscriber ID
 * - preferences: Object with boolean flags for each field
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = UpdatePreferencesSchema.parse(body)

    // Find user by ManyChat ID
    const user = await db.user.findUnique({
      where: { manychatId: validated.manychat_user_id },
      select: { id: true },
    })

    if (!user) {
      return apiResponse.validationError('User not found')
    }

    // Update preferences
    await updateUserDataSharingPreferences(user.id, validated.preferences)

    // Return updated preferences
    const updatedPreferences = await getUserDataSharingPreferences(user.id)

    return apiResponse.success({
      message: 'Data sharing preferences updated successfully',
      preferences: updatedPreferences,
    })
  } catch (error) {
    console.error('Error updating data sharing preferences:', error)

    if (error instanceof z.ZodError) {
      return apiResponse.validationError('Invalid request data')
    }

    return apiResponse.error(error)
  }
}

