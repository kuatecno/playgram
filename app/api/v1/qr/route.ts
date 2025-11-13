import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth/session'
import { apiResponse } from '@/lib/utils/api-response'
import { qrCodeService } from '@/features/qr-codes/services/QRCodeService'

const generateQRSchema = z.object({
  toolId: z.string().min(1, 'Tool ID is required'),
  type: z.enum(['promotion', 'validation', 'discount']),
  label: z.string().min(1, 'Label is required'),
  userId: z.string().optional(),
  data: z.object({
    message: z.string().optional(),
    discountAmount: z.number().optional(),
    discountType: z.enum(['percentage', 'fixed']).optional(),
    validUntil: z.string().datetime().optional(),
    maxScans: z.number().int().positive().optional(),
    metadata: z.record(z.unknown()).optional(),
  }),
})

/**
 * GET /api/v1/qr
 * List QR codes for authenticated admin
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = request.nextUrl

    const toolId = searchParams.get('toolId') || undefined
    const qrType = searchParams.get('type') || undefined
    const limit = searchParams.get('limit')
      ? parseInt(searchParams.get('limit')!)
      : 50
    const offset = searchParams.get('offset')
      ? parseInt(searchParams.get('offset')!)
      : 0

    const result = await qrCodeService.listQRCodes(user.id, {
      toolId,
      qrType,
      limit,
      offset,
    })

    return apiResponse.success(result)
  } catch (error) {
    return apiResponse.error(error)
  }
}

/**
 * POST /api/v1/qr
 * Generate a new QR code
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()

    // Validate input
    const validated = generateQRSchema.parse(body)

    // Convert validUntil string to Date if provided
    const data = {
      ...validated.data,
      validUntil: validated.data.validUntil
        ? new Date(validated.data.validUntil)
        : undefined,
    }

    // Generate QR code
    const result = await qrCodeService.generateQRCode({
      adminId: user.id,
      toolId: validated.toolId,
      type: validated.type,
      label: validated.label,
      userId: validated.userId,
      data,
    })

    return apiResponse.success(result, 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiResponse.validationError(error.errors[0].message)
    }
    return apiResponse.error(error)
  }
}
