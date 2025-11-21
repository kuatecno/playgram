import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { db } from '@/lib/db'
import {
  qrToolConfigService,
  DEFAULT_QR_APPEARANCE,
  type UpdateQRToolConfigInput,
} from '@/features/qr-codes/services/QRToolConfigService'
import { isValidRedirectUrl, getAllowedDomains } from '@/lib/security/url-validator'

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
      select: { id: true, name: true },
    })

    if (!tool) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 })
    }

    const config = await qrToolConfigService.ensureConfigForTool(tool.id)
    const appearance = qrToolConfigService.getAppearance(config)

    return NextResponse.json({
      success: true,
      data: {
        toolId: tool.id,
        toolName: tool.name,
        qrFormat: config.formatPattern || '',
        qrAppearance: appearance || DEFAULT_QR_APPEARANCE,
        fallbackUrl: config.fallbackUrl || null,
        securityPolicy: config.securityPolicy || {},
        scannerInstructions: config.scannerInstructions || null,
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
    const { toolId, qrFormat, qrAppearance, fallbackUrl, securityPolicy, scannerInstructions } = body

    if (!toolId) {
      return NextResponse.json({ error: 'toolId is required' }, { status: 400 })
    }

    // Verify tool ownership
    const tool = await db.tool.findFirst({
      where: {
        id: toolId,
        adminId: user.id,
      },
      select: { id: true },
    })

    if (!tool) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 })
    }

    const updateInput: UpdateQRToolConfigInput = {}

    if (qrFormat !== undefined) {
      updateInput.formatPattern = qrFormat || null
    }

    if (qrAppearance !== undefined) {
      updateInput.appearance = qrAppearance || DEFAULT_QR_APPEARANCE
    }

    if (fallbackUrl !== undefined) {
      // Validate fallback URL for security (prevent open redirect)
      if (fallbackUrl && !isValidRedirectUrl(fallbackUrl)) {
        return NextResponse.json(
          {
            error: 'Invalid fallback URL',
            details: `URL must be on one of the allowed domains: ${getAllowedDomains().join(', ')}`
          },
          { status: 400 }
        )
      }
      updateInput.fallbackUrl = fallbackUrl || null
    }

    if (securityPolicy !== undefined) {
      updateInput.securityPolicy = securityPolicy || {}
    }

    if (scannerInstructions !== undefined) {
      updateInput.scannerInstructions = scannerInstructions || null
    }

    const updated = await qrToolConfigService.updateConfig(toolId, updateInput)
    const appearance = qrToolConfigService.getAppearance(updated)

    return NextResponse.json({
      success: true,
      data: {
        toolId,
        qrFormat: updated.formatPattern || '',
        qrAppearance: appearance,
        fallbackUrl: updated.fallbackUrl || null,
        securityPolicy: updated.securityPolicy || {},
        scannerInstructions: updated.scannerInstructions || null,
      },
    })
  } catch (error: any) {
    console.error('Failed to save QR tool settings:', error)
    return NextResponse.json(
      { error: 'Failed to save tool settings', details: error.message },
      { status: 500 }
    )
  }
}
