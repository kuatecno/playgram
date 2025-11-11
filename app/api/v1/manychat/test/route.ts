import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { manychatService } from '@/features/manychat/services/ManychatService'

/**
 * POST /api/v1/manychat/test
 * Test Manychat API connection
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
    const { apiToken } = body

    if (!apiToken) {
      return NextResponse.json(
        { success: false, error: 'API token is required' },
        { status: 400 }
      )
    }

    const isValid = await manychatService.testConnection(apiToken)

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid API token or connection failed' },
        { status: 400 }
      )
    }

    // Get page info to return
    const pageInfo = await manychatService.getPageInfo(apiToken)

    return NextResponse.json({
      success: true,
      data: {
        valid: true,
        pageInfo,
      },
      message: 'Connection successful',
    })
  } catch (error) {
    console.error('Error testing Manychat connection:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed',
      },
      { status: 500 }
    )
  }
}
