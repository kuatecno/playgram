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

export interface QRFieldMappingConfigData {
  mappings: Array<{
    qrField: string
    manychatFieldId: string
    manychatFieldName: string
    enabled: boolean
  }>
  autoSyncOnScan: boolean
  autoSyncOnValidation: boolean
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
}

class QRToolConfigService {
  /**
   * Ensure a QR tool exists for the admin and return both tool and config.
   * Uses atomic operations to prevent race conditions.
   */
  async ensureToolForAdmin(adminId: string): Promise<{ tool: Tool; config: QRToolConfig }> {
    return await db.$transaction(async (tx) => {
      // Use upsert to atomically ensure tool exists
      const tool = await tx.tool.upsert({
        where: {
          adminId_toolType: {
            adminId,
            toolType: 'qr',
          },
        },
        create: {
          adminId,
          toolType: 'qr',
          name: 'QR Code Generator',
          description: 'Generate and manage QR codes',
          settings: {},
          isActive: true,
        },
        update: {}, // No updates needed if exists
      })

      // Use upsert to atomically ensure config exists
      const config = await tx.qRToolConfig.upsert({
        where: { toolId: tool.id },
        create: {
          toolId: tool.id,
          formatPattern: null,
          fallbackUrl: null,
          appearance: JSON.parse(JSON.stringify(DEFAULT_QR_APPEARANCE)),
          fieldMappings: JSON.parse(JSON.stringify(DEFAULT_FIELD_MAPPING_CONFIG)),
          securityPolicy: {},
          metadata: {},
        },
        update: {}, // No updates needed if exists
      })

      return { tool, config }
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
