import { qrToolConfigService } from './QRToolConfigService'

/**
 * Available QR code fields that can be mapped to Manychat custom fields
 */
export const QR_AVAILABLE_FIELDS = [
  {
    key: 'qr_code',
    label: 'QR Code',
    description: 'The actual QR code value',
    dataType: 'text',
  },
  {
    key: 'qr_type',
    label: 'QR Type',
    description: 'Type of QR code (promotion, validation, discount, etc.)',
    dataType: 'text',
  },
  {
    key: 'qr_scanned_at',
    label: 'Scan Date/Time',
    description: 'When the QR code was scanned',
    dataType: 'datetime',
  },
  {
    key: 'qr_expires_at',
    label: 'Expiration Date',
    description: 'When the QR code expires',
    dataType: 'datetime',
  },
  {
    key: 'qr_is_valid',
    label: 'Is Valid',
    description: 'Whether the QR code is still valid',
    dataType: 'boolean',
  },
  {
    key: 'qr_label',
    label: 'Label',
    description: 'QR code label/name',
    dataType: 'text',
  },
  {
    key: 'qr_campaign',
    label: 'Campaign Name',
    description: 'Campaign or promotion name from metadata',
    dataType: 'text',
  },
  {
    key: 'qr_tool_name',
    label: 'Tool Name',
    description: 'Name of the tool that generated the QR code',
    dataType: 'text',
  },
  {
    key: 'qr_created_at',
    label: 'Creation Date',
    description: 'When the QR code was created',
    dataType: 'datetime',
  },
  {
    key: 'qr_scan_count',
    label: 'Scan Count',
    description: 'Number of times the QR code has been scanned',
    dataType: 'number',
  },
] as const

export type QRFieldKey = typeof QR_AVAILABLE_FIELDS[number]['key']

export interface QRFieldMapping {
  qrField: QRFieldKey
  manychatFieldId: string
  manychatFieldName: string
  enabled: boolean
}

export interface QRFieldMappingConfig {
  toolId: string
  mappings: QRFieldMapping[]
  autoSyncOnScan: boolean // Sync to Manychat when QR is scanned
  autoSyncOnValidation: boolean // Sync to Manychat when QR is validated
  outcomeFieldMappings?: import('./QRToolConfigService').QROutcomeFieldMapping[]
  outcomeTagConfigs?: import('./QRToolConfigService').QROutcomeTagConfig[]
}

/**
 * Get QR field mappings for a tool
 */
export async function getQRFieldMappings(toolId: string): Promise<QRFieldMappingConfig | null> {
  const config = await qrToolConfigService.getConfig(toolId)
  if (!config) {
    return null
  }

  const mappingConfig = qrToolConfigService.getFieldMappingConfig(config)
  const normalizedMappings = (mappingConfig.mappings || []).map((mapping) => ({
    ...mapping,
    qrField: mapping.qrField as QRFieldKey,
  }))

  return {
    toolId,
    mappings: normalizedMappings,
    autoSyncOnScan: mappingConfig.autoSyncOnScan,
    autoSyncOnValidation: mappingConfig.autoSyncOnValidation,
    outcomeFieldMappings: mappingConfig.outcomeFieldMappings || [],
    outcomeTagConfigs: mappingConfig.outcomeTagConfigs || [],
  }
}

/**
 * Save QR field mappings for a tool
 */
export async function saveQRFieldMappings(
  toolId: string,
  mappingConfig: Omit<QRFieldMappingConfig, 'toolId'>
): Promise<void> {
  await qrToolConfigService.updateConfig(toolId, {
    fieldMappings: {
      mappings: mappingConfig.mappings.map((mapping) => ({
        ...mapping,
      })),
      autoSyncOnScan: mappingConfig.autoSyncOnScan,
      autoSyncOnValidation: mappingConfig.autoSyncOnValidation,
      outcomeFieldMappings: mappingConfig.outcomeFieldMappings || [],
      outcomeTagConfigs: mappingConfig.outcomeTagConfigs || [],
    },
  })
}

/**
 * Generate suggested Manychat field name from QR field
 */
export function getSuggestedFieldName(qrFieldKey: QRFieldKey): string {
  // Remove qr_ prefix and add playgram_ prefix
  const baseKey = qrFieldKey.replace('qr_', '')
  return `playgram_qr_${baseKey}`
}

/**
 * Map Manychat field type from QR field data type
 */
export function getManychatFieldType(dataType: string): string {
  switch (dataType) {
    case 'text':
      return 'text'
    case 'datetime':
      return 'datetime'
    case 'boolean':
      return 'boolean'
    case 'number':
      return 'number'
    default:
      return 'text'
  }
}

/**
 * Extract QR code data for syncing to Manychat
 */
export function extractQRCodeData(qrCode: any, tool: any): Record<string, any> {
  const data: Record<string, any> = {}

  // Parse metadata if it's a string
  let metadata: any = {}
  if (qrCode.metadata) {
    try {
      metadata = typeof qrCode.metadata === 'string'
        ? JSON.parse(qrCode.metadata)
        : qrCode.metadata
    } catch (e) {
      console.error('Failed to parse QR metadata:', e)
    }
  }

  // Map all available fields
  data['qr_code'] = qrCode.code
  data['qr_type'] = qrCode.qrType
  data['qr_scanned_at'] = qrCode.scannedAt?.toISOString() || null
  data['qr_expires_at'] = qrCode.expiresAt?.toISOString() || null
  data['qr_is_valid'] = !qrCode.expiresAt || new Date(qrCode.expiresAt) > new Date()
  data['qr_label'] = metadata.label || null
  data['qr_campaign'] = metadata.campaign || metadata.campaign_name || null
  data['qr_tool_name'] = tool?.name || null
  data['qr_created_at'] = qrCode.createdAt?.toISOString() || null
  data['qr_scan_count'] = qrCode.scanCount || 0

  return data
}
