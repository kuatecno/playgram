import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { manychatService } from '@/features/manychat/services/ManychatService'

/**
 * POST /api/v1/manychat/sync/contacts
 * Sync contacts from Manychat to database
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

    const result = await manychatService.syncContacts(session.user.id)

    return NextResponse.json({
      success: true,
      data: result,
      message: `Synced ${result.synced} contacts (${result.created} created, ${result.updated} updated)`,
    })
  } catch (error) {
    console.error('Error syncing contacts:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync contacts',
      },
      { status: 500 }
    )
  }
}
