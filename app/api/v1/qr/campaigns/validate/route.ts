import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { qrCampaignService } from '@/features/qr-codes/services/QRCampaignService'

/**
 * POST /api/v1/qr/campaigns/validate
 * Validate a QR code and generate the next one for recurring campaigns
 *
 * This endpoint can be called publicly (e.g., from ManyChat webhook or scanner)
 *
 * Body: { code: string, userId?: string, manychatId?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { code, userId: bodyUserId, manychatId } = body

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'QR code is required' },
        { status: 400 }
      )
    }

    // Find the QR code
    const qrCode = await db.qRCode.findUnique({
      where: { code },
      include: {
        tool: {
          include: {
            qrConfig: true,
          },
        },
        user: true,
      },
    })

    if (!qrCode) {
      return NextResponse.json(
        { success: false, error: 'QR code not found' },
        { status: 404 }
      )
    }

    if (!qrCode.isRecurring) {
      return NextResponse.json(
        { success: false, error: 'This QR code is not part of a recurring campaign' },
        { status: 400 }
      )
    }

    if (!qrCode.tool.qrConfig) {
      return NextResponse.json(
        { success: false, error: 'Tool configuration not found' },
        { status: 404 }
      )
    }

    // Determine user ID
    let userId = bodyUserId || qrCode.userId
    if (!userId && manychatId) {
      const user = await db.user.findUnique({
        where: { manychatId },
        select: { id: true },
      })
      if (user) {
        userId = user.id
      }
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID could not be determined' },
        { status: 400 }
      )
    }

    // Validate and generate next
    const result = await qrCampaignService.validateAndGenerateNext(
      qrCode.id,
      qrCode.toolId,
      userId,
      {
        isRecurring: qrCode.tool.qrConfig.isRecurring,
        maxCodesPerUser: qrCode.tool.qrConfig.maxCodesPerUser,
        rewardThreshold: qrCode.tool.qrConfig.rewardThreshold,
        autoResetOnReward: qrCode.tool.qrConfig.autoResetOnReward,
        recurringConfig: qrCode.tool.qrConfig.recurringConfig as any,
      }
    )

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error: any) {
    console.error('Error validating campaign code:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
