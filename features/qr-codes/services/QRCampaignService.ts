import { db } from '@/lib/db'
import crypto from 'crypto'

export interface RecurringCampaignSettings {
  isRecurring: boolean
  maxCodesPerUser?: number | null
  rewardThreshold?: number | null
  autoResetOnReward: boolean
  recurringConfig?: {
    rewardActions?: {
      addTags?: string[] // ManyChat tag IDs to add on reward
      setCustomFields?: Record<string, any> // Custom fields to update
      sendMessage?: string // Message to send
    }
    codePrefix?: string // Prefix for generated codes
    codeLength?: number // Length of random code part
  }
}

export class QRCampaignService {
  /**
   * Generate the first QR code for a user in a recurring campaign
   */
  async generateInitialCode(
    toolId: string,
    userId: string,
    settings: RecurringCampaignSettings
  ) {
    // Get or create campaign progress for this user
    const progress = await db.qRCampaignProgress.upsert({
      where: {
        userId_toolId: { userId, toolId },
      },
      create: {
        userId,
        toolId,
        totalScans: 0,
        currentStreak: 0,
        rewardsEarned: 0,
      },
      update: {},
    })

    // Check if user has reached max codes
    if (
      settings.maxCodesPerUser &&
      progress.totalScans >= settings.maxCodesPerUser
    ) {
      throw new Error('Maximum codes limit reached for this user')
    }

    // Generate unique code
    const code = this.generateUniqueCode(settings.recurringConfig?.codePrefix)

    // Create the QR code
    const qrCode = await db.qRCode.create({
      data: {
        code,
        qrType: 'recurring_campaign',
        userId,
        toolId,
        isRecurring: true,
        campaignProgress: progress.currentStreak,
        metadata: {
          campaignId: toolId,
          sequence: progress.totalScans + 1,
        },
      },
    })

    return {
      qrCode,
      progress: {
        currentStreak: progress.currentStreak,
        totalScans: progress.totalScans,
        rewardsEarned: progress.rewardsEarned,
        nextRewardIn: settings.rewardThreshold
          ? settings.rewardThreshold - progress.currentStreak
          : null,
      },
    }
  }

  /**
   * Validate a QR code and generate the next one if applicable
   */
  async validateAndGenerateNext(
    qrCodeId: string,
    toolId: string,
    userId: string,
    settings: RecurringCampaignSettings
  ) {
    const qrCode = await db.qRCode.findUnique({
      where: { id: qrCodeId },
      include: { user: true },
    })

    if (!qrCode) {
      throw new Error('QR code not found')
    }

    if (qrCode.scannedAt) {
      throw new Error('QR code already used')
    }

    if (qrCode.userId !== userId) {
      throw new Error('QR code does not belong to this user')
    }

    // Mark code as scanned
    await db.qRCode.update({
      where: { id: qrCodeId },
      data: {
        scannedAt: new Date(),
        scanCount: 1,
      },
    })

    // Update campaign progress
    const progress = await db.qRCampaignProgress.findUnique({
      where: {
        userId_toolId: { userId, toolId },
      },
    })

    if (!progress) {
      throw new Error('Campaign progress not found')
    }

    const newTotalScans = progress.totalScans + 1
    let newCurrentStreak = progress.currentStreak + 1
    let newRewardsEarned = progress.rewardsEarned
    let isReward = false

    // Check if user earned a reward
    if (
      settings.rewardThreshold &&
      newCurrentStreak >= settings.rewardThreshold
    ) {
      isReward = true
      newRewardsEarned += 1

      // Reset streak if auto-reset is enabled
      if (settings.autoResetOnReward) {
        newCurrentStreak = 0
      }
    }

    // Update progress
    await db.qRCampaignProgress.update({
      where: { id: progress.id },
      data: {
        totalScans: newTotalScans,
        currentStreak: newCurrentStreak,
        rewardsEarned: newRewardsEarned,
        lastScanAt: new Date(),
        lastCodeId: qrCodeId,
      },
    })

    // Check if user can get another code
    const canGenerateNext =
      !settings.maxCodesPerUser || newTotalScans < settings.maxCodesPerUser

    let nextCode = null

    if (canGenerateNext) {
      // Generate next QR code
      const code = this.generateUniqueCode(settings.recurringConfig?.codePrefix)

      nextCode = await db.qRCode.create({
        data: {
          code,
          qrType: 'recurring_campaign',
          userId,
          toolId,
          isRecurring: true,
          previousCodeId: qrCodeId,
          campaignProgress: newCurrentStreak,
          isRewardCode: isReward,
          metadata: {
            campaignId: toolId,
            sequence: newTotalScans + 1,
            previousCode: qrCode.code,
          },
        },
      })

      // Link codes in chain
      await db.qRCode.update({
        where: { id: qrCodeId },
        data: { nextCodeId: nextCode.id },
      })
    }

    return {
      validated: true,
      isReward,
      progress: {
        currentStreak: newCurrentStreak,
        totalScans: newTotalScans,
        rewardsEarned: newRewardsEarned,
        nextRewardIn: settings.rewardThreshold
          ? Math.max(0, settings.rewardThreshold - newCurrentStreak)
          : null,
      },
      nextCode: nextCode ? {
        id: nextCode.id,
        code: nextCode.code,
        qrCodeUrl: `/api/v1/qr/code/${nextCode.code}/image`,
      } : null,
      rewardActions: isReward ? settings.recurringConfig?.rewardActions : null,
    }
  }

  /**
   * Get campaign progress for a user
   */
  async getUserProgress(toolId: string, userId: string) {
    const progress = await db.qRCampaignProgress.findUnique({
      where: {
        userId_toolId: { userId, toolId },
      },
      include: {
        tool: {
          include: {
            qrConfig: true,
          },
        },
      },
    })

    if (!progress) {
      return null
    }

    const qrConfig = progress.tool.qrConfig
    const rewardThreshold = qrConfig?.rewardThreshold

    // Get all codes in chain
    const codes = await db.qRCode.findMany({
      where: {
        userId,
        toolId,
        isRecurring: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    return {
      currentStreak: progress.currentStreak,
      totalScans: progress.totalScans,
      rewardsEarned: progress.rewardsEarned,
      nextRewardIn: rewardThreshold
        ? Math.max(0, rewardThreshold - progress.currentStreak)
        : null,
      lastScanAt: progress.lastScanAt,
      isActive: progress.isActive,
      recentCodes: codes.map((code) => ({
        id: code.id,
        code: code.code,
        scannedAt: code.scannedAt,
        isRewardCode: code.isRewardCode,
        campaignProgress: code.campaignProgress,
      })),
    }
  }

  /**
   * Get campaign statistics for admin
   */
  async getCampaignStats(toolId: string) {
    const totalParticipants = await db.qRCampaignProgress.count({
      where: { toolId, isActive: true },
    })

    const totalScans = await db.qRCampaignProgress.aggregate({
      where: { toolId },
      _sum: { totalScans: true },
    })

    const totalRewards = await db.qRCampaignProgress.aggregate({
      where: { toolId },
      _sum: { rewardsEarned: true },
    })

    const activeUsers = await db.qRCampaignProgress.count({
      where: {
        toolId,
        isActive: true,
        lastScanAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
    })

    const topParticipants = await db.qRCampaignProgress.findMany({
      where: { toolId, isActive: true },
      orderBy: { totalScans: 'desc' },
      take: 10,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            igUsername: true,
          },
        },
      },
    })

    return {
      totalParticipants,
      totalScans: totalScans._sum.totalScans || 0,
      totalRewards: totalRewards._sum.rewardsEarned || 0,
      activeUsers,
      averageScansPerUser:
        totalParticipants > 0
          ? Math.round((totalScans._sum.totalScans || 0) / totalParticipants)
          : 0,
      topParticipants: topParticipants.map((p) => ({
        userId: p.userId,
        userName: p.user.firstName
          ? `${p.user.firstName} ${p.user.lastName || ''}`
          : p.user.igUsername || 'Unknown',
        totalScans: p.totalScans,
        currentStreak: p.currentStreak,
        rewardsEarned: p.rewardsEarned,
        lastScanAt: p.lastScanAt,
      })),
    }
  }

  /**
   * Reset campaign progress for a user
   */
  async resetUserProgress(toolId: string, userId: string) {
    await db.qRCampaignProgress.update({
      where: {
        userId_toolId: { userId, toolId },
      },
      data: {
        currentStreak: 0,
        // Keep totalScans and rewardsEarned for historical tracking
      },
    })
  }

  /**
   * Deactivate a user from the campaign
   */
  async deactivateUser(toolId: string, userId: string) {
    await db.qRCampaignProgress.update({
      where: {
        userId_toolId: { userId, toolId },
      },
      data: {
        isActive: false,
      },
    })
  }

  /**
   * Generate a unique QR code string
   */
  private generateUniqueCode(prefix?: string): string {
    const randomPart = crypto.randomBytes(8).toString('hex').toUpperCase()
    return prefix ? `${prefix}-${randomPart}` : randomPart
  }
}

export const qrCampaignService = new QRCampaignService()
