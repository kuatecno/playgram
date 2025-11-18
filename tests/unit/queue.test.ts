/**
 * Unit Tests for Queue System
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Bull and Redis
vi.mock('bull', () => {
  const mockQueue = {
    add: vi.fn((data: any, options: any) =>
      Promise.resolve({ id: 'job_123', data, opts: options })
    ),
    process: vi.fn(),
    close: vi.fn(),
    getWaitingCount: vi.fn(() => Promise.resolve(0)),
    getActiveCount: vi.fn(() => Promise.resolve(0)),
    getCompletedCount: vi.fn(() => Promise.resolve(0)),
    getFailedCount: vi.fn(() => Promise.resolve(0)),
    getDelayedCount: vi.fn(() => Promise.resolve(0)),
    on: vi.fn(),
  }

  return {
    default: vi.fn(() => mockQueue),
  }
})

vi.mock('ioredis', () => {
  return {
    default: vi.fn(() => ({
      connect: vi.fn(),
      disconnect: vi.fn(),
    })),
  }
})

describe('Queue System', () => {
  describe('addWebhookJob', () => {
    it('should add a webhook job to the queue', async () => {
      const { addWebhookJob } = await import('@/lib/queue')

      const job = await addWebhookJob({
        webhookId: 'webhook_123',
        event: 'qr.scanned',
        url: 'https://api.example.com/webhook',
        payload: { qrCode: 'ABC123' },
      })

      expect(job).toBeDefined()
      expect(job.id).toBe('job_123')
      expect(job.data.webhookId).toBe('webhook_123')
    })

    it('should accept custom job options', async () => {
      const { addWebhookJob } = await import('@/lib/queue')

      const job = await addWebhookJob(
        {
          webhookId: 'webhook_123',
          event: 'qr.scanned',
          url: 'https://api.example.com/webhook',
          payload: {},
        },
        {
          priority: 1,
          attempts: 5,
        }
      )

      expect(job).toBeDefined()
    })
  })

  describe('addManyChatSyncJob', () => {
    it('should add a ManyChat sync job to the queue', async () => {
      const { addManyChatSyncJob } = await import('@/lib/queue')

      const job = await addManyChatSyncJob({
        type: 'contact',
        action: 'update',
        toolId: 'tool_123',
        data: { contactId: 'contact_123' },
      })

      expect(job).toBeDefined()
      expect(job.data.type).toBe('contact')
      expect(job.data.action).toBe('update')
    })
  })

  describe('addEmailJob', () => {
    it('should add an email job to the queue', async () => {
      const { addEmailJob } = await import('@/lib/queue')

      const job = await addEmailJob({
        to: 'user@example.com',
        subject: 'Test Email',
        template: 'test-template',
        data: { name: 'John' },
      })

      expect(job).toBeDefined()
      expect(job.data.to).toBe('user@example.com')
      expect(job.data.subject).toBe('Test Email')
    })
  })

  describe('addQRAnalyticsJob', () => {
    it('should add a QR analytics job to the queue', async () => {
      const { addQRAnalyticsJob } = await import('@/lib/queue')

      const job = await addQRAnalyticsJob({
        qrCodeId: 'qr_123',
        event: 'scan',
        data: { userId: 'user_123' },
      })

      expect(job).toBeDefined()
      expect(job.data.qrCodeId).toBe('qr_123')
      expect(job.data.event).toBe('scan')
    })
  })

  describe('addDataExportJob', () => {
    it('should add a data export job to the queue', async () => {
      const { addDataExportJob } = await import('@/lib/queue')

      const job = await addDataExportJob({
        userId: 'user_123',
        exportType: 'csv',
        dataType: 'qr_scans',
        filters: { dateFrom: '2024-01-01' },
      })

      expect(job).toBeDefined()
      expect(job.data.userId).toBe('user_123')
      expect(job.data.exportType).toBe('csv')
    })
  })

  describe('getQueueHealth', () => {
    it('should return health status for all queues', async () => {
      const { getQueueHealth } = await import('@/lib/queue')

      const health = await getQueueHealth()

      expect(health).toBeDefined()
      expect(Array.isArray(health)).toBe(true)
      expect(health.length).toBeGreaterThan(0)

      // Check structure of first health item
      const firstQueue = health[0]
      expect(firstQueue).toHaveProperty('name')
      expect(firstQueue).toHaveProperty('waiting')
      expect(firstQueue).toHaveProperty('active')
      expect(firstQueue).toHaveProperty('completed')
      expect(firstQueue).toHaveProperty('failed')
      expect(firstQueue).toHaveProperty('delayed')
      expect(firstQueue).toHaveProperty('healthy')
    })
  })
})
