import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { previewQRCodeFormat } from '@/features/qr-codes/services/QRFormatResolver'

/**
 * POST /api/v1/qr/format-preview
 * Preview a QR code format pattern with sample data
 */
export async function POST(req: NextRequest) {
  try {
    await requireAuth()

    const body = await req.json()
    const { pattern } = body

    if (!pattern) {
      return NextResponse.json({ error: 'pattern is required' }, { status: 400 })
    }

    // Generate preview
    const preview = previewQRCodeFormat(pattern)

    return NextResponse.json({
      success: true,
      data: {
        pattern,
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
