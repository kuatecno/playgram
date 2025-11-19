import { NextRequest, NextResponse } from 'next/server'
import { apiResponse } from '@/lib/utils/api-response'
import { validateQRCode } from '@/features/qr-codes/services/QRValidationService'
import { db } from '@/lib/db'
import * as Sentry from '@sentry/nextjs'

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
  // Start Sentry transaction for performance monitoring
  return await Sentry.withServerActionInstrumentation(
    'qr-validate-webhook',
    {
      recordResponse: true,
    },
    async () => {
      try {
        const body = await request.json()

        // Add breadcrumb for incoming request
        Sentry.addBreadcrumb({
          category: 'webhook',
          message: 'QR validation request received',
          level: 'info',
          data: {
            hasQrCode: !!(body.qr_code || body.qrCode || body.code),
            hasSubscriberId: !!(body.subscriber_id || body.subscriberId || body.manychatId),
          },
        })

        // Extract QR code and subscriber ID from ManyChat payload
        const qrCode = body.qr_code || body.qrCode || body.code
        const subscriberId = body.subscriber_id || body.subscriberId || body.manychatId

        if (!qrCode) {
          Sentry.captureMessage('QR validation failed: Missing qr_code parameter', {
            level: 'warning',
            extra: { body },
          })
          return apiResponse.validationError('Missing qr_code parameter')
        }

        if (!subscriberId) {
          Sentry.captureMessage('QR validation failed: Missing subscriber_id parameter', {
            level: 'warning',
            extra: { body, qrCode },
          })
          return apiResponse.validationError('Missing subscriber_id parameter')
        }

        // Set Sentry context
        Sentry.setContext('qr_validation', {
          qrCode,
          subscriberId,
          requestBody: body,
        })

        // Find the user by ManyChat ID
        Sentry.addBreadcrumb({
          category: 'database',
          message: 'Looking up user by ManyChat ID',
          data: { subscriberId },
        })

        const user = await db.user.findFirst({
          where: { manychatId: subscriberId },
          select: {
            id: true,
            manychatId: true,
          },
        })

        if (!user) {
          Sentry.captureMessage('QR validation failed: User not found', {
            level: 'warning',
            extra: { subscriberId, qrCode },
          })
          return apiResponse.validationError('User not found')
        }

        Sentry.setUser({ id: user.id })

        // Find the QR code to get the admin
        Sentry.addBreadcrumb({
          category: 'database',
          message: 'Looking up QR code',
          data: { qrCode },
        })

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
          Sentry.captureMessage('QR validation failed: QR code not found', {
            level: 'warning',
            extra: { qrCode, subscriberId, userId: user.id },
          })
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
        Sentry.addBreadcrumb({
          category: 'validation',
          message: 'Starting QR code validation',
          data: { qrCode, userId: user.id, adminId },
        })

        const validationResult = await validateQRCode(
          {
            qrCode,
            userId: user.id,
            manychatId: subscriberId,
            metadata: body,
          },
          adminId
        )

        // Track validation outcome
        Sentry.addBreadcrumb({
          category: 'validation',
          message: `QR validation completed: ${validationResult.outcome}`,
          level: validationResult.success ? 'info' : 'warning',
          data: {
            outcome: validationResult.outcome,
            failureReason: validationResult.failureReason,
            fieldsUpdated: validationResult.fieldsUpdated,
            tagsApplied: validationResult.tagsApplied,
            errorCount: validationResult.errors.length,
          },
        })

        // Capture failed validations as warnings in Sentry
        if (!validationResult.success) {
          Sentry.captureMessage(`QR validation failed: ${validationResult.failureReason || 'unknown'}`, {
            level: 'warning',
            extra: {
              qrCode,
              userId: user.id,
              subscriberId,
              outcome: validationResult.outcome,
              failureReason: validationResult.failureReason,
              errors: validationResult.errors,
            },
          })
        }

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
        // Capture exception in Sentry with full context
        Sentry.captureException(error, {
          level: 'error',
          extra: {
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            errorStack: error instanceof Error ? error.stack : undefined,
          },
        })

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
  )
}

async function getQRScanCount(qrCodeId: string): Promise<number> {
  const qr = await db.qRCode.findUnique({
    where: { id: qrCodeId },
    select: { scanCount: true },
  })
  return qr?.scanCount || 0
}
