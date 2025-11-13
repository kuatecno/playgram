/**
 * JSON Validation Utilities
 * Prevents corrupt or invalid JSON from being stored in database
 */

import { Prisma } from '@prisma/client'

/**
 * Validates and sanitizes a value for JSON storage
 * @param value - The value to validate
 * @param fieldName - Name of field (for error messages)
 * @returns Validated JSON value or throws error
 */
export function validateJsonField(
  value: unknown,
  fieldName: string = 'field'
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput {
  // Null is valid
  if (value === null || value === undefined) {
    return Prisma.JsonNull
  }

  // Check for circular references and invalid types
  try {
    // This will throw on circular references, undefined, functions, symbols, etc.
    const serialized = JSON.stringify(value)

    // Parse back to ensure it's valid JSON
    const parsed = JSON.parse(serialized)

    return parsed as Prisma.InputJsonValue
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('circular')) {
      throw new Error(`${fieldName} contains circular references`)
    }
    throw new Error(`${fieldName} is not valid JSON: ${error instanceof Error ? error.message : 'unknown error'}`)
  }
}

/**
 * Safely parses JSON with error handling
 * @param value - JSON value from database
 * @param defaultValue - Default to return if parsing fails
 * @returns Parsed value or default
 */
export function safeParseJson<T>(
  value: unknown,
  defaultValue: T
): T {
  if (value === null || value === undefined) {
    return defaultValue
  }

  // Already an object (from Prisma)
  if (typeof value === 'object') {
    return value as T
  }

  // String that needs parsing
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T
    } catch {
      return defaultValue
    }
  }

  return defaultValue
}

/**
 * Validates object structure matches expected shape
 * @param value - Value to validate
 * @param validator - Validation function
 * @param fieldName - Field name for error messages
 * @returns Validated object
 */
export function validateJsonStructure<T>(
  value: unknown,
  validator: (val: unknown) => val is T,
  fieldName: string = 'field'
): T {
  if (!validator(value)) {
    throw new Error(`${fieldName} does not match expected structure`)
  }
  return value
}

/**
 * Type guard for QR Appearance Settings
 */
export function isQRAppearanceSettings(value: unknown): value is {
  width?: number
  margin?: number
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
  darkColor?: string
  lightColor?: string
} {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const obj = value as Record<string, unknown>

  // Optional fields validation
  if (obj.width !== undefined && typeof obj.width !== 'number') return false
  if (obj.margin !== undefined && typeof obj.margin !== 'number') return false
  if (obj.errorCorrectionLevel !== undefined &&
      !['L', 'M', 'Q', 'H'].includes(obj.errorCorrectionLevel as string)) return false
  if (obj.darkColor !== undefined && typeof obj.darkColor !== 'string') return false
  if (obj.lightColor !== undefined && typeof obj.lightColor !== 'string') return false

  return true
}

/**
 * Type guard for QR Field Mapping Config
 */
export function isQRFieldMappingConfig(value: unknown): value is {
  mappings: Array<{
    qrField: string
    manychatFieldId: string
    manychatFieldName: string
    enabled: boolean
  }>
  autoSyncOnScan: boolean
  autoSyncOnValidation: boolean
} {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const obj = value as Record<string, unknown>

  // Required fields
  if (!Array.isArray(obj.mappings)) return false
  if (typeof obj.autoSyncOnScan !== 'boolean') return false
  if (typeof obj.autoSyncOnValidation !== 'boolean') return false

  // Validate mappings array
  for (const mapping of obj.mappings) {
    if (typeof mapping !== 'object' || mapping === null) return false
    const m = mapping as Record<string, unknown>
    if (typeof m.qrField !== 'string') return false
    if (typeof m.manychatFieldId !== 'string') return false
    if (typeof m.manychatFieldName !== 'string') return false
    if (typeof m.enabled !== 'boolean') return false
  }

  return true
}

/**
 * Type guard for Security Policy
 */
export function isSecurityPolicy(value: unknown): value is {
  allowedTags?: string[]
  requireUserMatch?: boolean
  throttle?: {
    windowMs: number
    max: number
  }
  [key: string]: unknown
} {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const obj = value as Record<string, unknown>

  if (obj.allowedTags !== undefined && !Array.isArray(obj.allowedTags)) return false
  if (obj.requireUserMatch !== undefined && typeof obj.requireUserMatch !== 'boolean') return false

  if (obj.throttle !== undefined) {
    if (typeof obj.throttle !== 'object' || obj.throttle === null) return false
    const throttle = obj.throttle as Record<string, unknown>
    if (typeof throttle.windowMs !== 'number') return false
    if (typeof throttle.max !== 'number') return false
  }

  return true
}

/**
 * Sanitizes metadata object by removing invalid values
 * @param metadata - Metadata object
 * @returns Sanitized metadata
 */
export function sanitizeMetadata(metadata: unknown): Record<string, unknown> {
  if (typeof metadata !== 'object' || metadata === null) {
    return {}
  }

  const result: Record<string, unknown> = {}
  const obj = metadata as Record<string, unknown>

  for (const [key, value] of Object.entries(obj)) {
    // Skip functions, symbols, undefined
    if (typeof value === 'function' || typeof value === 'symbol' || value === undefined) {
      continue
    }

    // Recursively sanitize nested objects
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result[key] = sanitizeMetadata(value)
    } else {
      result[key] = value
    }
  }

  return result
}
