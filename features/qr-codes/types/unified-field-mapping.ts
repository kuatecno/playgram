import { QRFieldKey } from '@/features/qr-codes/services/QRFieldMapping'

/**
 * Unified Field Mapping Types
 * Combines direct QR field mappings, custom outcome-based values, and tag automations
 */

// ============================================================================
// SYNC CONDITIONS
// ============================================================================

export type SyncTrigger = 'generation' | 'scan' | 'validation'
export type ValidationOutcome = 'success' | 'failed'
export type FailureReason = 'expired' | 'wrong_person' | 'already_used' | 'other'

export interface SyncCondition {
  trigger: SyncTrigger
  outcome?: ValidationOutcome  // Only for 'validation' trigger
  failureReasons?: FailureReason[]  // Only for outcome='failed'
}

export const SYNC_TRIGGER_OPTIONS = [
  { value: 'generation' as SyncTrigger, label: 'On QR Generation', description: 'When QR code is created' },
  { value: 'scan' as SyncTrigger, label: 'On Scan', description: 'When QR code is scanned' },
  { value: 'validation' as SyncTrigger, label: 'On Validation', description: 'When QR is validated' },
] as const

export const VALIDATION_OUTCOME_OPTIONS = [
  { value: 'success' as ValidationOutcome, label: 'Success', description: 'Validation passed', color: 'green' },
  { value: 'failed' as ValidationOutcome, label: 'Failed', description: 'Validation failed', color: 'red' },
] as const

export const FAILURE_REASON_OPTIONS = [
  { value: 'expired' as FailureReason, label: 'Expired', description: 'QR code has expired' },
  { value: 'wrong_person' as FailureReason, label: 'Wrong Person', description: 'QR belongs to different user' },
  { value: 'already_used' as FailureReason, label: 'Already Used', description: 'QR exceeded max scans' },
  { value: 'other' as FailureReason, label: 'Other', description: 'Generic failure reason' },
] as const

// ============================================================================
// VALUE TYPES
// ============================================================================

export type ValueType = 'qr_field' | 'custom'
export type TargetType = 'field' | 'tag'
export type TagAction = 'add' | 'remove'

export const VALUE_TYPE_OPTIONS = [
  { value: 'qr_field' as ValueType, label: 'Copy QR Field', description: 'Copy data from QR code field' },
  { value: 'custom' as ValueType, label: 'Custom Value', description: 'Set a custom value (supports tokens)' },
] as const

export const TARGET_TYPE_OPTIONS = [
  { value: 'field' as TargetType, label: 'Custom Field', description: 'ManyChat custom field' },
  { value: 'tag' as TargetType, label: 'Tag', description: 'ManyChat tag' },
] as const

export const TAG_ACTION_OPTIONS = [
  { value: 'add' as TagAction, label: 'Add Tag', description: 'Add tag to contact' },
  { value: 'remove' as TagAction, label: 'Remove Tag', description: 'Remove tag from contact' },
] as const

// ============================================================================
// UNIFIED FIELD MAPPING
// ============================================================================

export interface UnifiedFieldMapping {
  id: string
  enabled: boolean

  // Target (what to update in ManyChat)
  targetType: TargetType
  targetId: string  // ManyChat field ID or tag ID
  targetName: string  // Display name

  // Value source (what data to send)
  valueType: ValueType
  valueSource?: QRFieldKey  // Required if valueType='qr_field'
  customValue?: string  // Required if valueType='custom', supports tokens like {{qr_code}}

  // When to sync
  syncConditions: SyncCondition[]

  // Tag-specific (only if targetType='tag')
  tagAction?: TagAction
}

export interface UnifiedFieldMappingConfig {
  toolId: string
  mappings: UnifiedFieldMapping[]
  version: number  // Schema version for migrations
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if a mapping should sync for a given trigger and outcome
 */
export function shouldSyncMapping(
  mapping: UnifiedFieldMapping,
  trigger: SyncTrigger,
  outcome?: ValidationOutcome,
  failureReason?: FailureReason
): boolean {
  if (!mapping.enabled) return false

  return mapping.syncConditions.some(condition => {
    // Check trigger matches
    if (condition.trigger !== trigger) return false

    // If validation trigger, check outcome
    if (trigger === 'validation') {
      if (condition.outcome && condition.outcome !== outcome) return false

      // If failed outcome, check failure reason
      if (outcome === 'failed' && condition.failureReasons && condition.failureReasons.length > 0) {
        if (!failureReason || !condition.failureReasons.includes(failureReason)) {
          return false
        }
      }
    }

    return true
  })
}

/**
 * Replace tokens in custom value with actual data
 */
export function replaceTokens(
  customValue: string,
  qrData: Record<string, any>,
  userData?: Record<string, any>
): string {
  let result = customValue

  // Replace QR data tokens
  Object.keys(qrData).forEach(key => {
    const token = `{{${key}}}`
    if (result.includes(token)) {
      result = result.replace(new RegExp(token, 'g'), String(qrData[key] || ''))
    }
  })

  // Replace user data tokens
  if (userData) {
    Object.keys(userData).forEach(key => {
      const token = `{{${key}}}`
      if (result.includes(token)) {
        result = result.replace(new RegExp(token, 'g'), String(userData[key] || ''))
      }
    })
  }

  // Replace common tokens
  result = result.replace(/{{timestamp}}/g, Date.now().toString())
  result = result.replace(/{{date}}/g, new Date().toISOString().split('T')[0])
  result = result.replace(/{{datetime}}/g, new Date().toISOString())

  return result
}

/**
 * Generate default field name for ManyChat custom field
 */
export function generateDefaultFieldName(toolName: string, fieldKey: string): string {
  const sanitizedToolName = toolName.toLowerCase().replace(/[^a-z0-9]/g, '_')
  const sanitizedFieldKey = fieldKey.replace('qr_', '')
  return `playgram_${sanitizedToolName}_${sanitizedFieldKey}`
}

/**
 * Generate default tag name
 */
export function generateDefaultTagName(toolName: string, outcome: string, failureReason?: string): string {
  const sanitizedToolName = toolName.toLowerCase().replace(/[^a-z0-9]/g, '_')
  if (failureReason) {
    return `playgram_${sanitizedToolName}_${outcome}_${failureReason}`
  }
  return `playgram_${sanitizedToolName}_${outcome}`
}

/**
 * Create a simple sync condition
 */
export function createSyncCondition(
  trigger: SyncTrigger,
  outcome?: ValidationOutcome,
  failureReasons?: FailureReason[]
): SyncCondition {
  return {
    trigger,
    ...(outcome && { outcome }),
    ...(failureReasons && failureReasons.length > 0 && { failureReasons }),
  }
}

/**
 * Format sync conditions for display
 */
export function formatSyncConditions(conditions: SyncCondition[]): string {
  if (conditions.length === 0) return 'Never'

  return conditions.map(condition => {
    let label = SYNC_TRIGGER_OPTIONS.find(opt => opt.value === condition.trigger)?.label || condition.trigger

    if (condition.outcome) {
      const outcomeLabel = VALIDATION_OUTCOME_OPTIONS.find(opt => opt.value === condition.outcome)?.label
      label += ` (${outcomeLabel})`

      if (condition.outcome === 'failed' && condition.failureReasons && condition.failureReasons.length > 0) {
        const reasons = condition.failureReasons
          .map(r => FAILURE_REASON_OPTIONS.find(opt => opt.value === r)?.label)
          .join(', ')
        label += `: ${reasons}`
      }
    }

    return label
  }).join(', ')
}
