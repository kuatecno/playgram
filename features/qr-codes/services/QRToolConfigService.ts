import type { Tool, QRToolConfig } from '@prisma/client'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'

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
   */
  async updateConfig(toolId: string, input: UpdateQRToolConfigInput): Promise<QRToolConfig> {
    const existing = await this.ensureConfigForTool(toolId)

    const nextAppearance =
      input.appearance !== undefined
        ? input.appearance ?? null
        : existing.appearance

    const nextFieldMappings =
      input.fieldMappings !== undefined
        ? input.fieldMappings ?? null
        : existing.fieldMappings

    const nextSecurityPolicy =
      input.securityPolicy !== undefined
        ? input.securityPolicy ?? null
        : existing.securityPolicy

    const data: Prisma.QRToolConfigUpdateInput = {
      formatPattern:
        input.formatPattern !== undefined ? input.formatPattern : existing.formatPattern,
      fallbackUrl: input.fallbackUrl !== undefined ? input.fallbackUrl : existing.fallbackUrl,
      appearance: nextAppearance !== null ? JSON.parse(JSON.stringify(nextAppearance)) : Prisma.JsonNull,
      fieldMappings: nextFieldMappings !== null ? JSON.parse(JSON.stringify(nextFieldMappings)) : Prisma.JsonNull,
      securityPolicy: nextSecurityPolicy !== null ? JSON.parse(JSON.stringify(nextSecurityPolicy)) : Prisma.JsonNull,
      metadata: JSON.parse(JSON.stringify(input.metadata !== undefined ? input.metadata : existing.metadata)),
    }

    const updated = await db.qRToolConfig.update({
      where: { toolId },
      data,
    })

    return updated
  }

  /**
   * Convenience helper to get field mapping config with defaults.
   */
  getFieldMappingConfig(config: QRToolConfig | null): QRFieldMappingConfigData {
    if (!config?.fieldMappings) {
      return DEFAULT_FIELD_MAPPING_CONFIG
    }

    try {
      const parsed = typeof config.fieldMappings === 'string'
        ? JSON.parse(config.fieldMappings)
        : config.fieldMappings

      return {
        mappings: parsed?.mappings ?? [],
        autoSyncOnScan: parsed?.autoSyncOnScan ?? false,
        autoSyncOnValidation: parsed?.autoSyncOnValidation ?? false,
      }
    } catch (error) {
      console.error('Failed to parse QR field mappings, returning defaults:', error)
      return DEFAULT_FIELD_MAPPING_CONFIG
    }
  }

  getAppearance(config: QRToolConfig | null): QRAppearanceSettings {
    if (!config?.appearance) {
      return DEFAULT_QR_APPEARANCE
    }

    try {
      const parsed = typeof config.appearance === 'string'
        ? JSON.parse(config.appearance)
        : config.appearance

      return {
        ...DEFAULT_QR_APPEARANCE,
        ...(parsed as Record<string, unknown>),
      }
    } catch (error) {
      console.error('Failed to parse QR appearance, returning defaults:', error)
      return DEFAULT_QR_APPEARANCE
    }
  }
}

export const qrToolConfigService = new QRToolConfigService()
