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
          tool: {
            adminId,
          },
        },
        include: {
          messages: true,
        },
      })
    }

    if (!conversation) {
      // Find a default tool for this admin
      const defaultTool = await db.tool.findFirst({
        where: {
          adminId,
          isActive: true,
        },
      })

      if (!defaultTool) {
        throw new Error('No active tools found for this admin')
      }

      conversation = await db.conversation.create({
        data: {
          userId,
          toolId: defaultTool.id,
        },
        include: {
          messages: true,
        },
      })
    }

    // Get conversation history
    const messages = conversation.messages || []

    // Get training data for context (if we implement this model later)
    const trainingData: any[] = []
    // const trainingData = await db.aITrainingData.findMany({
    //   where: { adminId, isActive: true },
    //   select: {
    //     category: true,
    //     question: true,
    //     answer: true,
    //   },
    //   take: 20,
    // })

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

    // Save conversation history
    await db.aIMessage.createMany({
      data: [
        {
          conversationId: conversation.id,
          role: 'user',
          content: message,
        },
        {
          conversationId: conversation.id,
          role: 'assistant',
          content: aiResponse,
          tokensUsed: completion.usage?.total_tokens || 0,
        },
      ],
    })

    await db.conversation.update({
      where: { id: conversation.id },
      data: {
        updatedAt: new Date(),
      },
    })

    // Log AI interaction (if we implement this model later)
    // await db.aIInteraction.create({
    //   data: {
    //     conversationId: conversation.id,
    //     adminId,
    //     userId,
    //     userMessage: message,
    //     aiResponse,
    //     model: 'gpt-4',
    //     tokensUsed: completion.usage?.total_tokens || 0,
    //   },
    // })

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
        tool: {
          adminId,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            igUsername: true,
          },
        },
        messages: {
          orderBy: {
            timestamp: 'asc',
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
              firstName: true,
              lastName: true,
              igUsername: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
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
    // Training data model not yet implemented
    // const { adminId, category, question, answer, keywords } = params
    // const trainingData = await db.aITrainingData.create({
    //   data: {
    //     adminId,
    //     category,
    //     question,
    //     answer,
    //     keywords: keywords || [],
    //     isActive: true,
    //   },
    // })
    // return trainingData
    
    return {
      id: 'temp-id',
      ...params,
      isActive: true,
      createdAt: new Date(),
    }
  }

  /**
   * Update training data
   */
  async updateTrainingData(
    _trainingId: string,
    _adminId: string,
    _data: {
      category?: string
      question?: string
      answer?: string
      keywords?: string[]
      isActive?: boolean
    }
  ) {
    // Training data model not yet implemented
    // const updated = await db.aITrainingData.updateMany({
    //   where: {
    //     id: trainingId,
    //     adminId,
    //   },
    //   data,
    // })
    // if (updated.count === 0) {
    //   throw new Error('Training data not found')
    // }

    return { success: true }
  }

  /**
   * Delete training data
   */
  async deleteTrainingData(_trainingId: string, _adminId: string) {
    // Training data model not yet implemented
    // const deleted = await db.aITrainingData.deleteMany({
    //   where: {
    //     id: trainingId,
    //     adminId,
    //   },
    // })
    // if (deleted.count === 0) {
    //   throw new Error('Training data not found')
    // }

    return { success: true }
  }

  /**
   * List training data
   */
  async listTrainingData(_adminId: string, options?: {
    category?: string
    isActive?: boolean
    limit?: number
    offset?: number
  }) {
    // Training data model not yet implemented
    // const where: any = { adminId }
    // if (options?.category) {
    //   where.category = options.category
    // }
    // if (options?.isActive !== undefined) {
    //   where.isActive = options.isActive
    // }
    // const [trainingData, total] = await Promise.all([
    //   db.aITrainingData.findMany({
    //     where,
    //     orderBy: { createdAt: 'desc' },
    //     take: options?.limit || 100,
    //     skip: options?.offset || 0,
    //   }),
    //   db.aITrainingData.count({ where }),
    // ])

    return {
      trainingData: [],
      total: 0,
      limit: options?.limit || 100,
      offset: options?.offset || 0,
    }
  }

  /**
   * Get AI chat statistics
   */
  async getChatStats(adminId: string) {
    // Get conversation statistics
    const conversations = await db.conversation.findMany({
      where: {
        tool: {
          adminId,
        },
      },
      include: {
        messages: true,
      },
    })

    const totalConversations = conversations.length
    const totalMessages = conversations.reduce((sum: number, conv: any) => sum + conv.messages.length, 0)
    const recentConversations = conversations.filter(
      (conv: any) => conv.createdAt >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ).length

    return {
      totalInteractions: totalConversations,
      totalTokens: 0, // We'll track this when AIInteraction model is implemented
      recentInteractions: recentConversations,
      trainingDataCount: 0, // We'll track this when training data model is implemented
      byModel: [
        {
          model: 'gpt-4',
          interactions: totalMessages,
          tokensUsed: 0,
        },
      ],
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
