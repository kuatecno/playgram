import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { db } from '@/lib/db'

/**
 * GET /api/v1/qr/campaigns/[toolId]/config
 * Get recurring campaign configuration for a QR tool
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

    const config = tool.qrConfig

    return NextResponse.json({
      success: true,
      data: {
        isRecurring: config.isRecurring,
        maxCodesPerUser: config.maxCodesPerUser,
        rewardThreshold: config.rewardThreshold,
        autoResetOnReward: config.autoResetOnReward,
        recurringConfig: config.recurringConfig,
      },
    })
  } catch (error: any) {
    console.error('Error fetching campaign config:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/v1/qr/campaigns/[toolId]/config
 * Update recurring campaign configuration
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ toolId: string }> }
) {
  try {
    const user = await requireAuth()
    const { toolId } = await params
    const body = await req.json()

    // Verify tool ownership
    const tool = await db.tool.findFirst({
      where: {
        id: toolId,
        adminId: user.id,
        toolType: 'qr',
      },
      include: {
        qrConfig: true,
      },
    })

    if (!tool) {
      return NextResponse.json(
        { success: false, error: 'QR tool not found' },
        { status: 404 }
      )
    }

    // Update or create config
    let config
    if (tool.qrConfig) {
      config = await db.qRToolConfig.update({
        where: { id: tool.qrConfig.id },
        data: {
          isRecurring: body.isRecurring ?? undefined,
          maxCodesPerUser: body.maxCodesPerUser !== undefined ? body.maxCodesPerUser : undefined,
          rewardThreshold: body.rewardThreshold !== undefined ? body.rewardThreshold : undefined,
          autoResetOnReward: body.autoResetOnReward ?? undefined,
          recurringConfig: body.recurringConfig ? (body.recurringConfig as any) : undefined,
        },
      })
    } else {
      config = await db.qRToolConfig.create({
        data: {
          toolId,
          isRecurring: body.isRecurring ?? false,
          maxCodesPerUser: body.maxCodesPerUser,
          rewardThreshold: body.rewardThreshold,
          autoResetOnReward: body.autoResetOnReward ?? true,
          recurringConfig: body.recurringConfig ? (body.recurringConfig as any) : undefined,
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        isRecurring: config.isRecurring,
        maxCodesPerUser: config.maxCodesPerUser,
        rewardThreshold: config.rewardThreshold,
        autoResetOnReward: config.autoResetOnReward,
        recurringConfig: config.recurringConfig,
      },
    })
  } catch (error: any) {
    console.error('Error updating campaign config:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
