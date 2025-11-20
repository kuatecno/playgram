import QRCode from 'qrcode'
import { db } from '@/lib/db'
import { QR_TYPES } from '@/config/constants'
import { resolveQRCodeFormat, fetchUserDataForQR } from './QRFormatResolver'
import { syncQRDataToManychat } from './QRManychatSync'
import { emitQRCreated, emitQRScanned } from '@/lib/webhooks/webhook-events'
import { qrToolConfigService } from './QRToolConfigService'
import { validateFallbackUrl } from '@/lib/security/url-validator'

export interface QRAppearanceSettings {
  width?: number
  margin?: number
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
  darkColor?: string
  lightColor?: string
}

export interface GenerateQRCodeParams {
  adminId: string
  toolId: string // Required: which QR tool to generate code for
  type: 'promotion' | 'validation' | 'discount'
  label: string
  userId?: string // Optional: for personalized QR codes
  data: {
    message?: string
    discountAmount?: number
    discountType?: 'percentage' | 'fixed'
    validUntil?: Date
    maxScans?: number
    metadata?: Record<string, unknown>
  }
}

export interface QRCodeScanResult {
  qrCode: {
    id: string
    qrType: string
    code: string
    metadata: unknown
    scanCount: number
    expiresAt: Date | null
  }
  scan: {
    id: string
    scannedAt: Date
  }
  valid: boolean
  message: string
}

export class QRCodeService {
  /**
   * Generate a new QR code
   */
  async generateQRCode(params: GenerateQRCodeParams): Promise<{
    qrCode: {
      id: string
      type: string
      label: string
      code: string
      qrCodeUrl: string
      scanUrl: string
      imageUrl: string
    }
    qrCodeDataUrl: string
  }> {
    const { adminId, toolId, type, label, data, userId } = params

    // Verify tool ownership
    const tool = await qrToolConfigService.getTool(toolId, adminId)
    if (!tool) {
      throw new Error('Tool not found or access denied')
    }

    // Get config for the tool (ensure it exists)
    const config = await qrToolConfigService.ensureConfigForTool(toolId)

    // Resolve user if provided
    let resolvedUserId: string | undefined = undefined
    
    if (userId) {
      // Check if it looks like a UUID (simple check)
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)
      
      if (isUuid) {
        resolvedUserId = userId
      } else {
        // Try to find user by ManyChat ID
        const user = await db.user.findFirst({
          where: { manychatId: userId }
        })
        
        if (user) {
          resolvedUserId = user.id
        } else {
          console.warn(`Could not find user with ManyChat ID: ${userId}`)
          // Ideally we might want to create a user here, or just proceed without linking
        }
      }
    }

    // Generate QR code based on tool-level config
    let code: string

    try {
      const qrFormat = config?.formatPattern || null

      // If custom format is defined and userId is provided, use format resolver
      if (qrFormat && resolvedUserId) {
        const userData = await fetchUserDataForQR(resolvedUserId)
        userData.metadata = data.metadata
        code = resolveQRCodeFormat(qrFormat, userData)
      } else if (qrFormat) {
        // Use format without user data (replace with defaults)
        code = resolveQRCodeFormat(qrFormat, { metadata: data.metadata })
      } else {
        // Fall back to simple random code
        code = this.generateUniqueCode()
      }
    } catch (error) {
      console.error('Error resolving QR format, using default:', error)
      code = this.generateUniqueCode()
    }

    // Create QR code record in database with retry on collision
    // Serialize metadata to ensure JSON compatibility
    const qrMetadata = JSON.parse(JSON.stringify({ label, ...data }))

    const MAX_RETRIES = 5
    let qrCode: any = null
    let lastError: Error | null = null

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        qrCode = await db.qRCode.create({
          data: {
            toolId: tool.id,
            qrType: type,
            code,
            metadata: qrMetadata,
            scanCount: 0,
            expiresAt: data.validUntil || null,
            userId: resolvedUserId,
          },
          select: {
            id: true,
            qrType: true,
            code: true,
            metadata: true,
            createdAt: true,
          },
        })
        break // Success! Exit retry loop
      } catch (error: any) {
        // Check if it's a unique constraint violation on code field
        if (error.code === 'P2002' && error.meta?.target?.includes('code')) {
          console.warn(`QR code collision detected (attempt ${attempt + 1}/${MAX_RETRIES}): ${code}`)
          lastError = error

          // Generate new code and retry
          code = this.generateUniqueCode()
          continue
        }

        // Different error - rethrow immediately
        throw error
      }
    }

    // If we exhausted retries, throw the last error
    if (!qrCode) {
      throw new Error(`Failed to generate unique QR code after ${MAX_RETRIES} attempts: ${lastError?.message}`)
    }

    // Generate scan URL with security validation
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002'
    const validatedFallbackUrl = validateFallbackUrl(config.fallbackUrl)
    const scanUrl = validatedFallbackUrl
      ? `${validatedFallbackUrl}?code=${encodeURIComponent(qrCode.code)}`
      : `${baseUrl}/api/v1/qr/scan/${qrCode.code}`

    // Generate image URL
    const imageUrl = `${baseUrl}/api/v1/qr/image/${qrCode.code}`

    // Get QR appearance settings from tool config
    const appearance: QRAppearanceSettings = qrToolConfigService.getAppearance(config)

    // Generate QR code image as data URL with custom appearance
    const qrCodeDataUrl = await QRCode.toDataURL(scanUrl, {
      errorCorrectionLevel: appearance.errorCorrectionLevel || 'H',
      type: 'image/png',
      width: appearance.width || 512,
      margin: appearance.margin !== undefined ? appearance.margin : 2,
      color: {
        dark: appearance.darkColor || '#000000',
        light: appearance.lightColor || '#FFFFFF',
      },
    })

    // Track generation in analytics
    await db.qRAnalytics.create({
      data: {
        qrCodeId: qrCode.id,
        event: 'generated',
        timestamp: new Date(),
      },
    })

    // Emit webhook event for QR creation
    emitQRCreated(adminId, qrCode.id).catch((error) => {
      console.error('Failed to emit QR created webhook:', error)
    })

    const qrData = qrCode.metadata as any

    return {
      qrCode: {
        id: qrCode.id,
        type: qrCode.qrType,
        label: qrData?.label || '',
        code: qrCode.code,
        qrCodeUrl: qrCodeDataUrl,
        scanUrl,
        imageUrl,
      },
      qrCodeDataUrl,
    }
  }

  /**
   * Generate QR code image buffer for a given code
   */
  async getQRCodeImage(code: string): Promise<Buffer> {
    const qrCode = await db.qRCode.findUnique({
      where: { code },
      include: { tool: true },
    })

    if (!qrCode) {
      throw new Error('QR code not found')
    }

    // Get config for the tool
    const config = await qrToolConfigService.ensureConfigForTool(qrCode.toolId)

    // Get appearance settings
    const appearance = qrToolConfigService.getAppearance(config)

    // Generate scan URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002'
    const validatedFallbackUrl = validateFallbackUrl(config.fallbackUrl)
    const scanUrl = validatedFallbackUrl
      ? `${validatedFallbackUrl}?code=${encodeURIComponent(qrCode.code)}`
      : `${baseUrl}/api/v1/qr/scan/${qrCode.code}`

    // Generate QR code image as buffer
    return await QRCode.toBuffer(scanUrl, {
      errorCorrectionLevel: appearance.errorCorrectionLevel || 'H',
      type: 'png',
      width: appearance.width || 512,
      margin: appearance.margin !== undefined ? appearance.margin : 2,
      color: {
        dark: appearance.darkColor || '#000000',
        light: appearance.lightColor || '#FFFFFF',
      },
    })
  }

  /**
   * Scan a QR code by code
   */
  async scanQRCode(
    code: string,
    _userId?: string,
    metadata?: {
      location?: string
      device?: string
      ipAddress?: string
      userAgent?: string
    }
  ): Promise<QRCodeScanResult> {
    // Find QR code
    const qrCode = await db.qRCode.findUnique({
      where: { code },
      select: {
        id: true,
        qrType: true,
        code: true,
        metadata: true,
        scanCount: true,
        expiresAt: true,
        scannedAt: true,
        toolId: true,
      },
    })

    if (!qrCode) {
      throw new Error('QR code not found')
    }

    const qrData = (qrCode.metadata as any) || {}
    const maxScans = qrData.maxScans

    // Check expiration
    if (qrCode.expiresAt && qrCode.expiresAt < new Date()) {
      return {
        qrCode,
        scan: { id: '', scannedAt: new Date() },
        valid: false,
        message: 'This QR code has expired',
      }
    }

    // Check if max scans reached
    if (maxScans && qrCode.scanCount >= maxScans) {
      return {
        qrCode,
        scan: { id: '', scannedAt: new Date() },
        valid: false,
        message: 'This QR code has reached its maximum scan limit',
      }
    }

    // Record scan in analytics
    const scan = await db.qRAnalytics.create({
      data: {
        qrCodeId: qrCode.id,
        event: 'scanned',
        location: metadata?.location,
        device: metadata?.device,
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
        timestamp: new Date(),
      },
      select: {
        id: true,
        timestamp: true,
      },
    })

    // Increment scan count and update scanned time
    await db.qRCode.update({
      where: { id: qrCode.id },
      data: {
        scanCount: { increment: 1 },
        scannedAt: new Date(),
      },
    })

    // Get tool to find adminId
    const tool = await db.tool.findUnique({
      where: { id: qrCode.toolId },
      select: { adminId: true },
    })

    if (tool) {
      // Trigger Manychat sync if userId is provided
      if (_userId) {
        // Trigger sync in background (don't wait for it)
        syncQRDataToManychat({
          qrCodeId: qrCode.id,
          userId: _userId,
          adminId: tool.adminId,
          trigger: 'scan',
        }).catch((error) => {
          console.error('QR Manychat sync failed:', error)
        })
      }

      // Emit webhook event for QR scan
      emitQRScanned(tool.adminId, qrCode.id, _userId).catch((error) => {
        console.error('Failed to emit QR scanned webhook:', error)
      })
    }

    // Return success result based on type
    let message = 'QR code scanned successfully'
    if (qrCode.qrType === QR_TYPES.DISCOUNT && qrData.discountAmount) {
      message = `Discount applied: ${qrData.discountType === 'percentage' ? `${qrData.discountAmount}%` : `$${qrData.discountAmount}`} off`
    } else if (qrCode.qrType === QR_TYPES.PROMOTION && qrData.message) {
      message = qrData.message
    } else if (qrCode.qrType === QR_TYPES.VALIDATION) {
      message = 'Validation successful'
    }

    return {
      qrCode,
      scan: { id: scan.id, scannedAt: scan.timestamp },
      valid: true,
      message,
    }
  }

  /**
   * Get QR code statistics
   */
  async getQRCodeStats(adminId: string, toolId?: string) {
    const whereClause = toolId
      ? { toolId, tool: { adminId } }
      : { tool: { adminId } }

    const total = await db.qRCode.count({
      where: whereClause,
    })

    const totalScans = await db.qRAnalytics.count({
      where: {
        event: 'scanned',
        qrCode: whereClause,
      },
    })

    const byType = await db.qRCode.groupBy({
      by: ['qrType'],
      where: whereClause,
      _count: true,
      _sum: {
        scanCount: true,
      },
    })

    // Recent scans (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentScans = await db.qRAnalytics.count({
      where: {
        event: 'scanned',
        qrCode: whereClause,
        timestamp: { gte: thirtyDaysAgo },
      },
    })

    return {
      total,
      totalScans,
      recentScans,
      byType: byType.map((stat) => ({
        type: stat.qrType,
        count: stat._count,
        scans: stat._sum.scanCount || 0,
      })),
    }
  }

  /**
   * List QR codes for admin
   */
  async listQRCodes(adminId: string, options?: {
    toolId?: string
    qrType?: string
    limit?: number
    offset?: number
  }) {
    const where = {
      tool: { adminId },
      ...(options?.toolId && { toolId: options.toolId }),
      ...(options?.qrType && { qrType: options.qrType }),
    }

    const [qrCodes, total] = await Promise.all([
      db.qRCode.findMany({
        where,
        select: {
          id: true,
          qrType: true,
          code: true,
          metadata: true,
          scanCount: true,
          expiresAt: true,
          scannedAt: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 50,
        skip: options?.offset || 0,
      }),
      db.qRCode.count({ where }),
    ])

    return {
      qrCodes: qrCodes.map((qr) => ({
        ...qr,
        label: (qr.metadata as any)?.label || '',
      })),
      total,
      limit: options?.limit || 50,
      offset: options?.offset || 0,
    }
  }

  /**
   * Get QR code details with scan history
   */
  async getQRCodeDetails(qrCodeId: string, adminId: string) {
    const qrCode = await db.qRCode.findFirst({
      where: {
        id: qrCodeId,
        tool: { adminId },
      },
      include: {
        analytics: {
          orderBy: { timestamp: 'desc' },
          take: 100,
        },
      },
    })

    if (!qrCode) {
      throw new Error('QR code not found')
    }

    return qrCode
  }

  /**
   * Update QR code
   */
  async updateQRCode(
    qrCodeId: string,
    adminId: string,
    data: {
      label?: string
      expiresAt?: Date | null
      metadata?: Record<string, unknown>
    }
  ) {
    // Get existing QR code to merge metadata
    const existing = await db.qRCode.findFirst({
      where: {
        id: qrCodeId,
        tool: { adminId },
      },
    })

    if (!existing) {
      throw new Error('QR code not found')
    }

    const existingMeta = (existing.metadata as any) || {}

    const updateData: any = {}

    if (data.expiresAt !== undefined) {
      updateData.expiresAt = data.expiresAt
    }

    if (data.label || data.metadata) {
      updateData.metadata = {
        ...existingMeta,
        ...(data.label && { label: data.label }),
        ...(data.metadata || {}),
      }
    }

    await db.qRCode.update({
      where: { id: qrCodeId },
      data: updateData,
    })

    return { success: true }
  }

  /**
   * Delete QR code
   */
  async deleteQRCode(qrCodeId: string, adminId: string) {
    const deleted = await db.qRCode.deleteMany({
      where: {
        id: qrCodeId,
        tool: { adminId },
      },
    })

    if (deleted.count === 0) {
      throw new Error('QR code not found')
    }

    return { success: true }
  }

  /**
   * Generate unique code for QR
   */
  private generateUniqueCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 10; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }
}

export const qrCodeService = new QRCodeService()
