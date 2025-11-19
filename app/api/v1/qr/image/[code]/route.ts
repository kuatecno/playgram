import { NextRequest, NextResponse } from 'next/server'
import { qrCodeService } from '@/features/qr-codes/services/QRCodeService'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params
    const imageBuffer = await qrCodeService.getQRCodeImage(code)

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error('Error serving QR code image:', error)
    return new NextResponse('QR code not found', { status: 404 })
  }
}

