import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { logger } from '@/lib/logger'

const prisma = new PrismaClient()

/**
 * Get Recent Sentry Errors
 *
 * This endpoint allows Claude Code to read recent errors and provide automated analysis.
 *
 * Query Parameters:
 * - limit: Number of errors to return (default: 50, max: 100)
 * - hours: Only show errors from last N hours (default: 24)
 * - level: Filter by level (error, warning, info)
 * - environment: Filter by environment (production, development)
 * - unresolved: Only show unresolved errors (true/false, default: true)
 *
 * Example:
 * GET /api/sentry/recent-errors?limit=10&hours=1&level=error
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const hours = parseInt(searchParams.get('hours') || '24')
    const level = searchParams.get('level')
    const environment = searchParams.get('environment')
    const unresolvedOnly = searchParams.get('unresolved') !== 'false'

    // Calculate time threshold
    const timeThreshold = new Date(Date.now() - hours * 60 * 60 * 1000)

    // Build query filters
    const where: any = {
      timestamp: {
        gte: timeThreshold,
      },
    }

    if (unresolvedOnly) {
      where.isResolved = false
    }

    if (level) {
      where.level = level
    }

    if (environment) {
      where.environment = environment
    }

    // Fetch errors
    const errors = await prisma.sentryEvent.findMany({
      where,
      orderBy: {
        timestamp: 'desc',
      },
      take: limit,
      select: {
        id: true,
        eventId: true,
        level: true,
        message: true,
        culprit: true,
        platform: true,
        exception: true,
        stackTrace: true,
        environment: true,
        url: true,
        userId: true,
        userEmail: true,
        tags: true,
        contexts: true,
        fingerprint: true,
        isResolved: true,
        timestamp: true,
        receivedAt: true,
      },
    })

    // Get error statistics
    const stats = await getErrorStats(hours)

    logger.info('Recent errors fetched', {
      count: errors.length,
      hours,
      level,
      environment,
    })

    return NextResponse.json({
      success: true,
      data: {
        errors,
        stats,
        filters: {
          limit,
          hours,
          level: level || 'all',
          environment: environment || 'all',
          unresolvedOnly,
        },
      },
    })

  } catch (error) {
    logger.error('Failed to fetch recent errors', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch errors'
      },
      { status: 500 }
    )
  }
}

/**
 * Get error statistics for the specified time period
 */
async function getErrorStats(hours: number) {
  const timeThreshold = new Date(Date.now() - hours * 60 * 60 * 1000)

  // Total errors
  const totalErrors = await prisma.sentryEvent.count({
    where: {
      timestamp: { gte: timeThreshold },
    },
  })

  // Errors by level
  const errorsByLevel = await prisma.sentryEvent.groupBy({
    by: ['level'],
    where: {
      timestamp: { gte: timeThreshold },
    },
    _count: true,
  })

  // Errors by environment
  const errorsByEnvironment = await prisma.sentryEvent.groupBy({
    by: ['environment'],
    where: {
      timestamp: { gte: timeThreshold },
      environment: { not: null },
    },
    _count: true,
  })

  // Unresolved errors
  const unresolvedCount = await prisma.sentryEvent.count({
    where: {
      timestamp: { gte: timeThreshold },
      isResolved: false,
    },
  })

  // Most common errors (by message)
  const topErrors = await prisma.sentryEvent.groupBy({
    by: ['message'],
    where: {
      timestamp: { gte: timeThreshold },
    },
    _count: true,
    orderBy: {
      _count: {
        message: 'desc',
      },
    },
    take: 5,
  })

  return {
    total: totalErrors,
    unresolved: unresolvedCount,
    resolved: totalErrors - unresolvedCount,
    byLevel: errorsByLevel.reduce((acc, item) => {
      acc[item.level] = item._count
      return acc
    }, {} as Record<string, number>),
    byEnvironment: errorsByEnvironment.reduce((acc, item) => {
      if (item.environment) {
        acc[item.environment] = item._count
      }
      return acc
    }, {} as Record<string, number>),
    topErrors: topErrors.map(item => ({
      message: item.message,
      count: item._count,
    })),
  }
}

/**
 * POST endpoint to mark errors as resolved
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { eventIds } = body

    if (!eventIds || !Array.isArray(eventIds)) {
      return NextResponse.json(
        { success: false, error: 'eventIds array required' },
        { status: 400 }
      )
    }

    await prisma.sentryEvent.updateMany({
      where: {
        eventId: { in: eventIds },
      },
      data: {
        isResolved: true,
        resolvedAt: new Date(),
      },
    })

    logger.info('Errors marked as resolved', { count: eventIds.length })

    return NextResponse.json({
      success: true,
      message: `${eventIds.length} errors marked as resolved`,
    })

  } catch (error) {
    logger.error('Failed to mark errors as resolved', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    return NextResponse.json(
      { success: false, error: 'Failed to update errors' },
      { status: 500 }
    )
  }
}
