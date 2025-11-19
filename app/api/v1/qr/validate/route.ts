import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth/session'
import { validateQRCode } from '@/features/qr-codes/services/QRValidationService'

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await requireAuth()
    const body = await request.json()
    const { code } = body

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'QR code is required' },
        { status: 400 }
      )
    }

    // Find QR code to get owner details
    const qrCode = await db.qRCode.findUnique({
      where: { code },
      select: {
        userId: true,
        user: {
          select: {
            id: true,
            manychatId: true,
          },
        },
        tool: {
          select: {
            adminId: true,
          }
        }
      },
    })

    if (!qrCode) {
      return NextResponse.json(
        { success: false, error: 'QR code not found' },
        { status: 404 }
      )
    }

    // For admin-initiated validation, we use the QR code's owner as the "submitter"
    // This simulates the user presenting their own code
    const userId = qrCode.userId || undefined
    const manychatId = qrCode.user?.manychatId || undefined

    // Use the admin ID from the tool, or the current session user if they own the tool?
    // Ideally the tool belongs to the admin. validateQRCode needs the adminId to find configs.
    // We should probably check if the current session user has access to this tool.
    // For now, we assume the tool.adminId is the correct context.
    const adminId = qrCode.tool.adminId

    // Verify session user has access (optional but good security)
    if (adminId !== sessionUser.id) {
       // In a real multi-tenant app, we'd check if sessionUser is a member of adminId's team
       // For now, simple check:
       if (sessionUser.id !== adminId) {
         return NextResponse.json(
           { success: false, error: 'You do not have permission to validate this QR code' },
           { status: 403 }
         )
       }
    }

    const result = await validateQRCode(
      {
        qrCode: code,
        userId: userId || 'admin_scan', // Fallback if unassigned
        manychatId: manychatId,
        metadata: {
          source: 'admin_scanner',
          scannedBy: sessionUser.email,
        },
      },
      adminId
    )

    return NextResponse.json({
      success: result.success,
      data: result,
    })
  } catch (error) {
    console.error('QR validation error:', error)
    return NextResponse.json(
      { success: false, error: 'Validation failed' },
      { status: 500 }
    )
  }
}

