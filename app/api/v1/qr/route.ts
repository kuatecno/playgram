import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth/session'
import { apiResponse } from '@/lib/utils/api-response'
import { qrCodeService } from '@/features/qr-codes/services/QRCodeService'
import { db } from '@/lib/db'

const generateQRSchema = z.object({
  toolId: z.string().min(1, 'Tool ID is required'),
  type: z.enum(['promotion', 'validation', 'discount']).optional(),
  qrType: z.enum(['promotion', 'validation', 'discount']).optional(),
  label: z.string().optional(),
  userId: z.string().optional(),
  data: z.object({
    message: z.string().optional(),
    discountAmount: z.number().optional(),
    discountType: z.enum(['percentage', 'fixed']).optional(),
    validUntil: z.string().datetime().optional(),
    maxScans: z.number().int().positive().optional(),
    metadata: z.record(z.unknown()).optional(),
  }).optional(),
  metadata: z.record(z.unknown()).optional(),
}).refine((data) => data.type || data.qrType, {
  message: 'Either type or qrType is required',
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
 *
 * Supports both authenticated (admin session) and unauthenticated (ManyChat External Request) access.
 * For unauthenticated access, requires valid toolId and userId.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    const validated = generateQRSchema.parse(body)

    // Normalize type field (accept both 'type' and 'qrType')
    const qrType = validated.type || validated.qrType || 'promotion'

    // Try to get authenticated user
    let adminId: string | undefined
    try {
      const user = await requireAuth()
      adminId = user.id
    } catch (authError) {
      // If authentication fails, verify the tool exists and get its owner
      const tool = await db.tool.findUnique({
        where: { id: validated.toolId },
        select: { adminId: true, isActive: true },
      })

      if (!tool) {
        return apiResponse.validationError('Invalid tool ID')
      }

      if (!tool.isActive) {
        return apiResponse.validationError('Tool is not active')
      }

      // For unauthenticated requests, require userId
      if (!validated.userId) {
        return apiResponse.validationError('userId is required for external requests')
      }

      adminId = tool.adminId
    }

    // Generate label if not provided
    const label = validated.label || `${qrType}-${Date.now()}`

    // Convert validUntil string to Date if provided
    const data = {
      ...(validated.data || {}),
      ...(validated.metadata ? { metadata: validated.metadata } : {}),
      validUntil: validated.data?.validUntil
        ? new Date(validated.data.validUntil)
        : undefined,
    }

    // Generate QR code
    const result = await qrCodeService.generateQRCode({
      adminId,
      toolId: validated.toolId,
      type: qrType,
      label,
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
