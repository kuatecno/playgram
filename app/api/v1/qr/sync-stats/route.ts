import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { getQRSyncStats } from '@/features/qr-codes/services/QRManychatSync'
import { db } from '@/lib/db'

/**
 * GET /api/v1/qr/sync-stats?toolId=xxx
 * Get sync statistics for a QR tool
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()

    const { searchParams } = new URL(req.url)
    const toolId = searchParams.get('toolId')

    if (!toolId) {
      return NextResponse.json({ error: 'toolId is required' }, { status: 400 })
    }

    // Verify tool ownership
    const tool = await db.tool.findFirst({
      where: {
        id: toolId,
        adminId: user.id,
      },
    })

    if (!tool) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 })
    }

    // Get sync stats
    const stats = await getQRSyncStats(toolId, user.id)

    return NextResponse.json({
      success: true,
      data: stats,
    })
  } catch (error: any) {
    console.error('Failed to get QR sync stats:', error)
    return NextResponse.json(
      { error: 'Failed to get sync statistics', details: error.message },
      { status: 500 }
    )
  }
}
