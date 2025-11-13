import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { apiResponse } from '@/lib/utils/api-response'
import { qrCodeService } from '@/features/qr-codes/services/QRCodeService'

/**
 * GET /api/v1/qr/stats
 * Get QR code statistics for authenticated admin
 * Optional query param: toolId - filter stats by specific tool
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = request.nextUrl

    const toolId = searchParams.get('toolId') || undefined

    const stats = await qrCodeService.getQRCodeStats(user.id, toolId)

    return apiResponse.success(stats)
  } catch (error) {
    return apiResponse.error(error)
  }
}
