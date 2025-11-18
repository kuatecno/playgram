/**
 * Bull Queue System
 * Handles background job processing for webhooks, syncing, emails, etc.
 */

import Queue, { Job, JobOptions } from 'bull'

// Redis connection configuration
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'

// Check if using TLS (Upstash or other cloud Redis)
const useTLS = redisUrl.startsWith('rediss://')

const redisConfig = {
  redis: {
    // Parse Redis URL or use directly
    ...(typeof redisUrl === 'string' ? { url: redisUrl } : redisUrl),
    // Enable TLS for Upstash and other cloud providers
    ...(useTLS && {
      tls: {
        rejectUnauthorized: false, // Required for Upstash
      },
    }),
    // Retry strategy for connection failures
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  },
}

// Define queue names
export const QUEUE_NAMES = {
  WEBHOOKS: 'webhooks',
  MANYCHAT_SYNC: 'manychat-sync',
  EMAIL: 'email',
  QR_ANALYTICS: 'qr-analytics',
  DATA_EXPORT: 'data-export',
} as const

// Job data types
export interface WebhookJobData {
  webhookId: string
  event: string
  payload: Record<string, any>
  url: string
  headers?: Record<string, string>
  retryCount?: number
}

export interface ManyChatSyncJobData {
  type: 'contact' | 'tag' | 'field'
  action: 'create' | 'update' | 'delete'
  toolId: string
  data: Record<string, any>
}

export interface EmailJobData {
  to: string
  subject: string
  template: string
  data: Record<string, any>
}

export interface QRAnalyticsJobData {
  qrCodeId: string
  event: 'scan' | 'validation'
  data: Record<string, any>
}

export interface DataExportJobData {
  userId: string
  exportType: 'csv' | 'json' | 'pdf' | 'excel'
  dataType: 'contacts' | 'qr_scans' | 'bookings'
  filters?: Record<string, any>
}

// Default job options
const defaultJobOptions: JobOptions = {
  attempts: 3, // Retry up to 3 times
  backoff: {
    type: 'exponential',
    delay: 2000, // Start with 2 second delay, then 4s, 8s, etc.
  },
  removeOnComplete: 100, // Keep last 100 completed jobs
  removeOnFail: 500, // Keep last 500 failed jobs
}

// Create queues
export const queues = {
  webhooks: new Queue<WebhookJobData>(QUEUE_NAMES.WEBHOOKS, redisConfig),
  manychatSync: new Queue<ManyChatSyncJobData>(QUEUE_NAMES.MANYCHAT_SYNC, redisConfig),
  email: new Queue<EmailJobData>(QUEUE_NAMES.EMAIL, redisConfig),
  qrAnalytics: new Queue<QRAnalyticsJobData>(QUEUE_NAMES.QR_ANALYTICS, redisConfig),
  dataExport: new Queue<DataExportJobData>(QUEUE_NAMES.DATA_EXPORT, redisConfig),
}

// Helper functions to add jobs to queues
export async function addWebhookJob(
  data: WebhookJobData,
  options?: JobOptions
): Promise<Job<WebhookJobData>> {
  return queues.webhooks.add(data, {
    ...defaultJobOptions,
    ...options,
  })
}

export async function addManyChatSyncJob(
  data: ManyChatSyncJobData,
  options?: JobOptions
): Promise<Job<ManyChatSyncJobData>> {
  return queues.manychatSync.add(data, {
    ...defaultJobOptions,
    ...options,
  })
}

export async function addEmailJob(
  data: EmailJobData,
  options?: JobOptions
): Promise<Job<EmailJobData>> {
  return queues.email.add(data, {
    ...defaultJobOptions,
    ...options,
  })
}

export async function addQRAnalyticsJob(
  data: QRAnalyticsJobData,
  options?: JobOptions
): Promise<Job<QRAnalyticsJobData>> {
  return queues.qrAnalytics.add(data, {
    ...defaultJobOptions,
    ...options,
  })
}

export async function addDataExportJob(
  data: DataExportJobData,
  options?: JobOptions
): Promise<Job<DataExportJobData>> {
  return queues.dataExport.add(data, {
    ...defaultJobOptions,
    ...options,
  })
}

// Graceful shutdown
export async function closeQueues() {
  await Promise.all([
    queues.webhooks.close(),
    queues.manychatSync.close(),
    queues.email.close(),
    queues.qrAnalytics.close(),
    queues.dataExport.close(),
  ])
}

// Queue health check
export async function getQueueHealth() {
  const health = await Promise.all(
    Object.entries(queues).map(async ([name, queue]) => {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount(),
      ])

      return {
        name,
        waiting,
        active,
        completed,
        failed,
        delayed,
        healthy: failed < 100, // Consider unhealthy if >100 failed jobs
      }
    })
  )

  return health
}

export default queues
