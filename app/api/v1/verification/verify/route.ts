import { NextRequest } from 'next/server'
import { z } from 'zod'
import { apiResponse } from '@/lib/utils/api-response'
import { verificationService } from '@/features/verification/services/VerificationService'

const validateCodeSchema = z.object({
  code: z.string().length(6, 'Code must be 6 digits'),
  igUsername: z.string().min(1, 'Instagram username is required'),
})

/**
 * POST /api/v1/verification/verify
 * Validate Instagram verification code
 * Called when user sends verification code via Instagram DM
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    const validated = validateCodeSchema.parse(body)

    const result = await verificationService.validateVerificationCode(validated)

    if (!result.success) {
      return apiResponse.error(new Error(result.message), 400)
    }

    return apiResponse.success(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiResponse.validationError(error.errors[0].message)
    }
    return apiResponse.error(error)
  }
}
