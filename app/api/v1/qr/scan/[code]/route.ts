import { NextRequest } from 'next/server'
import { apiResponse } from '@/lib/utils/api-response'
import { qrCodeService } from '@/features/qr-codes/services/QRCodeService'

/**
 * GET /api/v1/qr/scan/:code
 * Public endpoint to scan a QR code
 *
 * Optional query params:
 * - userId: User ID if scanning is authenticated
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params
    const { searchParams } = request.nextUrl
    const userId = searchParams.get('userId') || undefined

    const result = await qrCodeService.scanQRCode(code, userId)

    if (!result.valid) {
      return apiResponse.error(new Error(result.message), 400)
    }

    return apiResponse.success({
      valid: result.valid,
      message: result.message,
      type: result.qrCode.qrType,
      data: result.qrCode.metadata,
      scan: {
        id: result.scan.id,
        scannedAt: result.scan.scannedAt,
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'QR code not found') {
      return apiResponse.notFound('QR code not found')
    }
    return apiResponse.error(error)
  }
}
