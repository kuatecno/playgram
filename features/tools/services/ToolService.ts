import { db } from '@/lib/db'

export interface CreateToolParams {
  adminId: string
  toolType: string // qr, booking, ai, verification, custom
  name: string
  description?: string
  category?: string
  icon?: string
  url?: string
  settings?: Record<string, unknown>
  manychatFlowId?: string
}

export interface UpdateToolParams {
  name?: string
  description?: string
  toolType?: string
  category?: string
  icon?: string
  url?: string
  settings?: Record<string, unknown>
  isActive?: boolean
  manychatFlowId?: string
}

export class ToolService {
  /**
   * Create a new tool
   */
  async createTool(params: CreateToolParams) {
    const {
      adminId,
      toolType,
      name,
      description,
      category,
      icon,
      url,
      settings,
      manychatFlowId,
    } = params

    // Serialize JSON fields to ensure compatibility
    const settingsJson = JSON.parse(JSON.stringify(settings || {}))
    const metadataJson = JSON.parse(JSON.stringify({
      ...(category && { category }),
      ...(icon && { icon }),
      ...(url && { url }),
    }))

    const tool = await db.tool.create({
      data: {
        adminId,
        toolType,
        name,
        description,
        settings: settingsJson,
        metadata: metadataJson,
        isActive: true,
        manychatFlowId,
      },
    })

    return tool
  }

  /**
   * Update tool
   */
  async updateTool(toolId: string, adminId: string, params: UpdateToolParams) {
    // Get existing tool to merge metadata
    const existing = await db.tool.findFirst({
      where: {
        id: toolId,
        adminId,
      },
    })

    if (!existing) {
      throw new Error('Tool not found')
    }

    const existingMeta = (existing.metadata as any) || {}
    const existingSettings = (existing.settings as any) || {}

    const updateData: any = {}

    if (params.name) updateData.name = params.name
    if (params.description !== undefined) updateData.description = params.description
    if (params.toolType) updateData.toolType = params.toolType
    if (params.isActive !== undefined) updateData.isActive = params.isActive
    if (params.manychatFlowId !== undefined) updateData.manychatFlowId = params.manychatFlowId

    // Merge settings
    if (params.settings) {
      updateData.settings = { ...existingSettings, ...params.settings }
    }

    // Merge metadata
    if (params.category || params.icon || params.url) {
      updateData.metadata = {
        ...existingMeta,
        ...(params.category && { category: params.category }),
        ...(params.icon && { icon: params.icon }),
        ...(params.url && { url: params.url }),
      }
    }

    await db.tool.update({
      where: { id: toolId },
      data: updateData,
    })

    return { success: true }
  }

  /**
   * Delete tool
   */
  async deleteTool(toolId: string, adminId: string) {
    const deleted = await db.tool.deleteMany({
      where: {
        id: toolId,
        adminId,
      },
    })

    if (deleted.count === 0) {
      throw new Error('Tool not found')
    }

    return { success: true }
  }

  /**
   * Get tool details
   */
  async getTool(toolId: string, adminId: string) {
    const tool = await db.tool.findFirst({
      where: {
        id: toolId,
        adminId,
      },
    })

    if (!tool) {
      throw new Error('Tool not found')
    }

    // Extract metadata fields for easier access
    const metadata = (tool.metadata as any) || {}

    return {
      ...tool,
      category: metadata.category,
      icon: metadata.icon,
      url: metadata.url,
    }
  }

  /**
   * List tools
   */
  async listTools(
    adminId: string,
    options?: {
      toolType?: string
      category?: string
      isActive?: boolean
      limit?: number
      offset?: number
    }
  ) {
    const where: any = { adminId }

    if (options?.toolType) {
      where.toolType = options.toolType
    }

    if (options?.isActive !== undefined) {
      where.isActive = options.isActive
    }

    let tools = await db.tool.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    })

    // Filter by category if specified (it's in metadata)
    if (options?.category) {
      tools = tools.filter((tool) => {
        const metadata = (tool.metadata as any) || {}
        return metadata.category === options.category
      })
    }

    const total = await db.tool.count({ where })

    // Extract metadata fields for easier access
    const toolsWithMeta = tools.map((tool) => {
      const metadata = (tool.metadata as any) || {}
      return {
        ...tool,
        category: metadata.category,
        icon: metadata.icon,
        url: metadata.url,
      }
    })

    return {
      tools: toolsWithMeta,
      total,
      limit: options?.limit || 50,
      offset: options?.offset || 0,
    }
  }

  /**
   * Get tool statistics
   */
  async getToolStats(adminId: string) {
    const [total, active, byType] = await Promise.all([
      // Total tools
      db.tool.count({ where: { adminId } }),

      // Active tools
      db.tool.count({ where: { adminId, isActive: true } }),

      // By type
      db.tool.groupBy({
        by: ['toolType'],
        where: { adminId },
        _count: true,
      }),
    ])

    // Get all tools to calculate category stats (since category is in JSON)
    const allTools = await db.tool.findMany({
      where: { adminId },
      select: { metadata: true },
    })

    const categoryStats: Record<string, number> = {}
    allTools.forEach((tool) => {
      const metadata = (tool.metadata as any) || {}
      const category = metadata.category || 'uncategorized'
      categoryStats[category] = (categoryStats[category] || 0) + 1
    })

    return {
      total,
      active,
      inactive: total - active,
      byType: byType.map((stat) => ({
        type: stat.toolType,
        count: stat._count,
      })),
      byCategory: Object.entries(categoryStats).map(([category, count]) => ({
        category,
        count,
      })),
    }
  }

  /**
   * Get tools by category
   */
  async getToolsByCategory(adminId: string) {
    const tools = await db.tool.findMany({
      where: {
        adminId,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    // Group by category
    const grouped = tools.reduce((acc, tool) => {
      const metadata = (tool.metadata as any) || {}
      const category = metadata.category || 'uncategorized'
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push({
        ...tool,
        category: metadata.category,
        icon: metadata.icon,
        url: metadata.url,
      })
      return acc
    }, {} as Record<string, any[]>)

    return grouped
  }

  /**
   * Get tools by type
   */
  async getToolsByType(adminId: string) {
    const tools = await db.tool.findMany({
      where: {
        adminId,
        isActive: true,
      },
      orderBy: { toolType: 'asc' },
    })

    // Group by toolType
    const grouped = tools.reduce((acc, tool) => {
      const type = tool.toolType
      if (!acc[type]) {
        acc[type] = []
      }
      const metadata = (tool.metadata as any) || {}
      acc[type].push({
        ...tool,
        category: metadata.category,
        icon: metadata.icon,
        url: metadata.url,
      })
      return acc
    }, {} as Record<string, any[]>)

    return grouped
  }
}

export const toolService = new ToolService()
