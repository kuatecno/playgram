import crypto from 'crypto'
import { db } from '@/lib/db'

export interface WebhookPayload {
  event: string
  timestamp: string
  data: any
  metadata?: any
}

export interface WebhookDeliveryResult {
  success: boolean
  statusCode?: number
  error?: string
  durationMs?: number
  deliveryId?: string
}

/**
 * Generate HMAC-SHA256 signature for webhook payload
 */
export function generateWebhookSignature(
  payload: string,
  secret: string
): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
}

/**
 * Verify webhook signature using constant-time comparison
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = generateWebhookSignature(payload, secret)

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  } catch (error) {
    return false
  }
}

/**
 * Send webhook with timeout and error handling
 */
export async function sendWebhook(
  subscription: {
    id: string
    url: string
    secret: string
    customHeaders?: any
  },
  payload: WebhookPayload,
  attempt: number = 1
): Promise<WebhookDeliveryResult> {
  const startTime = Date.now()

  // Serialize payload
  const payloadString = JSON.stringify(payload)
  const signature = generateWebhookSignature(payloadString, subscription.secret)

  // Create delivery record
  const delivery = await db.webhookDelivery.create({
    data: {
      subscriptionId: subscription.id,
      event: payload.event,
      payload: payload,
      status: 'pending',
      attempts: attempt,
    },
  })

  try {
    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Webhook-Signature': signature,
      'X-Webhook-Event': payload.event,
      'X-Webhook-Timestamp': payload.timestamp,
      'X-Webhook-ID': delivery.id,
      'X-Webhook-Attempt': attempt.toString(),
      'User-Agent': 'Playgram-Webhook/1.0',
    }

    // Add custom headers if provided
    if (subscription.customHeaders) {
      Object.assign(headers, subscription.customHeaders)
    }

    // Send HTTP POST with 10s timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    const response = await fetch(subscription.url, {
      method: 'POST',
      headers,
      body: payloadString,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    const durationMs = Date.now() - startTime
    const success = response.status >= 200 && response.status < 300
    const responseBody = await response.text()

    // Update delivery record
    await db.webhookDelivery.update({
      where: { id: delivery.id },
      data: {
        status: success ? 'success' : 'failed',
        responseStatus: response.status,
        responseBody: responseBody.substring(0, 1000), // Limit size
        lastAttemptAt: new Date(),
        errorMessage: success ? null : `HTTP ${response.status}`,
      },
    })

    return {
      success,
      statusCode: response.status,
      durationMs,
      deliveryId: delivery.id,
    }
  } catch (error: any) {
    const durationMs = Date.now() - startTime
    const errorMessage = error.message || 'Unknown error'

    // Update delivery record with error
    await db.webhookDelivery.update({
      where: { id: delivery.id },
      data: {
        status: 'failed',
        lastAttemptAt: new Date(),
        errorMessage,
      },
    })

    return {
      success: false,
      error: errorMessage,
      durationMs,
      deliveryId: delivery.id,
    }
  }
}

/**
 * Send webhook with automatic retry logic
 */
export async function sendWebhookWithRetry(
  subscription: {
    id: string
    url: string
    secret: string
    customHeaders?: any
  },
  payload: WebhookPayload,
  maxAttempts: number = 3,
  retryDelayMs: number = 60000
): Promise<WebhookDeliveryResult> {
  let lastResult: WebhookDeliveryResult = { success: false }

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // Delay before retry (except for first attempt)
    if (attempt > 1) {
      await new Promise(resolve => setTimeout(resolve, retryDelayMs))
    }

    lastResult = await sendWebhook(subscription, payload, attempt)

    // If successful, no need to retry
    if (lastResult.success) {
      break
    }

    console.log(
      `Webhook delivery failed (attempt ${attempt}/${maxAttempts}):`,
      lastResult.error
    )
  }

  return lastResult
}

/**
 * Emit webhook event to all subscribed webhooks
 */
export async function emitWebhookEvent(
  adminId: string,
  event: string,
  data: any,
  metadata?: any
): Promise<void> {
  // Find all active webhooks subscribed to this event
  const subscriptions = await db.webhookSubscription.findMany({
    where: {
      adminId,
      isActive: true,
    },
  })

  // Filter subscriptions that are listening to this event
  const relevantSubscriptions = subscriptions.filter((sub) => {
    return sub.events.includes(event) || sub.events.includes('*')
  })

  if (relevantSubscriptions.length === 0) {
    console.log(`No active webhooks subscribed to event: ${event}`)
    return
  }

  // Prepare payload
  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data,
    metadata,
  }

  console.log(
    `Emitting webhook event "${event}" to ${relevantSubscriptions.length} subscription(s)`
  )

  // Send to all subscriptions in parallel
  const deliveryPromises = relevantSubscriptions.map((subscription) =>
    sendWebhookWithRetry(
      {
        id: subscription.id,
        url: subscription.url,
        secret: subscription.secret,
        customHeaders: subscription.customHeaders,
      },
      payload
    )
  )

  const results = await Promise.allSettled(deliveryPromises)

  // Log results
  const successful = results.filter(
    (r) => r.status === 'fulfilled' && r.value.success
  ).length
  const failed = results.length - successful

  console.log(
    `Webhook event "${event}" delivered: ${successful} succeeded, ${failed} failed`
  )
}

/**
 * Webhook event types
 */
export const WEBHOOK_EVENTS = {
  // User events
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',

  // Booking events
  BOOKING_CREATED: 'booking.created',
  BOOKING_UPDATED: 'booking.updated',
  BOOKING_CANCELLED: 'booking.cancelled',
  BOOKING_COMPLETED: 'booking.completed',

  // QR Code events
  QR_CREATED: 'qr.created',
  QR_SCANNED: 'qr.scanned',
  QR_VALIDATED: 'qr.validated',

  // Tag events
  TAG_ADDED: 'tag.added',
  TAG_REMOVED: 'tag.removed',

  // Custom field events
  CUSTOM_FIELD_UPDATED: 'customfield.updated',

  // Test event
  WEBHOOK_TEST: 'webhook.test',
} as const

export type WebhookEvent = typeof WEBHOOK_EVENTS[keyof typeof WEBHOOK_EVENTS]
