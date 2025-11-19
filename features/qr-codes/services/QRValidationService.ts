import { db } from '@/lib/db'
import { manychatService } from '@/features/manychat/services/ManychatService'
import { qrToolConfigService, type QRValidationOutcome, type QRFailureReason } from './QRToolConfigService'
import { syncQRDataToManychat } from './QRManychatSync'

export interface QRValidationRequest {
  qrCode: string
  userId: string // ManyChat user ID or internal user ID
  manychatId?: string // If different from userId
  metadata?: Record<string, any>
}

export interface QRValidationResult {
  success: boolean
  outcome: QRValidationOutcome
  failureReason?: QRFailureReason
  message: string
  qrCodeId?: string
  fieldsUpdated: number
  tagsApplied: number
  errors: string[]
}

/**
 * Validate a QR code and apply outcome-based field mappings and tags
 */
export async function validateQRCode(
  request: QRValidationRequest,
  adminId: string
): Promise<QRValidationResult> {
  const result: QRValidationResult = {
    success: false,
    outcome: 'validated_failed',
    failureReason: 'other',
    message: 'Validation failed',
    fieldsUpdated: 0,
    tagsApplied: 0,
    errors: [],
  }

  try {
    // 1. Find the QR code
    const qrCode = await db.qRCode.findUnique({
      where: { code: request.qrCode },
      include: {
        tool: {
          include: {
            qrConfig: true,
          },
        },
        user: {
          select: {
            id: true,
            manychatId: true,
            firstName: true,
            lastName: true,
            igUsername: true,
          },
        },
      },
    })

    if (!qrCode) {
      result.outcome = 'validated_failed'
      result.failureReason = 'other'
      result.message = 'QR code not found'
      return result
    }

    result.qrCodeId = qrCode.id

    // 2. Check if expired
    if (qrCode.expiresAt && new Date(qrCode.expiresAt) < new Date()) {
      result.outcome = 'validated_failed'
      result.failureReason = 'expired'
      result.message = 'QR code has expired'
      await triggerSync(qrCode, result, request.manychatId || request.userId, adminId)
      return result
    }

    // 3. Check if correct person (if QR is assigned to a user)
    if (qrCode.userId) {
      const user = qrCode.user
      const providedManychatId = request.manychatId || request.userId

      if (user && user.manychatId !== providedManychatId) {
        result.outcome = 'validated_failed'
        result.failureReason = 'wrong_person'
        result.message = 'This QR code belongs to a different user'
        await triggerSync(qrCode, result, providedManychatId, adminId)
        return result
      }
    }

    // 4. Check if already used (based on scan count or custom logic)
    const maxScans = (qrCode.metadata as any)?.maxScans
    if (maxScans && qrCode.scanCount >= maxScans) {
      result.outcome = 'validated_failed'
      result.failureReason = 'already_used'
      result.message = 'QR code has already been used'
      await triggerSync(qrCode, result, request.manychatId || request.userId, adminId)
      return result
    }

    // 5. Success! Update scan count and scannedAt
    await db.qRCode.update({
      where: { id: qrCode.id },
      data: {
        scanCount: { increment: 1 },
        scannedAt: new Date(),
      },
    })

    result.outcome = 'validated_success'
    result.success = true
    result.message = 'QR code validated successfully'
    result.failureReason = undefined

    // 6. Apply outcome-based mappings and tags
    await triggerSync(qrCode, result, request.manychatId || request.userId, adminId)

    return result
  } catch (error: any) {
    result.errors.push(`Validation error: ${error.message}`)
    result.message = 'An error occurred during validation'
    return result
  }
}

/**
 * Helper to trigger sync via QRManychatSync service
 */
async function triggerSync(
  qrCode: any,
  validationResult: QRValidationResult,
  manychatId: string,
  adminId: string
) {
  // We need a userId for sync. If qrCode has one, use it.
  // If not, we might need to find the user by manychatId or just pass the manychatId if the service supported it.
  // Currently syncQRDataToManychat requires userId (internal DB ID).
  
  let userId = qrCode.userId
  if (!userId) {
    // Try to find user by manychatId
    const user = await db.user.findFirst({
      where: { manychatId },
      select: { id: true }
    })
    userId = user?.id
  }

  if (!userId) {
    validationResult.errors.push('Could not find user for sync')
    return
  }

  const syncResult = await syncQRDataToManychat({
    qrCodeId: qrCode.id,
    userId,
    adminId,
    trigger: 'validation',
    validationResult: {
      outcome: validationResult.outcome,
      failureReason: validationResult.failureReason
    }
  })

  validationResult.fieldsUpdated = syncResult.syncedFields
  if (syncResult.errors.length > 0) {
    validationResult.errors.push(...syncResult.errors)
  }
}

/**
 * Record QR code as sent (for when QR is generated/sent to user)
 */
export async function recordQRCodeSent(
  qrCodeId: string,
  manychatId: string,
  adminId: string
): Promise<QRValidationResult> {
  const result: QRValidationResult = {
    success: false,
    outcome: 'sent',
    message: 'QR code sent recorded',
    fieldsUpdated: 0,
    tagsApplied: 0,
    errors: [],
  }

  try {
    const qrCode = await db.qRCode.findUnique({
      where: { id: qrCodeId },
      include: {
        tool: {
          include: {
            qrConfig: true,
          },
        },
        user: {
          select: {
            id: true,
            manychatId: true,
            firstName: true,
            lastName: true,
            igUsername: true,
          },
        },
      },
    })

    if (!qrCode) {
      result.message = 'QR code not found'
      return result
    }

    result.qrCodeId = qrCode.id
    result.success = true

    // Apply outcome-based mappings for 'sent' outcome
    await triggerSync(qrCode, result, manychatId, adminId)

    return result
  } catch (error: any) {
    result.errors.push(`Error recording QR sent: ${error.message}`)
    result.message = 'Failed to record QR sent'
    return result
  }
}
