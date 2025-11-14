import type { Tool, QRToolConfig } from '@prisma/client'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import {
  validateJsonField,
  safeParseJson,
  isQRAppearanceSettings,
  isQRFieldMappingConfig,
  isSecurityPolicy,
  sanitizeMetadata,
} from '@/lib/validation/json-validator'

export interface QRAppearanceSettings {
  width?: number
  margin?: number
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
  darkColor?: string
  lightColor?: string
}

export type QRValidationOutcome = 'sent' | 'validated_success' | 'validated_failed'

export type QRFailureReason = 'wrong_person' | 'expired' | 'already_used' | 'other'

export interface QROutcomeFieldMapping {
  outcome: QRValidationOutcome
  failureReason?: QRFailureReason // Only for validated_failed
  manychatFieldId: string
  manychatFieldName: string
  value: string // Can include tokens like {{qr_code}}, {{timestamp}}, etc.
  enabled: boolean
}

export interface QROutcomeTagConfig {
  outcome: QRValidationOutcome
  failureReason?: QRFailureReason // Only for validated_failed
  tagIds: string[] // ManyChat tag IDs to apply
  tagNames: string[] // Tag names for display
  action: 'add' | 'remove'
  enabled: boolean
}

export interface QRFieldMappingConfigData {
  // Legacy simple mappings (deprecated but kept for backward compatibility)
  mappings: Array<{
    qrField: string
    manychatFieldId: string
    manychatFieldName: string
    enabled: boolean
  }>
  autoSyncOnScan: boolean
  autoSyncOnValidation: boolean

  // New conditional mappings
  outcomeFieldMappings?: QROutcomeFieldMapping[]
  outcomeTagConfigs?: QROutcomeTagConfig[]
}

export interface QRToolSecurityPolicy {
  allowedTags?: string[]
  requireUserMatch?: boolean
  throttle?: {
    windowMs: number
    max: number
  }
  [key: string]: unknown
}

export interface UpdateQRToolConfigInput {
  formatPattern?: string | null
  fallbackUrl?: string | null
  appearance?: QRAppearanceSettings | null
  fieldMappings?: QRFieldMappingConfigData | null
  securityPolicy?: QRToolSecurityPolicy | null
  metadata?: Record<string, unknown> | null
}

export const DEFAULT_QR_APPEARANCE: Required<QRAppearanceSettings> = {
  width: 512,
  margin: 2,
  errorCorrectionLevel: 'H',
  darkColor: '#000000',
  lightColor: '#FFFFFF',
}

const DEFAULT_FIELD_MAPPING_CONFIG: QRFieldMappingConfigData = {
  mappings: [],
  autoSyncOnScan: false,
  autoSyncOnValidation: false,
  outcomeFieldMappings: [],
  outcomeTagConfigs: [],
}

class QRToolConfigService {
  /**
   * Create a new QR tool with default configuration
   */
  async createTool(adminId: string, name: string, description?: string): Promise<{ tool: Tool; config: QRToolConfig }> {
    return await db.$transaction(async (tx) => {
      // Create the tool
      const tool = await tx.tool.create({
        data: {
          adminId,
          toolType: 'qr',
          name,
          description: description || '',
          settings: {},
          isActive: true,
        },
      })

      // Create default config for the tool
      const config = await tx.qRToolConfig.create({
        data: {
          toolId: tool.id,
          formatPattern: null,
          fallbackUrl: null,
          appearance: JSON.parse(JSON.stringify(DEFAULT_QR_APPEARANCE)),
          fieldMappings: JSON.parse(JSON.stringify(DEFAULT_FIELD_MAPPING_CONFIG)),
          securityPolicy: {},
          metadata: {},
        },
      })

      return { tool, config }
    })
  }

  /**
   * List all QR tools for an admin
   */
  async listTools(adminId: string): Promise<Tool[]> {
    return await db.tool.findMany({
      where: {
        adminId,
        toolType: 'qr',
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  }

  /**
   * Get a specific QR tool by ID with ownership verification
   */
  async getTool(toolId: string, adminId: string): Promise<Tool | null> {
    return await db.tool.findFirst({
      where: {
        id: toolId,
        adminId,
        toolType: 'qr',
      },
    })
  }

  /**
   * Update tool metadata (name, description, isActive)
   */
  async updateToolMetadata(
    toolId: string,
    adminId: string,
    updates: { name?: string; description?: string; isActive?: boolean }
  ): Promise<Tool> {
    // Verify ownership
    const tool = await this.getTool(toolId, adminId)
    if (!tool) {
      throw new Error('Tool not found or access denied')
    }

    return await db.tool.update({
      where: { id: toolId },
      data: updates,
    })
  }

  /**
   * Delete a QR tool (cascades to config and QR codes)
   */
  async deleteTool(toolId: string, adminId: string): Promise<void> {
    // Verify ownership
    const tool = await this.getTool(toolId, adminId)
    if (!tool) {
      throw new Error('Tool not found or access denied')
    }

    await db.tool.delete({
      where: { id: toolId },
    })
  }

  /**
   * Ensure config exists for a tool and return it.
   * Uses upsert to prevent race conditions.
   */
  async ensureConfigForTool(toolId: string): Promise<QRToolConfig> {
    const config = await db.qRToolConfig.upsert({
      where: { toolId },
      create: {
        toolId,
        formatPattern: null,
        fallbackUrl: null,
        appearance: JSON.parse(JSON.stringify(DEFAULT_QR_APPEARANCE)),
        fieldMappings: JSON.parse(JSON.stringify(DEFAULT_FIELD_MAPPING_CONFIG)),
        securityPolicy: {},
        metadata: {},
      },
      update: {}, // No updates needed if exists
    })

    return config
  }

  /**
   * Get config by toolId without creating it.
   */
  async getConfig(toolId: string): Promise<QRToolConfig | null> {
    const config = await db.qRToolConfig.findUnique({
      where: { toolId },
    })

    return config
  }

  /**
   * Update config fields for a tool. Missing config will be created automatically.
   * Validates all JSON fields before storage.
   */
  async updateConfig(toolId: string, input: UpdateQRToolConfigInput): Promise<QRToolConfig> {
    const existing = await this.ensureConfigForTool(toolId)

    // Validate and sanitize appearance settings
    let nextAppearance: QRAppearanceSettings | null = null
    if (input.appearance !== undefined) {
      if (input.appearance !== null) {
        if (!isQRAppearanceSettings(input.appearance)) {
          throw new Error('Invalid QR appearance settings structure')
        }
        nextAppearance = input.appearance
      }
    } else {
      nextAppearance = safeParseJson(existing.appearance, null)
    }

    // Validate and sanitize field mappings
    let nextFieldMappings: QRFieldMappingConfigData | null = null
    if (input.fieldMappings !== undefined) {
      if (input.fieldMappings !== null) {
        if (!isQRFieldMappingConfig(input.fieldMappings)) {
          throw new Error('Invalid field mapping configuration structure')
        }
        nextFieldMappings = input.fieldMappings
      }
    } else {
      nextFieldMappings = safeParseJson(existing.fieldMappings, null)
    }

    // Validate and sanitize security policy
    let nextSecurityPolicy: QRToolSecurityPolicy | null = null
    if (input.securityPolicy !== undefined) {
      if (input.securityPolicy !== null) {
        if (!isSecurityPolicy(input.securityPolicy)) {
          throw new Error('Invalid security policy structure')
        }
        nextSecurityPolicy = input.securityPolicy
      }
    } else {
      nextSecurityPolicy = safeParseJson(existing.securityPolicy, null)
    }

    // Sanitize metadata
    const rawMetadata = input.metadata !== undefined ? input.metadata : existing.metadata
    const sanitizedMetadata = sanitizeMetadata(rawMetadata)

    const data: Prisma.QRToolConfigUpdateInput = {
      formatPattern:
        input.formatPattern !== undefined ? input.formatPattern : existing.formatPattern,
      fallbackUrl: input.fallbackUrl !== undefined ? input.fallbackUrl : existing.fallbackUrl,
      appearance: nextAppearance !== null ? validateJsonField(nextAppearance, 'appearance') : Prisma.JsonNull,
      fieldMappings: nextFieldMappings !== null ? validateJsonField(nextFieldMappings, 'fieldMappings') : Prisma.JsonNull,
      securityPolicy: nextSecurityPolicy !== null ? validateJsonField(nextSecurityPolicy, 'securityPolicy') : Prisma.JsonNull,
      metadata: validateJsonField(sanitizedMetadata, 'metadata'),
    }

    const updated = await db.qRToolConfig.update({
      where: { toolId },
      data,
    })

    return updated
  }

  /**
   * Convenience helper to get field mapping config with defaults.
   * Uses safe parsing to prevent errors from corrupt data.
   */
  getFieldMappingConfig(config: QRToolConfig | null): QRFieldMappingConfigData {
    if (!config?.fieldMappings) {
      return DEFAULT_FIELD_MAPPING_CONFIG
    }

    const parsed = safeParseJson(config.fieldMappings, DEFAULT_FIELD_MAPPING_CONFIG)

    // Validate structure
    if (!isQRFieldMappingConfig(parsed)) {
      console.error('Invalid field mapping config structure, using defaults')
      return DEFAULT_FIELD_MAPPING_CONFIG
    }

    return parsed
  }

  /**
   * Get appearance settings with defaults.
   * Uses safe parsing to prevent errors from corrupt data.
   */
  getAppearance(config: QRToolConfig | null): QRAppearanceSettings {
    if (!config?.appearance) {
      return DEFAULT_QR_APPEARANCE
    }

    const parsed = safeParseJson(config.appearance, DEFAULT_QR_APPEARANCE)

    // Validate structure
    if (!isQRAppearanceSettings(parsed)) {
      console.error('Invalid appearance settings structure, using defaults')
      return DEFAULT_QR_APPEARANCE
    }

    return {
      ...DEFAULT_QR_APPEARANCE,
      ...parsed,
    }
  }
}

export const qrToolConfigService = new QRToolConfigService()
