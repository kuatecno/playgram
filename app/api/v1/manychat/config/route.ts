import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { manychatService } from '@/features/manychat/services/ManychatService'

/**
 * GET /api/v1/manychat/config
 * Get Manychat configuration for current admin
 */
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const config = await manychatService.getConfig(session.user.id)

    // Don't send encrypted tokens to client
    const safeConfig = config
      ? {
          id: config.id,
          pageName: config.pageName,
          isConnected: config.isConnected,
          createdAt: config.createdAt,
          updatedAt: config.updatedAt,
        }
      : null

    return NextResponse.json({
      success: true,
      data: safeConfig,
    })
  } catch (error) {
    console.error('Error fetching Manychat config:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/v1/manychat/config
 * Save Manychat configuration
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { apiToken, pageToken } = body

    if (!apiToken) {
      return NextResponse.json(
        { success: false, error: 'API token is required' },
        { status: 400 }
      )
    }

    const config = await manychatService.saveConfig(
      session.user.id,
      apiToken,
      pageToken
    )

    // Don't send encrypted tokens to client
    const safeConfig = {
      id: config.id,
      pageName: config.pageName,
      isConnected: config.isConnected,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    }

    return NextResponse.json({
      success: true,
      data: safeConfig,
      message: 'Manychat connected successfully',
    })
  } catch (error) {
    console.error('Error saving Manychat config:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save configuration',
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/v1/manychat/config
 * Delete Manychat configuration
 */
export async function DELETE() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    await manychatService.deleteConfig(session.user.id)

    return NextResponse.json({
      success: true,
      message: 'Manychat disconnected successfully',
    })
  } catch (error) {
    console.error('Error deleting Manychat config:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}
