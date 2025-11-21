import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { qrCampaignService } from '@/features/qr-codes/services/QRCampaignService'

/**
 * POST /api/v1/qr/campaigns/[toolId]/generate
 * Generate initial QR code for a user in a recurring campaign
 *
 * Body: { userId: string } or { manychatId: string }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ toolId: string }> }
) {
  try {
    const admin = await requireAuth()
    const { toolId } = await params
    const body = await req.json()

    // Verify tool ownership
    const tool = await db.tool.findFirst({
      where: {
        id: toolId,
        adminId: admin.id,
        toolType: 'qr',
      },
      include: {
        qrConfig: true,
      },
    })

    if (!tool || !tool.qrConfig) {
      return NextResponse.json(
        { success: false, error: 'QR tool not found' },
        { status: 404 }
      )
    }

    if (!tool.qrConfig.isRecurring) {
      return NextResponse.json(
        { success: false, error: 'This tool is not configured for recurring campaigns' },
        { status: 400 }
      )
    }

    // Find user
    let userId = body.userId
    if (!userId && body.manychatId) {
      const user = await db.user.findUnique({
        where: { manychatId: body.manychatId },
        select: { id: true },
      })
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404 }
        )
      }
      userId = user.id
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId or manychatId required' },
        { status: 400 }
      )
    }

    // Generate initial code
    const result = await qrCampaignService.generateInitialCode(toolId, userId, {
      isRecurring: tool.qrConfig.isRecurring,
      maxCodesPerUser: tool.qrConfig.maxCodesPerUser,
      rewardThreshold: tool.qrConfig.rewardThreshold,
      autoResetOnReward: tool.qrConfig.autoResetOnReward,
      recurringConfig: tool.qrConfig.recurringConfig as any,
    })

    return NextResponse.json({
      success: true,
      data: {
        qrCode: {
          id: result.qrCode.id,
          code: result.qrCode.code,
          qrCodeUrl: `/api/v1/qr/code/${result.qrCode.code}/image`,
        },
        progress: result.progress,
      },
    })
  } catch (error: any) {
    console.error('Error generating campaign code:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
