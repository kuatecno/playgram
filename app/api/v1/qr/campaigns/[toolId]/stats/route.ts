import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { qrCampaignService } from '@/features/qr-codes/services/QRCampaignService'

/**
 * GET /api/v1/qr/campaigns/[toolId]/stats
 * Get campaign statistics for admin
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ toolId: string }> }
) {
  try {
    const user = await requireAuth()
    const { toolId } = await params

    // Verify tool ownership
    const tool = await db.tool.findFirst({
      where: {
        id: toolId,
        adminId: user.id,
        toolType: 'qr',
      },
    })

    if (!tool) {
      return NextResponse.json(
        { success: false, error: 'QR tool not found' },
        { status: 404 }
      )
    }

    const stats = await qrCampaignService.getCampaignStats(toolId)

    return NextResponse.json({
      success: true,
      data: stats,
    })
  } catch (error: any) {
    console.error('Error fetching campaign stats:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
