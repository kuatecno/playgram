import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth/session'
import { apiResponse } from '@/lib/utils/api-response'
import { verificationService } from '@/features/verification/services/VerificationService'

const generateCodeSchema = z.object({
  apiKeyId: z.string(),
  sessionId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
})

/**
 * POST /api/v1/verification/send
 * Generate Instagram verification code
 * Used by external websites to request verification codes
 */
export async function POST(request: NextRequest) {
  try {
    await requireAuth()
    const body = await request.json()

    // Validate input
    const validated = generateCodeSchema.parse(body)

    const result = await verificationService.generateVerificationCode(validated)

    return apiResponse.success(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiResponse.validationError(error.errors[0].message)
    }
    return apiResponse.error(error)
  }
}
