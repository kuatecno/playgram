import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { db } from '@/lib/db'

/**
 * GET /api/v1/qr/tool-settings?toolId=xxx
 * Get QR tool settings (format, appearance, etc.)
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()

    const { searchParams } = new URL(req.url)
    const toolId = searchParams.get('toolId')

    if (!toolId) {
      return NextResponse.json({ error: 'toolId is required' }, { status: 400 })
    }

    // Verify tool ownership and get settings
    const tool = await db.tool.findFirst({
      where: {
        id: toolId,
        adminId: user.id,
      },
      select: {
        id: true,
        name: true,
        settings: true,
      },
    })

    if (!tool) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 })
    }

    const settings = typeof tool.settings === 'string'
      ? JSON.parse(tool.settings)
      : tool.settings || {}

    return NextResponse.json({
      success: true,
      data: {
        toolId: tool.id,
        toolName: tool.name,
        qrFormat: settings.qrFormat || settings.qrCodeFormat || '',
        qrAppearance: settings.qrAppearance || {
          width: 512,
          margin: 2,
          errorCorrectionLevel: 'H',
          darkColor: '#000000',
          lightColor: '#FFFFFF',
        },
      },
    })
  } catch (error: any) {
    console.error('Failed to get QR tool settings:', error)
    return NextResponse.json(
      { error: 'Failed to get tool settings', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/v1/qr/tool-settings
 * Save QR tool settings (format, appearance, etc.)
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()

    const body = await req.json()
    const { toolId, qrFormat, qrAppearance } = body

    if (!toolId) {
      return NextResponse.json({ error: 'toolId is required' }, { status: 400 })
    }

    // Verify tool ownership
    const tool = await db.tool.findFirst({
      where: {
        id: toolId,
        adminId: user.id,
      },
      select: {
        settings: true,
      },
    })

    if (!tool) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 })
    }

    // Parse existing settings
    let settings: any = {}
    if (tool.settings) {
      try {
        settings = typeof tool.settings === 'string'
          ? JSON.parse(tool.settings)
          : tool.settings
      } catch (error) {
        console.error('Failed to parse existing settings:', error)
      }
    }

    // Update settings
    if (qrFormat !== undefined) {
      settings.qrFormat = qrFormat
      // Also set qrCodeFormat for backwards compatibility
      settings.qrCodeFormat = qrFormat
    }

    if (qrAppearance !== undefined) {
      settings.qrAppearance = qrAppearance
    }

    // Save back to database
    await db.tool.update({
      where: { id: toolId },
      data: {
        settings: JSON.parse(JSON.stringify(settings)), // Ensure JSON compatibility
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Tool settings saved successfully',
    })
  } catch (error: any) {
    console.error('Failed to save QR tool settings:', error)
    return NextResponse.json(
      { error: 'Failed to save tool settings', details: error.message },
      { status: 500 }
    )
  }
}
