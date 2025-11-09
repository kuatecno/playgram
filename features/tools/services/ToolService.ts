import { db } from '@/lib/db'

export interface CreateToolParams {
  adminId: string
  name: string
  description?: string
  category: string
  icon?: string
  url?: string
  apiEndpoint?: string
  config?: Record<string, unknown>
}

export interface UpdateToolParams {
  name?: string
  description?: string
  category?: string
  icon?: string
  url?: string
  apiEndpoint?: string
  config?: Record<string, unknown>
  isActive?: boolean
}

export class ToolService {
  /**
   * Create a new tool
   */
  async createTool(params: CreateToolParams) {
    const {
      adminId,
      name,
      description,
      category,
      icon,
      url,
      apiEndpoint,
      config,
    } = params

    const tool = await db.tool.create({
      data: {
        adminId,
        name,
        description,
        category,
        icon,
        url,
        apiEndpoint,
        config,
        isActive: true,
        usageCount: 0,
      },
    })

    return tool
  }

  /**
   * Update tool
   */
  async updateTool(toolId: string, adminId: string, params: UpdateToolParams) {
    const updated = await db.tool.updateMany({
      where: {
        id: toolId,
        adminId,
      },
      data: params,
    })

    if (updated.count === 0) {
      throw new Error('Tool not found')
    }

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

    return tool
  }

  /**
   * List tools
   */
  async listTools(
    adminId: string,
    options?: {
      category?: string
      isActive?: boolean
      limit?: number
      offset?: number
    }
  ) {
    const where: any = { adminId }

    if (options?.category) {
      where.category = options.category
    }

    if (options?.isActive !== undefined) {
      where.isActive = options.isActive
    }

    const [tools, total] = await Promise.all([
      db.tool.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 50,
        skip: options?.offset || 0,
      }),
      db.tool.count({ where }),
    ])

    return {
      tools,
      total,
      limit: options?.limit || 50,
      offset: options?.offset || 0,
    }
  }

  /**
   * Get tool statistics
   */
  async getToolStats(adminId: string) {
    const [total, active, byCategory] = await Promise.all([
      // Total tools
      db.tool.count({ where: { adminId } }),

      // Active tools
      db.tool.count({ where: { adminId, isActive: true } }),

      // By category
      db.tool.groupBy({
        by: ['category'],
        where: { adminId },
        _count: true,
        _sum: {
          usageCount: true,
        },
      }),
    ])

    // Total usage
    const totalUsage = await db.tool.aggregate({
      where: { adminId },
      _sum: { usageCount: true },
    })

    return {
      total,
      active,
      inactive: total - active,
      totalUsage: totalUsage._sum.usageCount || 0,
      byCategory: byCategory.map((stat) => ({
        category: stat.category,
        count: stat._count,
        usage: stat._sum.usageCount || 0,
      })),
    }
  }

  /**
   * Increment tool usage count
   */
  async incrementUsage(toolId: string, adminId: string, userId?: string) {
    // Verify tool exists and belongs to admin
    const tool = await db.tool.findFirst({
      where: {
        id: toolId,
        adminId,
      },
    })

    if (!tool) {
      throw new Error('Tool not found')
    }

    // Increment usage count
    await db.tool.update({
      where: { id: toolId },
      data: { usageCount: { increment: 1 } },
    })

    // Log usage
    if (userId) {
      await db.toolUsage.create({
        data: {
          toolId,
          userId,
          usedAt: new Date(),
        },
      })
    }

    return { success: true }
  }

  /**
   * Get tool usage history
   */
  async getToolUsage(
    toolId: string,
    adminId: string,
    options?: {
      limit?: number
      offset?: number
    }
  ) {
    // Verify tool belongs to admin
    const tool = await db.tool.findFirst({
      where: {
        id: toolId,
        adminId,
      },
    })

    if (!tool) {
      throw new Error('Tool not found')
    }

    const [usage, total] = await Promise.all([
      db.toolUsage.findMany({
        where: { toolId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
        },
        orderBy: { usedAt: 'desc' },
        take: options?.limit || 50,
        skip: options?.offset || 0,
      }),
      db.toolUsage.count({ where: { toolId } }),
    ])

    return {
      usage,
      total,
      limit: options?.limit || 50,
      offset: options?.offset || 0,
    }
  }

  /**
   * Get popular tools
   */
  async getPopularTools(adminId: string, limit: number = 10) {
    const tools = await db.tool.findMany({
      where: {
        adminId,
        isActive: true,
      },
      orderBy: { usageCount: 'desc' },
      take: limit,
    })

    return tools
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
      orderBy: { category: 'asc' },
    })

    // Group by category
    const grouped = tools.reduce((acc, tool) => {
      const category = tool.category
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(tool)
      return acc
    }, {} as Record<string, typeof tools>)

    return grouped
  }
}

export const toolService = new ToolService()
