import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { qrCampaignService } from '@/features/qr-codes/services/QRCampaignService'

/**
 * POST /api/v1/qr/manychat/webhook
 * ManyChat webhook for QR campaign validation and code generation
 *
 * Expected payload from ManyChat:
 * {
 *   manychat_id: string,
 *   code: string,  // Current QR code to validate
 *   first_name?: string,
 *   last_name?: string,
 *   phone?: string
 * }
 *
 * Returns:
 * {
 *   success: boolean,
 *   next_code?: string,
 *   progress: {
 *     current_streak: number,
 *     total_scans: number,
 *     rewards_earned: number,
 *     next_reward_in: number | null
 *   },
 *   is_reward: boolean,
 *   message?: string
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { manychat_id, code, first_name, last_name, phone } = body

    if (!manychat_id || !code) {
      return NextResponse.json(
        {
          success: false,
          error: 'manychat_id and code are required',
          message: 'Invalid request. Please try again.',
        },
        { status: 400 }
      )
    }

    // Find or create user
    let user = await db.user.findUnique({
      where: { manychatId: manychat_id },
    })

    if (!user) {
      // Create new user from ManyChat data
      user = await db.user.create({
        data: {
          manychatId: manychat_id,
          name: [first_name, last_name].filter(Boolean).join(' ') || 'Unknown',
          phone: phone || undefined,
        },
      })
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
      },
    })

    if (!qrCode) {
      return NextResponse.json(
        {
          success: false,
          error: 'QR code not found',
          message: 'This QR code is not valid. Please check and try again.',
        },
        { status: 404 }
      )
    }

    // Check if this is a recurring campaign
    if (!qrCode.tool?.qrConfig?.isRecurring) {
      return NextResponse.json(
        {
          success: false,
          error: 'Not a recurring campaign',
          message: 'This QR code is not part of a recurring campaign.',
        },
        { status: 400 }
      )
    }

    // Check if code already scanned
    if (qrCode.scannedAt) {
      return NextResponse.json(
        {
          success: false,
          error: 'Code already used',
          message: 'This QR code has already been scanned. Please use your latest code.',
        },
        { status: 400 }
      )
    }

    // Validate and generate next code
    const config = qrCode.tool.qrConfig
    const settings = {
      isRecurring: config.isRecurring,
      rewardThreshold: config.rewardThreshold,
      maxCodesPerUser: config.maxCodesPerUser,
      autoResetOnReward: config.autoResetOnReward,
      recurringConfig: config.recurringConfig as any,
    }

    const result = await qrCampaignService.validateAndGenerateNext(
      qrCode.id,
      qrCode.toolId,
      user.id,
      settings
    )

    // If reward earned, update ManyChat
    if (result.isReward && result.rewardActions) {
      await updateManyChat(manychat_id, result.rewardActions, result.progress)
    }

    // Build response message
    let message = ''
    if (result.isReward) {
      message = result.rewardActions?.sendMessage || 'Congratulations! You earned a reward!'
    } else if (result.progress.nextRewardIn !== null) {
      message = `Great! ${result.progress.nextRewardIn} more to your next reward.`
    } else {
      message = 'Code validated successfully!'
    }

    // Return response in ManyChat-friendly format
    return NextResponse.json({
      success: true,
      next_code: result.nextCode?.code,
      progress: {
        current_streak: result.progress.currentStreak,
        total_scans: result.progress.totalScans,
        rewards_earned: result.progress.rewardsEarned,
        next_reward_in: result.progress.nextRewardIn,
      },
      is_reward: result.isReward,
      message,
      // Additional data for ManyChat custom fields
      custom_fields: {
        qr_current_streak: result.progress.currentStreak,
        qr_total_scans: result.progress.totalScans,
        qr_rewards_earned: result.progress.rewardsEarned,
        qr_next_code: result.nextCode?.code,
        qr_last_scan: new Date().toISOString(),
      },
    })
  } catch (error: any) {
    console.error('ManyChat webhook error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
        message: 'Something went wrong. Please try again later.',
      },
      { status: 500 }
    )
  }
}

/**
 * Update ManyChat via their API when a reward is earned
 */
async function updateManyChat(
  manychatId: string,
  rewardActions: any,
  progress: any
) {
  const MANYCHAT_API_KEY = process.env.MANYCHAT_API_KEY

  if (!MANYCHAT_API_KEY) {
    console.warn('MANYCHAT_API_KEY not configured, skipping ManyChat updates')
    return
  }

  try {
    const updates: any = {}

    // Add tags if configured
    if (rewardActions.addTags && rewardActions.addTags.length > 0) {
      updates.tags = rewardActions.addTags
    }

    // Update custom fields
    updates.custom_fields = {
      qr_current_streak: progress.currentStreak,
      qr_total_scans: progress.totalScans,
      qr_rewards_earned: progress.rewardsEarned,
      qr_last_reward: new Date().toISOString(),
    }

    // Call ManyChat API to update subscriber
    const response = await fetch(
      `https://api.manychat.com/fb/subscriber/setCustomFields`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${MANYCHAT_API_KEY}`,
        },
        body: JSON.stringify({
          subscriber_id: manychatId,
          fields: Object.entries(updates.custom_fields).map(([key, value]) => ({
            field_name: key,
            field_value: value,
          })),
        }),
      }
    )

    if (!response.ok) {
      console.error('Failed to update ManyChat custom fields:', await response.text())
    }

    // Add tags if specified
    if (updates.tags && updates.tags.length > 0) {
      const tagResponse = await fetch(
        `https://api.manychat.com/fb/subscriber/addTag`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${MANYCHAT_API_KEY}`,
          },
          body: JSON.stringify({
            subscriber_id: manychatId,
            tag_name: updates.tags[0], // ManyChat API adds one tag at a time
          }),
        }
      )

      if (!tagResponse.ok) {
        console.error('Failed to add ManyChat tag:', await tagResponse.text())
      }
    }

    // Send reward message if configured
    if (rewardActions.sendMessage) {
      const messageResponse = await fetch(
        `https://api.manychat.com/fb/subscriber/sendMessage`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${MANYCHAT_API_KEY}`,
          },
          body: JSON.stringify({
            subscriber_id: manychatId,
            message: {
              text: rewardActions.sendMessage,
            },
          }),
        }
      )

      if (!messageResponse.ok) {
        console.error('Failed to send ManyChat message:', await messageResponse.text())
      }
    }
  } catch (error) {
    console.error('Error updating ManyChat:', error)
  }
}
