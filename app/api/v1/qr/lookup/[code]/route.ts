import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth/session'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    // Ensure only admins can look up QR details this way
    await requireAuth()
    const { code } = await params

    const qrCode = await db.qRCode.findUnique({
      where: { code },
      include: {
        tool: {
          select: {
            id: true,
            name: true,
            qrType: true,
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            igUsername: true,
            manychatId: true,
          },
        },
      },
    })

    if (!qrCode) {
      return NextResponse.json(
        { success: false, error: 'QR code not found' },
        { status: 404 }
      )
    }

    // Calculate validity status
    let status = 'valid'
    let failureReason = null

    if (qrCode.expiresAt && new Date(qrCode.expiresAt) < new Date()) {
      status = 'invalid'
      failureReason = 'expired'
    }

    const metadata = (qrCode.metadata as any) || {}
    const maxScans = metadata.maxScans
    if (maxScans && qrCode.scanCount >= maxScans) {
      status = 'invalid'
      failureReason = 'max_scans_reached'
    }

    return NextResponse.json({
      success: true,
      data: {
        id: qrCode.id,
        code: qrCode.code,
        type: qrCode.qrType,
        status,
        failureReason,
        scannedAt: qrCode.scannedAt,
        expiresAt: qrCode.expiresAt,
        scanCount: qrCode.scanCount,
        maxScans: maxScans || null,
        tool: qrCode.tool,
        user: qrCode.user ? {
          id: qrCode.user.id,
          name: `${qrCode.user.firstName || ''} ${qrCode.user.lastName || ''}`.trim(),
          username: qrCode.user.igUsername,
          manychatId: qrCode.user.manychatId
        } : null,
        metadata: qrCode.metadata,
      },
    })
  } catch (error) {
    console.error('QR lookup error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to lookup QR code' },
      { status: 500 }
    )
  }
}

