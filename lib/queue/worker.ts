/**
 * Queue Worker
 * Connects queues to their processors
 * Run this in a separate process: npm run worker
 */

import { queues, closeQueues } from './index'
import {
  processWebhookJob,
  processManyChatSyncJob,
  processEmailJob,
  processQRAnalyticsJob,
  processDataExportJob,
} from './processors'
import { logger } from '../logger'

// Register processors for each queue
export function startWorker() {
  logger.info('Starting queue workers...')

  // Webhook processor
  queues.webhooks.process(async (job) => {
    try {
      await processWebhookJob(job)
    } catch (error) {
      logger.error('Webhook job failed', {
        jobId: job.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  })

  // ManyChat sync processor
  queues.manychatSync.process(async (job) => {
    try {
      await processManyChatSyncJob(job)
    } catch (error) {
      logger.error('ManyChat sync job failed', {
        jobId: job.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  })

  // Email processor
  queues.email.process(async (job) => {
    try {
      await processEmailJob(job)
    } catch (error) {
      logger.error('Email job failed', {
        jobId: job.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  })

  // QR analytics processor
  queues.qrAnalytics.process(async (job) => {
    try {
      await processQRAnalyticsJob(job)
    } catch (error) {
      logger.error('QR analytics job failed', {
        jobId: job.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  })

  // Data export processor
  queues.dataExport.process(async (job) => {
    try {
      await processDataExportJob(job)
    } catch (error) {
      logger.error('Data export job failed', {
        jobId: job.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  })

  // Event listeners for queue health monitoring
  Object.entries(queues).forEach(([name, queue]) => {
    queue.on('completed', (job) => {
      logger.info(`Job completed in queue ${name}`, {
        jobId: job.id,
        processingTime: job.finishedOn! - job.processedOn!,
      })
    })

    queue.on('failed', (job, error) => {
      logger.error(`Job failed in queue ${name}`, {
        jobId: job?.id,
        error: error.message,
        attempts: job?.attemptsMade,
      })
    })

    queue.on('stalled', (job) => {
      logger.warn(`Job stalled in queue ${name}`, {
        jobId: job.id,
      })
    })

    queue.on('error', (error) => {
      logger.error(`Queue error in ${name}`, {
        error: error.message,
      })
    })
  })

  logger.info('Queue workers started successfully')
}

// Graceful shutdown
export async function stopWorker() {
  logger.info('Stopping queue workers...')
  await closeQueues()
  logger.info('Queue workers stopped')
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received')
  await stopWorker()
  process.exit(0)
})

process.on('SIGINT', async () => {
  logger.info('SIGINT received')
  await stopWorker()
  process.exit(0)
})

// Start worker if this file is run directly
if (require.main === module) {
  startWorker()
}
