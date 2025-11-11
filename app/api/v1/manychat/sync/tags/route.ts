import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { manychatService } from '@/features/manychat/services/ManychatService'

/**
 * POST /api/v1/manychat/sync/tags
 * Sync tags from Manychat to database
 */
export async function POST() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if Manychat is configured
    const config = await manychatService.getConfig(session.user.id)
    if (!config || !config.isConnected) {
      return NextResponse.json(
        { success: false, error: 'Manychat not configured' },
        { status: 400 }
      )
    }

    const synced = await manychatService.syncTags(session.user.id)

    return NextResponse.json({
      success: true,
      data: { synced },
      message: `Synced ${synced} tags`,
    })
  } catch (error) {
    console.error('Error syncing tags:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync tags',
      },
      { status: 500 }
    )
  }
}
