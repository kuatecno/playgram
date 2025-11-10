import { db } from '@/lib/db'

export interface GenerateVerificationCodeParams {
  apiKeyId: string
  sessionId?: string
  metadata?: Record<string, unknown>
}

export interface ValidateVerificationCodeParams {
  code: string
  igUsername: string
}

export class VerificationService {
  /**
   * Generate verification code for Instagram account verification
   * Used by external websites to verify Instagram account ownership
   */
  async generateVerificationCode(params: GenerateVerificationCodeParams) {
    const { apiKeyId, sessionId, metadata } = params

    // Generate unique 6-digit code
    const code = this.generateCode()

    // Set expiration (10 minutes from now)
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + 10)

    // Serialize metadata
    const metadataJson = metadata ? JSON.parse(JSON.stringify(metadata)) : null

    // Create verification
    const verification = await db.instagramVerification.create({
      data: {
        code,
        apiKeyId,
        sessionId,
        status: 'pending',
        expiresAt,
        metadata: metadataJson,
      },
      select: {
        id: true,
        code: true,
        expiresAt: true,
      },
    })

    return {
      verificationId: verification.id,
      code: verification.code,
      expiresAt: verification.expiresAt,
    }
  }

  /**
   * Validate verification code when user sends it via Instagram DM
   */
  async validateVerificationCode(params: ValidateVerificationCodeParams) {
    const { code, igUsername } = params

    // Find pending verification
    const verification = await db.instagramVerification.findFirst({
      where: {
        code,
        status: 'pending',
        expiresAt: { gte: new Date() },
      },
    })

    if (!verification) {
      return {
        success: false,
        message: 'Invalid or expired verification code',
      }
    }

    // Mark as verified
    await db.instagramVerification.update({
      where: { id: verification.id },
      data: {
        status: 'verified',
        igUsername,
        verifiedAt: new Date(),
      },
    })

    return {
      success: true,
      message: 'Instagram account verified successfully',
      verificationId: verification.id,
      sessionId: verification.sessionId,
    }
  }

  /**
   * Check verification status
   * Used by external websites to poll for verification completion
   */
  async checkVerificationStatus(code: string) {
    const verification = await db.instagramVerification.findUnique({
      where: { code },
      select: {
        id: true,
        code: true,
        status: true,
        igUsername: true,
        sessionId: true,
        expiresAt: true,
        verifiedAt: true,
        createdAt: true,
      },
    })

    if (!verification) {
      return {
        found: false,
        status: 'not_found',
      }
    }

    // Check if expired
    if (verification.expiresAt < new Date() && verification.status === 'pending') {
      // Mark as expired
      await db.instagramVerification.update({
        where: { id: verification.id },
        data: { status: 'expired' },
      })

      return {
        found: true,
        status: 'expired',
        verification: {
          ...verification,
          status: 'expired',
        },
      }
    }

    return {
      found: true,
      status: verification.status,
      verification,
    }
  }

  /**
   * List verifications for an API key
   */
  async listVerifications(apiKeyId: string, options?: {
    status?: string
    limit?: number
    offset?: number
  }) {
    const where: any = { apiKeyId }

    if (options?.status) {
      where.status = options.status
    }

    const [verifications, total] = await Promise.all([
      db.instagramVerification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 50,
        skip: options?.offset || 0,
      }),
      db.instagramVerification.count({ where }),
    ])

    return {
      verifications,
      total,
      limit: options?.limit || 50,
      offset: options?.offset || 0,
    }
  }

  /**
   * Expire old pending verifications (cleanup task)
   */
  async expireOldVerifications() {
    const result = await db.instagramVerification.updateMany({
      where: {
        status: 'pending',
        expiresAt: { lt: new Date() },
      },
      data: {
        status: 'expired',
      },
    })

    return {
      expiredCount: result.count,
    }
  }

  /**
   * Generate 6-digit verification code
   */
  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }
}

export const verificationService = new VerificationService()
