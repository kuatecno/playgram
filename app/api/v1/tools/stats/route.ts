import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { apiResponse } from '@/lib/utils/api-response'
import { toolService } from '@/features/tools/services/ToolService'

/**
 * GET /api/v1/tools/stats
 * Get tool statistics for authenticated admin
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()

    const stats = await toolService.getToolStats(user.id)

    return apiResponse.success(stats)
  } catch (error) {
    return apiResponse.error(error)
  }
}
