/**
 * Queue System Test Endpoint
 * Test at: /api/test/queue
 */

import { NextResponse } from 'next/server'
import { getQueueHealth, addWebhookJob } from '@/lib/queue'

export async function GET() {
  try {
    // Check Redis connection first
    if (!process.env.REDIS_URL) {
      return NextResponse.json(
        {
          success: false,
          error: 'REDIS_URL not configured',
        },
        { status: 500 }
      )
    }

    // Get queue health
    const health = await getQueueHealth()

    // Calculate totals
    const totals = health.reduce(
      (acc, queue) => ({
        waiting: acc.waiting + queue.waiting,
        active: acc.active + queue.active,
        completed: acc.completed + queue.completed,
        failed: acc.failed + queue.failed,
        delayed: acc.delayed + queue.delayed,
      }),
      { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 }
    )

    const allHealthy = health.every((q) => q.healthy)

    return NextResponse.json({
      success: true,
      message: 'Queue system is operational',
      healthy: allHealthy,
      queues: health,
      totals,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        tips: [
          'Check Redis connection at /api/test/redis',
          'Verify REDIS_URL environment variable',
          'Check Upstash dashboard for errors',
        ],
      },
      { status: 500 }
    )
  }
}

export async function POST() {
  try {
    // Add a test job to the queue
    const job = await addWebhookJob({
      webhookId: `test_${Date.now()}`,
      event: 'test.queue',
      url: 'https://webhook.site/test',
      payload: {
        message: 'Test job from Vercel',
        timestamp: new Date().toISOString(),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Test job added to queue',
      job: {
        id: job.id,
        data: job.data,
        opts: job.opts,
      },
      note: 'Job will be processed by the worker. If no worker is running, it will stay in the queue.',
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    )
  }
}
