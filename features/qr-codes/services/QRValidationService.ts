import { db } from '@/lib/db'
import { manychatService } from '@/features/manychat/services/ManychatService'
import { qrToolConfigService, type QRValidationOutcome, type QRFailureReason } from './QRToolConfigService'

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
 * Token replacement for field values
 */
function replaceTokens(template: string, context: Record<string, any>): string {
  let result = template

  // Replace all tokens in the format {{token_name}}
  const tokenRegex = /\{\{([^}]+)\}\}/g
  result = result.replace(tokenRegex, (match, tokenName) => {
    const value = context[tokenName.trim()]
    if (value === undefined || value === null) {
      return match // Keep original if no value found
    }
    return String(value)
  })

  return result
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
      await applyOutcomeMappings(qrCode, result, request.manychatId || request.userId, adminId)
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
        await applyOutcomeMappings(qrCode, result, providedManychatId, adminId)
        return result
      }
    }

    // 4. Check if already used (based on scan count or custom logic)
    // This is a simple example - you might want more sophisticated logic
    const maxScans = (qrCode.metadata as any)?.maxScans
    if (maxScans && qrCode.scanCount >= maxScans) {
      result.outcome = 'validated_failed'
      result.failureReason = 'already_used'
      result.message = 'QR code has already been used'
      await applyOutcomeMappings(qrCode, result, request.manychatId || request.userId, adminId)
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
    await applyOutcomeMappings(qrCode, result, request.manychatId || request.userId, adminId)

    return result
  } catch (error: any) {
    result.errors.push(`Validation error: ${error.message}`)
    result.message = 'An error occurred during validation'
    return result
  }
}

/**
 * Apply field mappings and tags based on validation outcome
 */
async function applyOutcomeMappings(
  qrCode: any,
  validationResult: QRValidationResult,
  manychatId: string,
  adminId: string
): Promise<void> {
  try {
    const config = qrCode.tool?.qrConfig
    if (!config || !config.fieldMappings) {
      return
    }

    const mappingConfig = qrToolConfigService.getFieldMappingConfig(config)
    const outcomeFieldMappings = mappingConfig.outcomeFieldMappings || []
    const outcomeTagConfigs = mappingConfig.outcomeTagConfigs || []

    // Get API token
    const apiToken = await manychatService.getApiToken(adminId)
    if (!apiToken) {
      validationResult.errors.push('ManyChat not connected')
      return
    }

    // Prepare context for token replacement
    const context: Record<string, any> = {
      qr_code: qrCode.code,
      qr_type: qrCode.qrType,
      qr_scan_count: qrCode.scanCount + 1, // Include the new scan
      timestamp: Math.floor(Date.now() / 1000),
      date: new Date().toISOString().split('T')[0].replace(/-/g, ''),
      outcome: validationResult.outcome,
      failure_reason: validationResult.failureReason || '',
      message: validationResult.message,
    }

    // Add user info if available
    if (qrCode.user) {
      context.first_name = qrCode.user.firstName || ''
      context.last_name = qrCode.user.lastName || ''
      context.full_name = `${qrCode.user.firstName || ''} ${qrCode.user.lastName || ''}`.trim()
      context.igUsername = qrCode.user.igUsername || ''
    }

    // 1. Apply field mappings for this outcome
    const applicableMappings = outcomeFieldMappings.filter(
      (m) =>
        m.enabled &&
        m.outcome === validationResult.outcome &&
        (!m.failureReason || m.failureReason === validationResult.failureReason)
    )

    for (const mapping of applicableMappings) {
      try {
        const value = replaceTokens(mapping.value, context)
        await manychatService.setCustomFieldWithToken(
          apiToken,
          manychatId,
          mapping.manychatFieldId,
          value
        )
        validationResult.fieldsUpdated++
      } catch (error: any) {
        validationResult.errors.push(
          `Failed to set field ${mapping.manychatFieldName}: ${error.message}`
        )
      }
    }

    // 2. Apply tags for this outcome
    const applicableTags = outcomeTagConfigs.filter(
      (t) =>
        t.enabled &&
        t.outcome === validationResult.outcome &&
        (!t.failureReason || t.failureReason === validationResult.failureReason)
    )

    for (const tagConfig of applicableTags) {
      try {
        for (const tagId of tagConfig.tagIds) {
          if (tagConfig.action === 'add') {
            await manychatService.addTagToContact(adminId, manychatId, tagId)
          } else {
            await manychatService.removeTagFromContact(adminId, manychatId, tagId)
          }
          validationResult.tagsApplied++
        }
      } catch (error: any) {
        validationResult.errors.push(`Failed to apply tags: ${error.message}`)
      }
    }
  } catch (error: any) {
    validationResult.errors.push(`Failed to apply outcome mappings: ${error.message}`)
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
    await applyOutcomeMappings(qrCode, result, manychatId, adminId)

    return result
  } catch (error: any) {
    result.errors.push(`Error recording QR sent: ${error.message}`)
    result.message = 'Failed to record QR sent'
    return result
  }
}
