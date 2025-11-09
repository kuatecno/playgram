import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { apiResponse } from '@/lib/utils/api-response'
import { verificationService } from '@/features/verification/services/VerificationService'

/**
 * GET /api/v1/verification/stats
 * Get verification statistics for authenticated admin
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()

    const stats = await verificationService.getVerificationStats(user.id)

    return apiResponse.success(stats)
  } catch (error) {
    return apiResponse.error(error)
  }
}
