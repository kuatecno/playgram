import OpenAI from 'openai'
import { db } from '@/lib/db'

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatParams {
  userId: string
  adminId: string
  message: string
  conversationId?: string
}

export interface TrainingDataParams {
  adminId: string
  category: string
  question: string
  answer: string
  keywords?: string[]
}

export class AIChatService {
  /**
   * Send a message and get AI response
   */
  async chat(params: ChatParams) {
    const { userId, adminId, message, conversationId } = params

    if (!openai) {
      throw new Error('OpenAI API key not configured')
    }

    // Get or create conversation
    let conversation
    if (conversationId) {
      conversation = await db.conversation.findFirst({
        where: {
          id: conversationId,
          userId,
          adminId,
        },
      })
    }

    if (!conversation) {
      conversation = await db.conversation.create({
        data: {
          userId,
          adminId,
          platform: 'web',
          messages: [],
        },
      })
    }

    // Get conversation history
    const messages = (conversation.messages as any[]) || []

    // Get training data for context
    const trainingData = await db.aITrainingData.findMany({
      where: { adminId, isActive: true },
      select: {
        category: true,
        question: true,
        answer: true,
      },
      take: 20,
    })

    // Build system message with training data
    const systemContext = this.buildSystemContext(trainingData)

    // Build chat messages
    const chatMessages: ChatMessage[] = [
      { role: 'system', content: systemContext },
      ...messages.slice(-10).map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      })),
      { role: 'user', content: message },
    ]

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: chatMessages,
      temperature: 0.7,
      max_tokens: 500,
    })

    const aiResponse = completion.choices[0]?.message?.content || 'I apologize, but I could not generate a response.'

    // Update conversation with new messages
    const updatedMessages = [
      ...messages,
      { role: 'user', content: message, timestamp: new Date() },
      { role: 'assistant', content: aiResponse, timestamp: new Date() },
    ]

    await db.conversation.update({
      where: { id: conversation.id },
      data: {
        messages: updatedMessages,
        lastMessageAt: new Date(),
      },
    })

    // Log AI interaction
    await db.aIInteraction.create({
      data: {
        conversationId: conversation.id,
        adminId,
        userId,
        userMessage: message,
        aiResponse,
        model: 'gpt-4',
        tokensUsed: completion.usage?.total_tokens || 0,
      },
    })

    return {
      conversationId: conversation.id,
      message: aiResponse,
      tokensUsed: completion.usage?.total_tokens || 0,
    }
  }

  /**
   * Get conversation history
   */
  async getConversation(conversationId: string, adminId: string) {
    const conversation = await db.conversation.findFirst({
      where: {
        id: conversationId,
        adminId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    })

    if (!conversation) {
      throw new Error('Conversation not found')
    }

    return conversation
  }

  /**
   * List conversations
   */
  async listConversations(adminId: string, options?: {
    userId?: string
    limit?: number
    offset?: number
  }) {
    const where: any = { adminId }

    if (options?.userId) {
      where.userId = options.userId
    }

    const [conversations, total] = await Promise.all([
      db.conversation.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
        },
        orderBy: { lastMessageAt: 'desc' },
        take: options?.limit || 50,
        skip: options?.offset || 0,
      }),
      db.conversation.count({ where }),
    ])

    return {
      conversations,
      total,
      limit: options?.limit || 50,
      offset: options?.offset || 0,
    }
  }

  /**
   * Add training data
   */
  async addTrainingData(params: TrainingDataParams) {
    const { adminId, category, question, answer, keywords } = params

    const trainingData = await db.aITrainingData.create({
      data: {
        adminId,
        category,
        question,
        answer,
        keywords: keywords || [],
        isActive: true,
      },
    })

    return trainingData
  }

  /**
   * Update training data
   */
  async updateTrainingData(
    trainingId: string,
    adminId: string,
    data: {
      category?: string
      question?: string
      answer?: string
      keywords?: string[]
      isActive?: boolean
    }
  ) {
    const updated = await db.aITrainingData.updateMany({
      where: {
        id: trainingId,
        adminId,
      },
      data,
    })

    if (updated.count === 0) {
      throw new Error('Training data not found')
    }

    return { success: true }
  }

  /**
   * Delete training data
   */
  async deleteTrainingData(trainingId: string, adminId: string) {
    const deleted = await db.aITrainingData.deleteMany({
      where: {
        id: trainingId,
        adminId,
      },
    })

    if (deleted.count === 0) {
      throw new Error('Training data not found')
    }

    return { success: true }
  }

  /**
   * List training data
   */
  async listTrainingData(adminId: string, options?: {
    category?: string
    isActive?: boolean
    limit?: number
    offset?: number
  }) {
    const where: any = { adminId }

    if (options?.category) {
      where.category = options.category
    }

    if (options?.isActive !== undefined) {
      where.isActive = options.isActive
    }

    const [trainingData, total] = await Promise.all([
      db.aITrainingData.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 100,
        skip: options?.offset || 0,
      }),
      db.aITrainingData.count({ where }),
    ])

    return {
      trainingData,
      total,
      limit: options?.limit || 100,
      offset: options?.offset || 0,
    }
  }

  /**
   * Get AI chat statistics
   */
  async getChatStats(adminId: string) {
    const [totalInteractions, totalTokens, byModel, recentInteractions] = await Promise.all([
      // Total interactions
      db.aIInteraction.count({ where: { adminId } }),

      // Total tokens used
      db.aIInteraction.aggregate({
        where: { adminId },
        _sum: { tokensUsed: true },
      }),

      // By model
      db.aIInteraction.groupBy({
        by: ['model'],
        where: { adminId },
        _count: true,
        _sum: { tokensUsed: true },
      }),

      // Recent interactions (last 7 days)
      db.aIInteraction.count({
        where: {
          adminId,
          timestamp: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ])

    // Total training data
    const trainingDataCount = await db.aITrainingData.count({
      where: { adminId, isActive: true },
    })

    return {
      totalInteractions,
      totalTokens: totalTokens._sum.tokensUsed || 0,
      recentInteractions,
      trainingDataCount,
      byModel: byModel.map((stat) => ({
        model: stat.model,
        interactions: stat._count,
        tokensUsed: stat._sum.tokensUsed || 0,
      })),
    }
  }

  /**
   * Build system context from training data
   */
  private buildSystemContext(trainingData: Array<{
    category: string
    question: string
    answer: string
  }>): string {
    let context = `You are a helpful AI assistant for a business. Answer questions based on the following knowledge base:\n\n`

    trainingData.forEach((data) => {
      context += `Category: ${data.category}\n`
      context += `Q: ${data.question}\n`
      context += `A: ${data.answer}\n\n`
    })

    context += `If asked about something not in the knowledge base, politely say you don't have that information and suggest contacting support.`

    return context
  }
}

export const aiChatService = new AIChatService()
