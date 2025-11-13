import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import {
  previewQRCodeFormat,
  resolveQRCodeFormat,
  fetchUserDataForQR,
} from '@/features/qr-codes/services/QRFormatResolver'
import { qrToolConfigService } from '@/features/qr-codes/services/QRToolConfigService'

/**
 * POST /api/v1/qr/format-preview
 * Preview a QR code format pattern with sample data
 */
export async function POST(req: NextRequest) {
  try {
    await requireAuth()

    const body = await req.json()
    const { pattern, toolId, userId, metadata } = body

    let formatPattern = pattern as string | undefined

    if (!formatPattern && toolId) {
      const config = await qrToolConfigService.getConfig(toolId)
      formatPattern = config?.formatPattern || undefined
    }

    if (!formatPattern) {
      return NextResponse.json({ error: 'pattern or toolId is required' }, { status: 400 })
    }

    const hasUserContext = typeof userId === 'string' && userId.length > 0
    const hasMetadata = metadata && typeof metadata === 'object'

    let preview: string

    if (!hasUserContext && !hasMetadata) {
      // Use sample data preview when no personalization requested
      preview = previewQRCodeFormat(formatPattern)
    } else {
      const resolverData: any = {
        metadata: hasMetadata ? metadata : {},
      }

      if (hasUserContext) {
        const userData = await fetchUserDataForQR(userId)
        Object.assign(resolverData, userData)

        if (hasMetadata) {
          resolverData.metadata = {
            ...(userData.metadata || {}),
            ...metadata,
          }
        }
      }

      preview = resolveQRCodeFormat(formatPattern, resolverData)
    }

    return NextResponse.json({
      success: true,
      data: {
        pattern: formatPattern,
        preview,
      },
    })
  } catch (error: any) {
    console.error('Failed to preview QR format:', error)
    return NextResponse.json(
      { error: 'Failed to preview format', details: error.message },
      { status: 500 }
    )
  }
}
