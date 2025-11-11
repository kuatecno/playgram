import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { getQRSyncLogs } from '@/features/qr-codes/services/QRManychatSync'
import { db } from '@/lib/db'

/**
 * GET /api/v1/qr/sync-logs?qrCodeId=xxx&limit=50
 * Get sync logs for a QR code
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()

    const { searchParams } = new URL(req.url)
    const qrCodeId = searchParams.get('qrCodeId')
    const limitStr = searchParams.get('limit')
    const limit = limitStr ? parseInt(limitStr) : 50

    if (!qrCodeId) {
      return NextResponse.json({ error: 'qrCodeId is required' }, { status: 400 })
    }

    // Verify QR code ownership
    const qrCode = await db.qRCode.findFirst({
      where: {
        id: qrCodeId,
        tool: {
          adminId: user.id,
        },
      },
    })

    if (!qrCode) {
      return NextResponse.json({ error: 'QR code not found' }, { status: 404 })
    }

    // Get sync logs
    const logs = await getQRSyncLogs(qrCodeId, user.id, limit)

    return NextResponse.json({
      success: true,
      data: {
        logs,
        total: logs.length,
      },
    })
  } catch (error: any) {
    console.error('Failed to get QR sync logs:', error)
    return NextResponse.json(
      { error: 'Failed to get sync logs', details: error.message },
      { status: 500 }
    )
  }
}
