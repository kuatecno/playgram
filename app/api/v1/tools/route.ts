import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth/session'
import { apiResponse } from '@/lib/utils/api-response'
import { toolService } from '@/features/tools/services/ToolService'

const createToolSchema = z.object({
  toolType: z.string().min(1, 'Tool type is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  category: z.string().optional(),
  icon: z.string().optional(),
  url: z.string().url().optional(),
  settings: z.record(z.unknown()).optional(),
  manychatFlowId: z.string().optional(),
})

/**
 * GET /api/v1/tools
 * List tools for authenticated admin
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = request.nextUrl

    const toolType = searchParams.get('toolType') || undefined
    const category = searchParams.get('category') || undefined
    const isActive = searchParams.get('isActive')
      ? searchParams.get('isActive') === 'true'
      : undefined
    const limit = searchParams.get('limit')
      ? parseInt(searchParams.get('limit')!)
      : 50
    const offset = searchParams.get('offset')
      ? parseInt(searchParams.get('offset')!)
      : 0

    const result = await toolService.listTools(user.id, {
      toolType,
      category,
      isActive,
      limit,
      offset,
    })

    return apiResponse.success(result)
  } catch (error) {
    return apiResponse.error(error)
  }
}

/**
 * POST /api/v1/tools
 * Create a new tool
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()

    // Validate input
    const validated = createToolSchema.parse(body)

    const tool = await toolService.createTool({
      adminId: user.id,
      ...validated,
    })

    return apiResponse.success(tool, 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiResponse.validationError(error.errors[0].message)
    }
    return apiResponse.error(error)
  }
}
