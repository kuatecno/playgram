import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { manychatService } from '@/features/manychat/services/ManychatService'

/**
 * GET /api/v1/manychat/fields
 * Get list of Manychat custom fields
 */
export async function GET() {
  try {
    const user = await requireAuth()

    // Get Manychat API token
    const apiToken = await manychatService.getApiToken(user.id)
    if (!apiToken) {
      return NextResponse.json({
        success: false,
        error: 'Manychat not connected',
        data: [],
      })
    }

    // Fetch custom fields from Manychat API
    try {
      const response = await fetch('https://api.manychat.com/fb/page/getCustomFields', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Manychat API error: ${response.status}`)
      }

      const data = await response.json()

      // Transform to our format
      const fields = (data.data || []).map((field: any) => ({
        id: field.id.toString(),
        name: field.name,
        type: field.type,
        description: field.description || '',
      }))

      return NextResponse.json({
        success: true,
        data: fields,
      })
    } catch (error: any) {
      console.error('Failed to fetch Manychat fields:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch Manychat fields',
        data: [],
      })
    }
  } catch (error: any) {
    console.error('Failed to get Manychat fields:', error)
    return NextResponse.json(
      { error: 'Failed to get Manychat fields', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/v1/manychat/fields
 * Create a new custom field in Manychat
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const { name, type, description } = body

    if (!name || !type) {
      return NextResponse.json(
        { error: 'Field name and type are required' },
        { status: 400 }
      )
    }

    // Get Manychat API token
    const apiToken = await manychatService.getApiToken(user.id)
    if (!apiToken) {
      return NextResponse.json(
        { error: 'Manychat not connected' },
        { status: 400 }
      )
    }

    // Create custom field in Manychat
    try {
      const response = await fetch('https://api.manychat.com/fb/page/createCustomField', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          type,
          description: description || `Playgram tracker: ${name}`,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `Manychat API error: ${response.status}`)
      }

      const data = await response.json()

      return NextResponse.json({
        success: true,
        data: {
          id: data.data.id.toString(),
          name: data.data.name,
          type: data.data.type,
          description: data.data.description,
        },
      })
    } catch (error: any) {
      console.error('Failed to create Manychat field:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to create Manychat field' },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Failed to create custom field:', error)
    return NextResponse.json(
      { error: 'Failed to create custom field', details: error.message },
      { status: 500 }
    )
  }
}
