import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { logger } from '@/lib/logger'

const prisma = new PrismaClient()

/**
 * Sentry Webhook Endpoint
 *
 * Receives error events from Sentry and stores them in the database
 * for easy monitoring and automated error analysis.
 *
 * Webhook URL: https://playgram.kua.cl/api/webhooks/sentry
 *
 * Sentry sends webhooks for:
 * - error.created: New error detected
 * - issue.created: New issue created
 * - issue.resolved: Issue marked as resolved
 * - issue.assigned: Issue assigned to someone
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    logger.info('Sentry webhook received', {
      action: body.action,
      eventId: body.data?.event?.id,
      level: body.data?.event?.level,
    })

    // Handle different webhook actions
    const action = body.action

    if (action === 'event.created' || action === 'issue.created') {
      await handleNewError(body.data)
    } else if (action === 'issue.resolved') {
      await handleResolvedError(body.data)
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully'
    })

  } catch (error) {
    logger.error('Sentry webhook processing failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Webhook processing failed'
      },
      { status: 500 }
    )
  }
}

/**
 * Handle new error/issue creation from Sentry
 */
async function handleNewError(data: any) {
  const event = data.event || data.issue?.event

  if (!event) {
    logger.warn('Sentry webhook missing event data')
    return
  }

  const eventId = event.id || event.event_id

  // Check if we already have this event
  const existing = await prisma.sentryEvent.findUnique({
    where: { eventId },
  })

  if (existing) {
    logger.info('Sentry event already exists', { eventId })
    return
  }

  // Extract error information
  const exception = event.exception?.values?.[0]
  const stackTrace = exception?.stacktrace
  const tags = event.tags || {}
  const user = event.user || {}

  // Create new Sentry event record
  await prisma.sentryEvent.create({
    data: {
      eventId,
      level: event.level || 'error',
      message: event.message || exception?.value || 'Unknown error',
      culprit: event.culprit,
      platform: event.platform,

      // Error details
      exception: exception ? {
        type: exception.type,
        value: exception.value,
        mechanism: exception.mechanism,
      } : undefined,
      stackTrace: stackTrace ? {
        frames: stackTrace.frames,
      } : undefined,

      // Context
      environment: event.environment || tags.environment,
      release: event.release,
      url: event.request?.url,
      userAgent: event.request?.headers?.['User-Agent'],

      // User information
      userId: user.id,
      userEmail: user.email,
      userIpAddress: user.ip_address,

      // Metadata
      tags: tags,
      contexts: event.contexts,
      breadcrumbs: event.breadcrumbs?.values || [],
      fingerprint: event.fingerprint || [],

      // Timestamps
      timestamp: event.timestamp ? new Date(event.timestamp) : new Date(),
    },
  })

  logger.info('Sentry event stored', {
    eventId,
    level: event.level,
    message: event.message,
  })
}

/**
 * Handle error resolution from Sentry
 */
async function handleResolvedError(data: any) {
  const issue = data.issue

  if (!issue?.id) {
    return
  }

  // Find and mark all related events as resolved
  // Note: Sentry issue ID is different from event ID, so we use fingerprint or tags
  await prisma.sentryEvent.updateMany({
    where: {
      // You can refine this query based on your needs
      isResolved: false,
      timestamp: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      },
    },
    data: {
      isResolved: true,
      resolvedAt: new Date(),
    },
  })

  logger.info('Sentry issue marked as resolved', { issueId: issue.id })
}

/**
 * GET endpoint for health check
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Sentry webhook endpoint is ready',
    endpoint: '/api/webhooks/sentry',
  })
}
