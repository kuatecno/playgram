import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth/session'
import { apiResponse } from '@/lib/utils/api-response'
import { qrToolConfigService } from '@/features/qr-codes/services/QRToolConfigService'

const updateToolSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').optional(),
  description: z.string().max(500, 'Description too long').optional(),
  isActive: z.boolean().optional(),
})

/**
 * GET /api/v1/tools/qr/[toolId]
 * Get a specific QR tool with its configuration
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ toolId: string }> }
) {
  try {
    const user = await requireAuth()
    const { toolId } = await params

    // Get tool with ownership verification
    const tool = await qrToolConfigService.getTool(toolId, user.id)
    if (!tool) {
      return apiResponse.notFound('Tool not found')
    }

    // Ensure config exists (creates if missing)
    const config = await qrToolConfigService.ensureConfigForTool(toolId)

    return apiResponse.success({ tool, config })
  } catch (error) {
    return apiResponse.error(error)
  }
}

/**
 * PATCH /api/v1/tools/qr/[toolId]
 * Update tool metadata (name, description, isActive)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ toolId: string }> }
) {
  try {
    const user = await requireAuth()
    const { toolId } = await params
    const body = await request.json()

    // Validate input
    const validated = updateToolSchema.parse(body)

    // Update tool
    const tool = await qrToolConfigService.updateToolMetadata(
      toolId,
      user.id,
      validated
    )

    return apiResponse.success({ tool })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiResponse.validationError(error.errors[0].message)
    }
    return apiResponse.error(error)
  }
}

/**
 * DELETE /api/v1/tools/qr/[toolId]
 * Delete a QR tool (cascades to config and QR codes)
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ toolId: string }> }
) {
  try {
    const user = await requireAuth()
    const { toolId } = await params

    // Delete tool
    await qrToolConfigService.deleteTool(toolId, user.id)

    return apiResponse.success({ message: 'Tool deleted successfully' })
  } catch (error) {
    return apiResponse.error(error)
  }
}
