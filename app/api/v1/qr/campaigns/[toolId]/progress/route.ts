import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { qrCampaignService } from '@/features/qr-codes/services/QRCampaignService'

/**
 * GET /api/v1/qr/campaigns/[toolId]/progress?userId=xxx or ?manychatId=xxx
 * Get campaign progress for a specific user
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ toolId: string }> }
) {
  try {
    const { toolId } = await params
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    const manychatId = searchParams.get('manychatId')

    // Find user ID
    let finalUserId = userId
    if (!finalUserId && manychatId) {
      const user = await db.user.findUnique({
        where: { manychatId },
        select: { id: true },
      })
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404 }
        )
      }
      finalUserId = user.id
    }

    if (!finalUserId) {
      return NextResponse.json(
        { success: false, error: 'userId or manychatId required' },
        { status: 400 }
      )
    }

    // Get progress
    const progress = await qrCampaignService.getUserProgress(toolId, finalUserId)

    if (!progress) {
      return NextResponse.json(
        { success: false, error: 'No campaign progress found for this user' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: progress,
    })
  } catch (error: any) {
    console.error('Error fetching campaign progress:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
