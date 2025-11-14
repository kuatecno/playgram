import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { apiResponse } from '@/lib/utils/api-response'
import { requireAuth } from '@/lib/auth/session'
import { z } from 'zod'
import { verificationService, hashApiKey } from '@/features/verification/services/VerificationService'

const CreateApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  websiteDomain: z.string().min(1).max(255),
  servicePrefix: z.string().min(3).max(3).regex(/^[A-Z0-9]{3}$/),
  maxRequestsPerHour: z.number().int().min(1).max(1000).optional().default(100),
  maxRequestsPerDay: z.number().int().min(1).max(10000).optional().default(1000),
  metadata: z.record(z.string(), z.any()).optional(),
})

/**
 * GET /api/v1/verification/api-keys
 * List all API keys for the authenticated admin
 */
export async function GET() {
  try {
    const user = await requireAuth()

    const apiKeys = await db.verificationApiKey.findMany({
      where: { adminId: user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        websiteDomain: true,
        servicePrefix: true,
        active: true,
        maxRequestsPerHour: true,
        maxRequestsPerDay: true,
        lastUsedAt: true,
        requestCount: true,
        createdAt: true,
        updatedAt: true,
        // apiKey is intentionally excluded for security
      },
    })

    return apiResponse.success({ apiKeys })
  } catch (error) {
    console.error('Failed to list API keys:', error)
    return apiResponse.error(error)
  }
}

/**
 * POST /api/v1/verification/api-keys
 * Create a new API key
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const validated = CreateApiKeySchema.parse(body)

    // Generate new API key
    const rawApiKey = verificationService.generateApiKey()
    const hashedKey = hashApiKey(rawApiKey)

    // Check if service prefix is already in use
    const existingPrefix = await db.verificationApiKey.findFirst({
      where: {
        adminId: user.id,
        servicePrefix: validated.servicePrefix,
      },
    })

    if (existingPrefix) {
      return apiResponse.validationError(
        `Service prefix "${validated.servicePrefix}" is already in use. Please choose a different prefix.`
      )
    }

    // Create API key
    const apiKey = await db.verificationApiKey.create({
      data: {
        adminId: user.id,
        name: validated.name,
        websiteDomain: validated.websiteDomain,
        servicePrefix: validated.servicePrefix,
        apiKey: hashedKey,
        maxRequestsPerHour: validated.maxRequestsPerHour,
        maxRequestsPerDay: validated.maxRequestsPerDay,
        metadata: validated.metadata ? JSON.stringify(validated.metadata) : null,
        active: true,
      },
      select: {
        id: true,
        name: true,
        websiteDomain: true,
        servicePrefix: true,
        active: true,
        maxRequestsPerHour: true,
        maxRequestsPerDay: true,
        createdAt: true,
      },
    })

    return apiResponse.success({
      apiKey: {
        ...apiKey,
        // Return the raw API key ONLY on creation (won't be shown again)
        key: rawApiKey,
      },
      message: 'API key created successfully. Save this key securely - it will not be shown again.',
    })
  } catch (error) {
    console.error('Failed to create API key:', error)

    if (error instanceof z.ZodError) {
      return apiResponse.validationError('Invalid request data')
    }

    return apiResponse.error(error)
  }
}
