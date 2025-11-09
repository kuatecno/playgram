import { db } from '@/lib/db'
import { VERIFICATION_STATUS } from '@/config/constants'

export interface SendVerificationParams {
  adminId: string
  phone: string
  userId?: string
  purpose?: string
}

export interface VerifyCodeParams {
  adminId: string
  phone: string
  code: string
}

export class VerificationService {
  /**
   * Send verification code to phone number
   *
   * Note: SMS sending is not implemented - code is stored in database
   * In production, integrate with Twilio, AWS SNS, or similar service
   */
  async sendVerification(params: SendVerificationParams) {
    const { adminId, phone, userId, purpose } = params

    // Generate 6-digit code
    const code = this.generateCode()

    // Set expiration (10 minutes from now)
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + 10)

    // Invalidate any existing pending verifications for this phone
    await db.verification.updateMany({
      where: {
        adminId,
        phone,
        status: VERIFICATION_STATUS.PENDING,
      },
      data: {
        status: VERIFICATION_STATUS.EXPIRED,
      },
    })

    // Create new verification
    const verification = await db.verification.create({
      data: {
        adminId,
        phone,
        code,
        userId,
        purpose: purpose || 'phone_verification',
        status: VERIFICATION_STATUS.PENDING,
        expiresAt,
        attempts: 0,
      },
      select: {
        id: true,
        phone: true,
        expiresAt: true,
        // Don't return code in production - only for development
      },
    })

    // TODO: Integrate with SMS provider (Twilio, AWS SNS, etc.)
    // await this.sendSMS(phone, `Your verification code is: ${code}`)

    return {
      verificationId: verification.id,
      phone: verification.phone,
      expiresAt: verification.expiresAt,
      // Return code only in development
      ...(process.env.NODE_ENV === 'development' && { code }),
    }
  }

  /**
   * Verify code
   */
  async verifyCode(params: VerifyCodeParams) {
    const { adminId, phone, code } = params

    // Find pending verification
    const verification = await db.verification.findFirst({
      where: {
        adminId,
        phone,
        code,
        status: VERIFICATION_STATUS.PENDING,
      },
    })

    if (!verification) {
      // Increment failed attempts if verification exists
      await db.verification.updateMany({
        where: {
          adminId,
          phone,
          status: VERIFICATION_STATUS.PENDING,
        },
        data: {
          attempts: { increment: 1 },
        },
      })

      throw new Error('Invalid verification code')
    }

    // Check if expired
    if (verification.expiresAt < new Date()) {
      await db.verification.update({
        where: { id: verification.id },
        data: { status: VERIFICATION_STATUS.EXPIRED },
      })

      throw new Error('Verification code has expired')
    }

    // Check max attempts (5)
    if (verification.attempts >= 5) {
      await db.verification.update({
        where: { id: verification.id },
        data: { status: VERIFICATION_STATUS.EXPIRED },
      })

      throw new Error('Too many failed attempts')
    }

    // Mark as verified
    await db.verification.update({
      where: { id: verification.id },
      data: {
        status: VERIFICATION_STATUS.VERIFIED,
        verifiedAt: new Date(),
      },
    })

    return {
      success: true,
      phone: verification.phone,
      userId: verification.userId,
    }
  }

  /**
   * Check if phone is verified
   */
  async isPhoneVerified(adminId: string, phone: string): Promise<boolean> {
    const verified = await db.verification.findFirst({
      where: {
        adminId,
        phone,
        status: VERIFICATION_STATUS.VERIFIED,
      },
    })

    return !!verified
  }

  /**
   * Get verification statistics
   */
  async getVerificationStats(adminId: string) {
    const [total, verified, pending, expired] = await Promise.all([
      // Total verifications
      db.verification.count({ where: { adminId } }),

      // Verified
      db.verification.count({
        where: { adminId, status: VERIFICATION_STATUS.VERIFIED },
      }),

      // Pending
      db.verification.count({
        where: { adminId, status: VERIFICATION_STATUS.PENDING },
      }),

      // Expired
      db.verification.count({
        where: { adminId, status: VERIFICATION_STATUS.EXPIRED },
      }),
    ])

    // Recent verifications (last 24 hours)
    const yesterday = new Date()
    yesterday.setHours(yesterday.getHours() - 24)

    const recentVerifications = await db.verification.count({
      where: {
        adminId,
        createdAt: { gte: yesterday },
      },
    })

    // By purpose
    const byPurpose = await db.verification.groupBy({
      by: ['purpose'],
      where: { adminId },
      _count: true,
    })

    return {
      total,
      verified,
      pending,
      expired,
      recentVerifications,
      verificationRate:
        total > 0 ? Math.round((verified / total) * 100) : 0,
      byPurpose: byPurpose.map((stat) => ({
        purpose: stat.purpose,
        count: stat._count,
      })),
    }
  }

  /**
   * List verifications
   */
  async listVerifications(
    adminId: string,
    options?: {
      phone?: string
      status?: string
      userId?: string
      limit?: number
      offset?: number
    }
  ) {
    const where: any = { adminId }

    if (options?.phone) {
      where.phone = options.phone
    }

    if (options?.status) {
      where.status = options.status
    }

    if (options?.userId) {
      where.userId = options.userId
    }

    const [verifications, total] = await Promise.all([
      db.verification.findMany({
        where,
        select: {
          id: true,
          phone: true,
          userId: true,
          purpose: true,
          status: true,
          expiresAt: true,
          verifiedAt: true,
          attempts: true,
          createdAt: true,
          // Don't return code
        },
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 50,
        skip: options?.offset || 0,
      }),
      db.verification.count({ where }),
    ])

    return {
      verifications,
      total,
      limit: options?.limit || 50,
      offset: options?.offset || 0,
    }
  }

  /**
   * Clean up expired verifications (run periodically)
   */
  async cleanupExpired() {
    const now = new Date()

    const deleted = await db.verification.updateMany({
      where: {
        status: VERIFICATION_STATUS.PENDING,
        expiresAt: { lt: now },
      },
      data: {
        status: VERIFICATION_STATUS.EXPIRED,
      },
    })

    return {
      expired: deleted.count,
    }
  }

  /**
   * Generate 6-digit verification code
   */
  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }

  /**
   * Send SMS (placeholder - implement with actual SMS provider)
   */
  private async sendSMS(phone: string, message: string): Promise<void> {
    // TODO: Integrate with SMS provider
    // Example with Twilio:
    // const twilio = require('twilio')(accountSid, authToken)
    // await twilio.messages.create({
    //   body: message,
    //   to: phone,
    //   from: twilioPhoneNumber,
    // })

    console.log(`[SMS] To: ${phone}, Message: ${message}`)
  }
}

export const verificationService = new VerificationService()
