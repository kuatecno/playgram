import { NextRequest, NextResponse } from 'next/server'
import { apiResponse } from '@/lib/utils/api-response'
import { validateQRCode } from '@/features/qr-codes/services/QRValidationService'
import { db } from '@/lib/db'

/**
 * POST /api/v1/webhooks/qr-validate
 *
 * ManyChat External Request endpoint for QR code validation
 *
 * Expected payload from ManyChat:
 * {
 *   "qr_code": "PROMO-123456",
 *   "subscriber_id": "1234567890"  // ManyChat subscriber ID
 * }
 *
 * Returns:
 * {
 *   "success": true,
 *   "outcome": "validated_success" | "validated_failed",
 *   "message": "QR code validated successfully",
 *   "data": {
 *     "qr_code": "PROMO-123456",
 *     "scan_count": 5,
 *     "fields_updated": 3,
 *     "tags_applied": 2
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Extract QR code and subscriber ID from ManyChat payload
    const qrCode = body.qr_code || body.qrCode || body.code
    const subscriberId = body.subscriber_id || body.subscriberId || body.manychatId

    if (!qrCode) {
      return apiResponse.validationError('Missing qr_code parameter')
    }

    if (!subscriberId) {
      return apiResponse.validationError('Missing subscriber_id parameter')
    }

    // Find the user by ManyChat ID to get the admin
    const user = await db.user.findFirst({
      where: { manychatId: subscriberId },
      select: {
        id: true,
        manychatId: true,
      },
    })

    if (!user) {
      return apiResponse.validationError('User not found')
    }

    // Find the QR code to get the admin
    const qrRecord = await db.qRCode.findUnique({
      where: { code: qrCode },
      include: {
        tool: {
          select: {
            adminId: true,
          },
        },
      },
    })

    if (!qrRecord) {
      return NextResponse.json({
        success: false,
        outcome: 'validated_failed',
        message: 'QR code not found',
        data: {
          qr_code: qrCode,
          failure_reason: 'not_found',
        },
      })
    }

    const adminId = qrRecord.tool.adminId

    // Validate the QR code
    const validationResult = await validateQRCode(
      {
        qrCode,
        userId: user.id,
        manychatId: subscriberId,
        metadata: body,
      },
      adminId
    )

    // Return response in a format ManyChat can handle
    return NextResponse.json({
      success: validationResult.success,
      outcome: validationResult.outcome,
      message: validationResult.message,
      data: {
        qr_code: qrCode,
        scan_count: validationResult.qrCodeId ? await getQRScanCount(validationResult.qrCodeId) : 0,
        fields_updated: validationResult.fieldsUpdated,
        tags_applied: validationResult.tagsApplied,
        failure_reason: validationResult.failureReason || null,
        errors: validationResult.errors.length > 0 ? validationResult.errors : undefined,
      },
    })
  } catch (error) {
    console.error('QR validation webhook error:', error)
    return NextResponse.json({
      success: false,
      outcome: 'validated_failed',
      message: 'An error occurred during validation',
      data: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    })
  }
}

async function getQRScanCount(qrCodeId: string): Promise<number> {
  const qr = await db.qRCode.findUnique({
    where: { id: qrCodeId },
    select: { scanCount: true },
  })
  return qr?.scanCount || 0
}
