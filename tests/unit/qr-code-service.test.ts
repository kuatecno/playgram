/**
 * Unit Tests for QRCodeService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QRCodeService } from '@/features/qr-codes/services/QRCodeService'

// Mock dependencies
vi.mock('@/lib/db', () => ({
  db: {
    qRCode: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    qRScan: {
      create: vi.fn(),
    },
    qRTool: {
      findUnique: vi.fn(),
    },
    qRAnalytics: {
      create: vi.fn(),
    },
  },
}))

vi.mock('@/features/qr-codes/services/QRToolConfigService', () => ({
  qrToolConfigService: {
    getTool: vi.fn(),
    ensureConfigForTool: vi.fn(),
  },
}))

vi.mock('@/features/qr-codes/services/QRFormatResolver', () => ({
  resolveQRCodeFormat: vi.fn((format: string) => 'RESOLVED_CODE_123'),
  fetchUserDataForQR: vi.fn(),
}))

vi.mock('@/features/qr-codes/services/QRManychatSync', () => ({
  syncQRDataToManychat: vi.fn(),
}))

vi.mock('@/lib/webhooks/webhook-events', () => ({
  emitQRCreated: vi.fn(() => Promise.resolve()),
  emitQRScanned: vi.fn(() => Promise.resolve()),
}))

vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn(() => Promise.resolve('data:image/png;base64,mockQRCode')),
  },
}))

describe('QRCodeService', () => {
  let qrCodeService: QRCodeService

  beforeEach(async () => {
    vi.clearAllMocks()
    qrCodeService = new QRCodeService()
  })

  describe('generateUniqueCode', () => {
    it('should generate a unique alphanumeric code', () => {
      const service = new QRCodeService()
      // Access private method via any type (for testing purposes)
      const code = (service as any).generateUniqueCode()

      expect(code).toBeDefined()
      expect(typeof code).toBe('string')
      expect(code.length).toBeGreaterThan(0)
      expect(code).toMatch(/^[A-Z0-9]+$/) // Should be alphanumeric uppercase
    })

    it('should generate different codes on successive calls', () => {
      const service = new QRCodeService()
      const code1 = (service as any).generateUniqueCode()
      const code2 = (service as any).generateUniqueCode()

      expect(code1).not.toBe(code2)
    })
  })

  describe('generateQRCode', () => {
    it('should generate a QR code successfully', async () => {
      const { qrToolConfigService } = await import('@/features/qr-codes/services/QRToolConfigService')
      const { db } = await import('@/lib/db')
      const mockToolConfigService = vi.mocked(qrToolConfigService)
      const mockDb = vi.mocked(db)

      // Mock tool ownership verification
      mockToolConfigService.getTool.mockResolvedValue({
        id: 'tool_123',
        name: 'Test Tool',
        adminId: 'admin_123',
      } as any)

      // Mock config
      mockToolConfigService.ensureConfigForTool.mockResolvedValue({
        id: 'config_123',
        toolId: 'tool_123',
        formatPattern: null,
      } as any)

      // Mock getAppearance
      mockToolConfigService.getAppearance = vi.fn().mockResolvedValue({})

      // Mock database create
      mockDb.qRCode.create.mockResolvedValue({
        id: 'qr_123',
        code: 'ABC123',
        qrType: 'promotion',
        label: 'Test QR',
        metadata: {},
        scanCount: 0,
        expiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any)

      const result = await qrCodeService.generateQRCode({
        adminId: 'admin_123',
        toolId: 'tool_123',
        type: 'promotion',
        label: 'Test QR Code',
        data: {
          message: 'Welcome!',
        },
      })

      expect(result).toBeDefined()
      expect(result.qrCode).toBeDefined()
      expect(result.qrCodeDataUrl).toBeDefined()
      expect(result.qrCode.id).toBe('qr_123')
      expect(result.qrCodeDataUrl).toContain('data:image/png;base64')
    })

    it('should throw error if tool not found', async () => {
      const { qrToolConfigService } = await import('@/features/qr-codes/services/QRToolConfigService')
      const mockToolConfigService = vi.mocked(qrToolConfigService)

      mockToolConfigService.getTool.mockResolvedValue(null)

      await expect(
        qrCodeService.generateQRCode({
          adminId: 'admin_123',
          toolId: 'invalid_tool',
          type: 'promotion',
          label: 'Test',
          data: {},
        })
      ).rejects.toThrow('Tool not found or access denied')
    })
  })

  describe('QRCodeService existence', () => {
    it('should be able to instantiate QRCodeService', () => {
      const service = new QRCodeService()
      expect(service).toBeDefined()
      expect(service).toBeInstanceOf(QRCodeService)
    })

    it('should have generateQRCode method', () => {
      const service = new QRCodeService()
      expect(service.generateQRCode).toBeDefined()
      expect(typeof service.generateQRCode).toBe('function')
    })
  })
})
