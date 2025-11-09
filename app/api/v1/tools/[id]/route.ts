import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth/session'
import { apiResponse } from '@/lib/utils/api-response'
import { toolService } from '@/features/tools/services/ToolService'

const updateToolSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  category: z.string().min(1).optional(),
  icon: z.string().optional(),
  url: z.string().url().optional(),
  apiEndpoint: z.string().url().optional(),
  config: z.record(z.unknown()).optional(),
  isActive: z.boolean().optional(),
})

/**
 * GET /api/v1/tools/:id
 * Get tool details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()

    const tool = await toolService.getTool(params.id, user.id)

    return apiResponse.success(tool)
  } catch (error) {
    if (error instanceof Error && error.message === 'Tool not found') {
      return apiResponse.notFound('Tool not found')
    }
    return apiResponse.error(error)
  }
}

/**
 * PATCH /api/v1/tools/:id
 * Update tool
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    const body = await request.json()

    // Validate input
    const validated = updateToolSchema.parse(body)

    await toolService.updateTool(params.id, user.id, validated)

    return apiResponse.success({ message: 'Tool updated successfully' })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiResponse.validationError(error.errors[0].message)
    }
    if (error instanceof Error && error.message === 'Tool not found') {
      return apiResponse.notFound('Tool not found')
    }
    return apiResponse.error(error)
  }
}

/**
 * DELETE /api/v1/tools/:id
 * Delete tool
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()

    await toolService.deleteTool(params.id, user.id)

    return apiResponse.success({ message: 'Tool deleted successfully' })
  } catch (error) {
    if (error instanceof Error && error.message === 'Tool not found') {
      return apiResponse.notFound('Tool not found')
    }
    return apiResponse.error(error)
  }
}
