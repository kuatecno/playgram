import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth/session'
import { apiResponse } from '@/lib/utils/api-response'
import { qrToolConfigService } from '@/features/qr-codes/services/QRToolConfigService'

const createToolSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
})

/**
 * GET /api/v1/tools/qr
 * List all QR tools for authenticated admin
 */
export async function GET() {
  try {
    const user = await requireAuth()

    const tools = await qrToolConfigService.listTools(user.id)

    return apiResponse.success({ tools })
  } catch (error) {
    return apiResponse.error(error)
  }
}

/**
 * POST /api/v1/tools/qr
 * Create a new QR tool
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()

    // Validate input
    const validated = createToolSchema.parse(body)

    // Create tool
    const result = await qrToolConfigService.createTool(
      user.id,
      validated.name,
      validated.description
    )

    return apiResponse.success(result, 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiResponse.validationError(error.errors[0].message)
    }
    return apiResponse.error(error)
  }
}
