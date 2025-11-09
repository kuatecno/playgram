import QRCode from 'qrcode'
import { db } from '@/lib/db'
import { QR_TYPES } from '@/config/constants'

export interface GenerateQRCodeParams {
  adminId: string
  type: 'promotion' | 'validation' | 'discount'
  label: string
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
    type: string
    label: string
    data: unknown
    isActive: boolean
    scanCount: number
    maxScans: number | null
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
      qrCodeUrl: string
      scanUrl: string
    }
    qrCodeDataUrl: string
  }> {
    const { adminId, type, label, data } = params

    // Create unique code
    const code = this.generateUniqueCode()

    // Create QR code record in database
    const qrCode = await db.qRCode.create({
      data: {
        adminId,
        type,
        code,
        label,
        data,
        isActive: true,
        scanCount: 0,
        maxScans: data.maxScans || null,
      },
      select: {
        id: true,
        type: true,
        code: true,
        label: true,
        createdAt: true,
      },
    })

    // Generate scan URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002'
    const scanUrl = `${baseUrl}/api/v1/qr/scan/${qrCode.code}`

    // Generate QR code image as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(scanUrl, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 512,
      margin: 2,
    })

    return {
      qrCode: {
        id: qrCode.id,
        type: qrCode.type,
        label: qrCode.label,
        qrCodeUrl: qrCodeDataUrl,
        scanUrl,
      },
      qrCodeDataUrl,
    }
  }

  /**
   * Scan a QR code by code
   */
  async scanQRCode(
    code: string,
    userId?: string
  ): Promise<QRCodeScanResult> {
    // Find QR code
    const qrCode = await db.qRCode.findUnique({
      where: { code },
      select: {
        id: true,
        type: true,
        label: true,
        data: true,
        isActive: true,
        scanCount: true,
        maxScans: true,
      },
    })

    if (!qrCode) {
      throw new Error('QR code not found')
    }

    // Check if QR code is active
    if (!qrCode.isActive) {
      return {
        qrCode,
        scan: { id: '', scannedAt: new Date() },
        valid: false,
        message: 'This QR code has been deactivated',
      }
    }

    // Check if max scans reached
    if (qrCode.maxScans && qrCode.scanCount >= qrCode.maxScans) {
      return {
        qrCode,
        scan: { id: '', scannedAt: new Date() },
        valid: false,
        message: 'This QR code has reached its maximum scan limit',
      }
    }

    // Check expiration if validUntil is set
    const data = qrCode.data as GenerateQRCodeParams['data']
    if (data.validUntil) {
      const validUntil = new Date(data.validUntil)
      if (validUntil < new Date()) {
        return {
          qrCode,
          scan: { id: '', scannedAt: new Date() },
          valid: false,
          message: 'This QR code has expired',
        }
      }
    }

    // Record scan
    const scan = await db.qRCodeScan.create({
      data: {
        qrCodeId: qrCode.id,
        userId,
        scannedAt: new Date(),
      },
      select: {
        id: true,
        scannedAt: true,
      },
    })

    // Increment scan count
    await db.qRCode.update({
      where: { id: qrCode.id },
      data: { scanCount: { increment: 1 } },
    })

    // Return success result based on type
    let message = 'QR code scanned successfully'
    if (qrCode.type === QR_TYPES.DISCOUNT && data.discountAmount) {
      message = `Discount applied: ${data.discountType === 'percentage' ? `${data.discountAmount}%` : `$${data.discountAmount}`} off`
    } else if (qrCode.type === QR_TYPES.PROMOTION && data.message) {
      message = data.message
    } else if (qrCode.type === QR_TYPES.VALIDATION) {
      message = 'Validation successful'
    }

    return {
      qrCode,
      scan,
      valid: true,
      message,
    }
  }

  /**
   * Get QR code statistics
   */
  async getQRCodeStats(adminId: string) {
    const total = await db.qRCode.count({
      where: { adminId },
    })

    const active = await db.qRCode.count({
      where: { adminId, isActive: true },
    })

    const totalScans = await db.qRCodeScan.count({
      where: {
        qrCode: { adminId },
      },
    })

    const byType = await db.qRCode.groupBy({
      by: ['type'],
      where: { adminId },
      _count: true,
      _sum: {
        scanCount: true,
      },
    })

    // Recent scans (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentScans = await db.qRCodeScan.count({
      where: {
        qrCode: { adminId },
        scannedAt: { gte: thirtyDaysAgo },
      },
    })

    return {
      total,
      active,
      inactive: total - active,
      totalScans,
      recentScans,
      byType: byType.map((stat) => ({
        type: stat.type,
        count: stat._count,
        scans: stat._sum.scanCount || 0,
      })),
    }
  }

  /**
   * List QR codes for admin
   */
  async listQRCodes(adminId: string, options?: {
    type?: string
    isActive?: boolean
    limit?: number
    offset?: number
  }) {
    const where = {
      adminId,
      ...(options?.type && { type: options.type }),
      ...(options?.isActive !== undefined && { isActive: options.isActive }),
    }

    const [qrCodes, total] = await Promise.all([
      db.qRCode.findMany({
        where,
        select: {
          id: true,
          type: true,
          code: true,
          label: true,
          data: true,
          isActive: true,
          scanCount: true,
          maxScans: true,
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
      qrCodes,
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
        adminId,
      },
      include: {
        scans: {
          orderBy: { scannedAt: 'desc' },
          take: 100,
          select: {
            id: true,
            userId: true,
            scannedAt: true,
            user: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
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
      isActive?: boolean
      maxScans?: number | null
      data?: Record<string, unknown>
    }
  ) {
    const qrCode = await db.qRCode.updateMany({
      where: {
        id: qrCodeId,
        adminId,
      },
      data,
    })

    if (qrCode.count === 0) {
      throw new Error('QR code not found')
    }

    return { success: true }
  }

  /**
   * Delete QR code
   */
  async deleteQRCode(qrCodeId: string, adminId: string) {
    const qrCode = await db.qRCode.deleteMany({
      where: {
        id: qrCodeId,
        adminId,
      },
    })

    if (qrCode.count === 0) {
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
