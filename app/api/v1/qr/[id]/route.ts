import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth/session'
import { apiResponse } from '@/lib/utils/api-response'
import { qrCodeService } from '@/features/qr-codes/services/QRCodeService'

const updateQRSchema = z.object({
  label: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  maxScans: z.number().int().positive().nullable().optional(),
  data: z.record(z.unknown()).optional(),
})

/**
 * GET /api/v1/qr/:id
 * Get QR code details with scan history
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()

    const qrCode = await qrCodeService.getQRCodeDetails(params.id, user.id)

    // Generate scan URL for the response
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002'
    const scanUrl = `${baseUrl}/api/v1/qr/scan/${qrCode.code}`

    return apiResponse.success({
      ...qrCode,
      scanUrl,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'QR code not found') {
      return apiResponse.notFound('QR code not found')
    }
    return apiResponse.error(error)
  }
}

/**
 * PATCH /api/v1/qr/:id
 * Update QR code
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    const body = await request.json()

    // Validate input
    const validated = updateQRSchema.parse(body)

    await qrCodeService.updateQRCode(params.id, user.id, validated)

    return apiResponse.success({ message: 'QR code updated successfully' })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiResponse.validationError(error.errors[0].message)
    }
    if (error instanceof Error && error.message === 'QR code not found') {
      return apiResponse.notFound('QR code not found')
    }
    return apiResponse.error(error)
  }
}

/**
 * DELETE /api/v1/qr/:id
 * Delete QR code
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()

    await qrCodeService.deleteQRCode(params.id, user.id)

    return apiResponse.success({ message: 'QR code deleted successfully' })
  } catch (error) {
    if (error instanceof Error && error.message === 'QR code not found') {
      return apiResponse.notFound('QR code not found')
    }
    return apiResponse.error(error)
  }
}
