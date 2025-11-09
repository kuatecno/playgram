import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { apiResponse } from '@/lib/utils/api-response'
import { qrCodeService } from '@/features/qr-codes/services/QRCodeService'

/**
 * GET /api/v1/qr/stats
 * Get QR code statistics for authenticated admin
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()

    const stats = await qrCodeService.getQRCodeStats(user.id)

    return apiResponse.success(stats)
  } catch (error) {
    return apiResponse.error(error)
  }
}
