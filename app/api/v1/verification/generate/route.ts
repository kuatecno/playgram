import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { apiResponse } from '@/lib/utils/api-response'
import { z } from 'zod'
import {
  verificationService,
  hashApiKey,
} from '@/features/verification/services/VerificationService'

const GenerateVerificationSchema = z.object({
  external_website: z.string().min(1),
  external_user_id: z.string().optional(),
  webhook_url: z.string().url().optional(),
  callback_token: z.string().optional(),
  expires_in_minutes: z.number().int().min(1).max(60).optional().default(10),
  metadata: z.record(z.string(), z.any()).optional(),
})

/**
 * POST /api/v1/verification/generate
 * Generate a verification code for Instagram identity verification
 *
 * External websites use this endpoint to create verification codes
 * that users will send via Instagram DM to prove identity
 */
export async function POST(request: NextRequest) {
  try {
    // Extract and validate API key from Authorization header
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return apiResponse.validationError('Missing or invalid Authorization header')
    }

    const apiKey = authHeader.substring(7) // Remove 'Bearer ' prefix

    // Validate API key
    const { valid, apiKeyRecord, error } = await verificationService.validateApiKey(apiKey)
    if (!valid || !apiKeyRecord) {
      return NextResponse.json(
        { error: error || 'Invalid API key' },
        { status: 401 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validated = GenerateVerificationSchema.parse(body)

    // Get client IP for tracking
    const ipAddress =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown'

    // Generate unique verification code with random prefix for security
    const {
      code,
      servicePrefix,
      sessionId,
      suffix,
    } = await verificationService.generateVerificationCode()

    // Calculate expiration time
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + validated.expires_in_minutes)

    // Create verification record
    const verification = await db.instagramVerification.create({
      data: {
        code,
        servicePrefix,
        sessionId,
        suffix,
        adminId: apiKeyRecord.adminId,
        externalWebsite: validated.external_website,
        externalUserId: validated.external_user_id,
        webhookUrl: validated.webhook_url,
        callbackToken: validated.callback_token,
        apiKeyUsed: hashApiKey(apiKey),
        expiresAt,
        ipAddress,
        metadata: validated.metadata ? JSON.stringify(validated.metadata) : null,
      },
    })

    // Update API key usage stats
    await db.verificationApiKey.update({
      where: { id: apiKeyRecord.id },
      data: {
        lastUsedAt: new Date(),
        requestCount: { increment: 1 },
      },
    })

    // Generate polling URL with session ID for security
    const baseUrl =
      process.env.NODE_ENV === 'production'
        ? process.env.NEXTAUTH_URL || 'https://playgram.kua.cl'
        : request.headers.get('origin') || 'http://localhost:3002'
    const pollingUrl = `${baseUrl}/api/v1/verification/check?session=${verification.id}`

    return apiResponse.success({
      code: verification.code,
      session_id: verification.id,
      expires_at: verification.expiresAt.toISOString(),
      polling_url: pollingUrl,
      instructions: {
        message: `Ask user to send "${code}" via Instagram DM to your account`,
        prefix: servicePrefix,
        note: 'The code will be validated when received via Instagram DM',
      },
    })
  } catch (error) {
    console.error('Error generating verification code:', error)

    if (error instanceof z.ZodError) {
      return apiResponse.validationError('Invalid request data')
    }

    return apiResponse.error(error)
  }
}
