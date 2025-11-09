import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth/session'
import { apiResponse } from '@/lib/utils/api-response'
import { verificationService } from '@/features/verification/services/VerificationService'

const verifyCodeSchema = z.object({
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format'),
  code: z.string().length(6, 'Code must be 6 digits'),
})

/**
 * POST /api/v1/verification/verify
 * Verify phone number with code
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()

    // Validate input
    const validated = verifyCodeSchema.parse(body)

    const result = await verificationService.verifyCode({
      adminId: user.id,
      ...validated,
    })

    return apiResponse.success(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiResponse.validationError(error.errors[0].message)
    }
    if (
      error instanceof Error &&
      (error.message === 'Invalid verification code' ||
        error.message === 'Verification code has expired' ||
        error.message === 'Too many failed attempts')
    ) {
      return apiResponse.error(error, 400)
    }
    return apiResponse.error(error)
  }
}
