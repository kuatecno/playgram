import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth/session'
import { apiResponse } from '@/lib/utils/api-response'
import { verificationService } from '@/features/verification/services/VerificationService'

const sendVerificationSchema = z.object({
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format'),
  userId: z.string().optional(),
  purpose: z.string().optional(),
})

/**
 * POST /api/v1/verification/send
 * Send verification code to phone number
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()

    // Validate input
    const validated = sendVerificationSchema.parse(body)

    const result = await verificationService.sendVerification({
      adminId: user.id,
      ...validated,
    })

    return apiResponse.success(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiResponse.validationError(error.errors[0].message)
    }
    return apiResponse.error(error)
  }
}
