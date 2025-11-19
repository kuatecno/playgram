import { QRFieldKey } from '@/features/qr-codes/services/QRFieldMapping'

export type SyncTiming = 'never' | 'scan' | 'validation' | 'both'

export const SYNC_TIMING_OPTIONS: { value: SyncTiming; label: string }[] = [
  { value: 'never', label: 'Never (Disabled)' },
  { value: 'scan', label: 'On Scan' },
  { value: 'validation', label: 'On Validation' },
  { value: 'both', label: 'On Scan & Validation' },
]

export interface FieldMappingRow {
  qrField: QRFieldKey
  manychatFieldId: string | null
  manychatFieldName: string | null
  syncTiming: SyncTiming
  enabled: boolean // Kept for backward compatibility, derived from syncTiming !== 'never'
}

export const CORE_VALIDATION_STATUS_FIELD = {
  key: 'core_validation_status',
  label: 'Validation Status',
  description: 'Core status of the validation (SUCCESS, FAILURE, etc.)',
  dataType: 'text',
} as const

export function generateDefaultFieldName(toolName: string, fieldKey: string): string {
  const sanitizedToolName = toolName.toLowerCase().replace(/[^a-z0-9]/g, '_')
  const sanitizedFieldKey = fieldKey.replace('qr_', '')
  return `playgram_${sanitizedToolName}_${sanitizedFieldKey}`
}
