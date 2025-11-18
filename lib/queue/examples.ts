/**
 * Queue Usage Examples
 * These examples show how to use the queue system in your API routes and services
 */

import {
  addWebhookJob,
  addManyChatSyncJob,
  addEmailJob,
  addQRAnalyticsJob,
  addDataExportJob,
} from './index'

/**
 * Example 1: Sending a webhook after QR code scan
 */
export async function exampleQRCodeScanWebhook() {
  await addWebhookJob({
    webhookId: 'webhook_123',
    event: 'qr.scanned',
    url: 'https://api.manychat.com/webhooks/qr-scanned',
    payload: {
      qrCodeId: 'qr_123',
      scannedBy: 'user_456',
      timestamp: new Date().toISOString(),
      data: {
        campaign: 'summer_promo',
        location: 'store_1',
      },
    },
    headers: {
      'X-API-Key': 'your-api-key',
    },
  })

  console.log('✅ Webhook job added to queue - will be delivered in background')
}

/**
 * Example 2: Syncing QR scan to ManyChat
 */
export async function exampleManyChatContactSync() {
  await addManyChatSyncJob({
    type: 'contact',
    action: 'update',
    toolId: 'tool_123',
    data: {
      contactId: 'contact_123',
      fields: {
        qr_scan_count: 5,
        last_scan_date: new Date().toISOString(),
        validation_status: 'SUCCESS',
      },
    },
  })

  console.log('✅ ManyChat sync job added to queue - will sync in background')
}

/**
 * Example 3: Sending booking confirmation email
 */
export async function exampleBookingConfirmationEmail() {
  await addEmailJob({
    to: 'user@example.com',
    subject: 'Booking Confirmation',
    template: 'booking-confirmation',
    data: {
      userName: 'John Doe',
      bookingDate: '2024-11-20',
      bookingTime: '14:00',
      serviceName: 'Hair Cut',
    },
  })

  console.log('✅ Email job added to queue - will send in background')
}

/**
 * Example 4: Processing QR analytics
 */
export async function exampleQRAnalytics() {
  await addQRAnalyticsJob({
    qrCodeId: 'qr_123',
    event: 'validation',
    data: {
      result: 'success',
      validatedBy: 'user_456',
      validatedAt: new Date().toISOString(),
      location: {
        lat: 40.7128,
        lng: -74.006,
      },
    },
  })

  console.log('✅ QR analytics job added to queue - will process in background')
}

/**
 * Example 5: Exporting data
 */
export async function exampleDataExport() {
  await addDataExportJob({
    userId: 'user_123',
    exportType: 'csv',
    dataType: 'qr_scans',
    filters: {
      dateFrom: '2024-01-01',
      dateTo: '2024-12-31',
      toolId: 'tool_123',
    },
  })

  console.log('✅ Data export job added to queue - will export in background')
}

/**
 * Example 6: Using in an API route
 *
 * File: app/api/qr/validate/route.ts
 */
/*
import { addWebhookJob, addManyChatSyncJob, addQRAnalyticsJob } from '@/lib/queue'

export async function POST(request: Request) {
  const { qrCode, userId } = await request.json()

  // Validate QR code
  const result = await validateQRCode(qrCode)

  // Add jobs to queue (non-blocking)
  await Promise.all([
    // Send webhook
    addWebhookJob({
      webhookId: generateId(),
      event: 'qr.validated',
      url: tool.webhookUrl,
      payload: { qrCode, result, userId }
    }),

    // Sync to ManyChat
    addManyChatSyncJob({
      type: 'field',
      action: 'update',
      toolId: tool.id,
      data: { userId, validationStatus: result.status }
    }),

    // Track analytics
    addQRAnalyticsJob({
      qrCodeId: qrCode.id,
      event: 'validation',
      data: { result, userId }
    })
  ])

  // Return immediately - jobs process in background
  return Response.json({ success: true, result })
}
*/

/**
 * Example 7: With retry and priority options
 */
export async function exampleAdvancedJobOptions() {
  // High priority webhook (process first)
  await addWebhookJob(
    {
      webhookId: 'urgent_webhook_123',
      event: 'payment.completed',
      url: 'https://api.example.com/webhooks/payment',
      payload: { amount: 100, currency: 'USD' },
    },
    {
      priority: 1, // Lower number = higher priority
      attempts: 5, // Retry up to 5 times (instead of default 3)
      backoff: {
        type: 'exponential',
        delay: 5000, // Start with 5 second delay
      },
    }
  )

  // Delayed job (send email in 1 hour)
  await addEmailJob(
    {
      to: 'user@example.com',
      subject: 'Follow-up',
      template: 'follow-up',
      data: { userName: 'John' },
    },
    {
      delay: 60 * 60 * 1000, // 1 hour in milliseconds
    }
  )

  console.log('✅ Advanced jobs added with custom options')
}
