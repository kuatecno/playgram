import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth/session'
import { apiResponse } from '@/lib/utils/api-response'
import { generateApiKey, hashApiKey } from '@/lib/utils/api-key'
import { db } from '@/lib/db'
import { FLOWKICK_TIERS } from '@/config/constants'

const createClientSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  tier: z.enum(['free', 'starter', 'pro', 'enterprise']),
  allowedPlatforms: z.array(z.enum(['instagram', 'tiktok', 'google', 'twitter', 'youtube', 'facebook'])),
  webhookUrl: z.string().url().optional(),
})

/**
 * GET /api/v1/admin/flowkick-clients
 * List all Flowkick API clients
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()

    // Get all clients for this admin
    const clients = await db.flowkickClient.findMany({
      where: { adminId: user.id },
      select: {
        id: true,
        name: true,
        tier: true,
        requestLimit: true,
        requestCount: true,
        allowedPlatforms: true,
        isActive: true,
        webhookUrl: true,
        createdAt: true,
        updatedAt: true,
        // Don't return API key (hashed)
      },
      orderBy: { createdAt: 'desc' },
    })

    return apiResponse.success(clients)
  } catch (error) {
    return apiResponse.error(error)
  }
}

/**
 * POST /api/v1/admin/flowkick-clients
 * Create a new Flowkick API client
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()

    // Validate input
    const validated = createClientSchema.parse(body)

    // Generate API key
    const apiKey = generateApiKey()
    const hashedKey = hashApiKey(apiKey)

    // Get tier configuration
    const tierConfig = FLOWKICK_TIERS[validated.tier.toUpperCase() as keyof typeof FLOWKICK_TIERS]

    // Create client
    const client = await db.flowkickClient.create({
      data: {
        adminId: user.id,
        name: validated.name,
        apiKey: hashedKey,
        tier: validated.tier,
        requestLimit: tierConfig.requestLimit,
        requestCount: 0,
        allowedPlatforms: validated.allowedPlatforms,
        webhookUrl: validated.webhookUrl,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        tier: true,
        requestLimit: true,
        allowedPlatforms: true,
        createdAt: true,
      },
    })

    return apiResponse.success(
      {
        client,
        apiKey, // Return the plain API key ONLY on creation
        message: 'API key created successfully. Save this key securely - it will not be shown again.',
      },
      201
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiResponse.validationError(error.errors[0].message)
    }
    return apiResponse.error(error)
  }
}
