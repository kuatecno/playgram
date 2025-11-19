import { db } from '@/lib/db'
import { getQRFieldMappings, extractQRCodeData } from './QRFieldMapping'
import { manychatService } from '@/features/manychat/services/ManychatService'

export interface SyncResult {
  success: boolean
  syncedFields: number
  errors: string[]
  manychatId?: string
}

export interface SyncOptions {
  qrCodeId: string
  userId: string
  adminId: string
  trigger: 'scan' | 'validation'
  validationResult?: {
    outcome: 'sent' | 'validated_success' | 'validated_failed'
    failureReason?: string
  }
}

/**
 * Sync QR code data to Manychat custom fields
 */
export async function syncQRDataToManychat(options: SyncOptions): Promise<SyncResult> {
  const { qrCodeId, userId, adminId, trigger, validationResult } = options

  const result: SyncResult = {
    success: false,
    syncedFields: 0,
    errors: [],
  }

  try {
    // 1. Get QR code with tool info
    const qrCode = await db.qRCode.findUnique({
      where: { id: qrCodeId },
      include: {
        tool: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!qrCode || !qrCode.tool) {
      result.errors.push('QR code or tool not found')
      return result
    }

    // 2. Get field mapping config for this tool
    const mappingConfig = await getQRFieldMappings(qrCode.tool.id)

    if (!mappingConfig) {
      result.success = true
      return result
    }

    // 3. Get user's Manychat ID
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { manychatId: true },
    })

    if (!user?.manychatId) {
      result.errors.push('User does not have a Manychat ID')
      return result
    }

    result.manychatId = user.manychatId

    // 4. Verify Manychat is configured
    const apiToken = await manychatService.getApiToken(adminId)
    if (!apiToken) {
      result.errors.push('Manychat API token not configured')
      return result
    }

    // 5. Create sync log FIRST
    const syncLog = await db.$transaction(async (tx) => {
      return await tx.qRSyncLog.create({
        data: {
          qrCodeId: qrCode.id,
          userId,
          trigger,
          success: false,
          syncedFields: 0,
          errors: null,
          timestamp: new Date(),
        },
      })
    })

    // 6. Extract QR code data
    const qrData = extractQRCodeData(qrCode, qrCode.tool)

    // Add core validation status if available
    if (validationResult) {
      let status = 'UNKNOWN'
      if (validationResult.outcome === 'validated_success') status = 'SUCCESS'
      else if (validationResult.outcome === 'validated_failed') {
        status = validationResult.failureReason ? validationResult.failureReason.toUpperCase() : 'FAILURE'
      } else if (validationResult.outcome === 'sent') status = 'SENT'
      
      qrData['core_validation_status'] = status
    }

    // 7. Sync standard field mappings
    const enabledMappings = mappingConfig.mappings.filter((m) => {
      if (!m.enabled) return false
      
      // Check sync timing
      const timing = m.syncTiming || (mappingConfig.autoSyncOnScan ? 'scan' : 'never') // Fallback for legacy
      
      if (timing === 'both') return true
      if (timing === 'scan' && trigger === 'scan') return true
      if (timing === 'validation' && trigger === 'validation') return true
      
      return false
    })

    for (const mapping of enabledMappings) {
      try {
        const qrValue = qrData[mapping.qrField]

        // Skip null/undefined values
        if (qrValue === null || qrValue === undefined) {
          continue
        }

        // Convert value to appropriate format
        let syncValue: any = qrValue

        // Convert booleans to 1/0 or true/false strings based on Manychat field type
        if (typeof qrValue === 'boolean') {
          syncValue = qrValue ? 1 : 0
        }

        // Sync to Manychat
        await manychatService.setCustomField(
          adminId,
          user.manychatId,
          mapping.manychatFieldId,
          syncValue
        )

        result.syncedFields++
      } catch (error: any) {
        result.errors.push(
          `Failed to sync ${mapping.qrField} to ${mapping.manychatFieldName}: ${error.message}`
        )
      }
    }

    // 8. Sync outcome-based field mappings (only on validation)
    if (trigger === 'validation' && validationResult && mappingConfig.outcomeFieldMappings) {
      const outcomeMappings = mappingConfig.outcomeFieldMappings.filter(m => 
        m.enabled && 
        m.outcome === validationResult.outcome &&
        (!m.failureReason || m.failureReason === validationResult.failureReason)
      )

      for (const mapping of outcomeMappings) {
        try {
          // Resolve tokens in value
          let value = mapping.value
          // Simple token replacement
          Object.entries(qrData).forEach(([key, val]) => {
             value = value.replace(new RegExp(`{{${key}}}`, 'g'), String(val))
          })

          await manychatService.setCustomField(
            adminId,
            user.manychatId,
            mapping.manychatFieldId,
            value
          )
          result.syncedFields++
        } catch (error: any) {
          result.errors.push(
            `Failed to sync outcome field ${mapping.manychatFieldName}: ${error.message}`
          )
        }
      }
    }

    // 9. Apply tag automations (only on validation)
    if (trigger === 'validation' && validationResult && mappingConfig.outcomeTagConfigs) {
      const tagConfigs = mappingConfig.outcomeTagConfigs.filter(c => 
        c.enabled && 
        c.outcome === validationResult.outcome &&
        (!c.failureReason || c.failureReason === validationResult.failureReason)
      )

      for (const config of tagConfigs) {
        try {
          for (const tagId of config.tagIds) {
            if (config.action === 'add') {
              await manychatService.addTag(adminId, user.manychatId, tagId)
            } else {
              await manychatService.removeTag(adminId, user.manychatId, tagId)
            }
          }
        } catch (error: any) {
          result.errors.push(
            `Failed to apply tag action ${config.action}: ${error.message}`
          )
        }
      }
    }

    // 10. Update sync log with results
    await db.qRSyncLog.update({
      where: { id: syncLog.id },
      data: {
        success: result.errors.length === 0,
        syncedFields: result.syncedFields,
        errors: result.errors.length > 0 ? JSON.stringify(result.errors) : null,
      },
    })

    result.success = result.errors.length === 0 && result.syncedFields > 0

    return result
  } catch (error: any) {
    result.errors.push(`Sync failed: ${error.message}`)

    // Still try to log the failure
    try {
      await db.qRSyncLog.create({
        data: {
          qrCodeId,
          userId,
          trigger,
          success: false,
          syncedFields: 0,
          errors: JSON.stringify(result.errors),
          timestamp: new Date(),
        },
      })
    } catch (logError) {
      console.error('Failed to log sync error:', logError)
    }

    return result
  }
}

/**
 * Get sync logs for a QR code
 */
export async function getQRSyncLogs(qrCodeId: string, adminId: string, limit = 50) {
  const logs = await db.qRSyncLog.findMany({
    where: {
      qrCodeId,
      qrCode: {
        tool: { adminId },
      },
    },
    orderBy: { timestamp: 'desc' },
    take: limit,
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
          igUsername: true,
        },
      },
    },
  })

  return logs.map((log) => ({
    id: log.id,
    timestamp: log.timestamp,
    trigger: log.trigger,
    success: log.success,
    syncedFields: log.syncedFields,
    errors: log.errors ? JSON.parse(log.errors) : [],
    user: log.user
      ? {
          name: `${log.user.firstName || ''} ${log.user.lastName || ''}`.trim(),
          username: log.user.igUsername,
        }
      : null,
  }))
}

/**
 * Get sync statistics for a tool
 */
export async function getQRSyncStats(toolId: string, adminId: string) {
  // Verify tool ownership
  const tool = await db.tool.findFirst({
    where: {
      id: toolId,
      adminId,
    },
  })

  if (!tool) {
    throw new Error('Tool not found')
  }

  // Total syncs
  const totalSyncs = await db.qRSyncLog.count({
    where: {
      qrCode: { toolId },
    },
  })

  // Successful syncs
  const successfulSyncs = await db.qRSyncLog.count({
    where: {
      qrCode: { toolId },
      success: true,
    },
  })

  // Failed syncs
  const failedSyncs = totalSyncs - successfulSyncs

  // Recent syncs (last 7 days)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const recentSyncs = await db.qRSyncLog.count({
    where: {
      qrCode: { toolId },
      timestamp: { gte: sevenDaysAgo },
    },
  })

  // Total fields synced
  const fieldStats = await db.qRSyncLog.aggregate({
    where: {
      qrCode: { toolId },
      success: true,
    },
    _sum: {
      syncedFields: true,
    },
  })

  return {
    totalSyncs,
    successfulSyncs,
    failedSyncs,
    recentSyncs,
    totalFieldsSynced: fieldStats._sum.syncedFields || 0,
    successRate: totalSyncs > 0 ? (successfulSyncs / totalSyncs) * 100 : 0,
  }
}
