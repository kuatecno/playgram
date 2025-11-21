import crypto from 'crypto'
import { db } from '@/lib/db'
import { manychatService } from '@/features/manychat/services/ManychatService'
import {
  DynamicGalleryCardList,
  DynamicGallerySummaryDTO,
  dynamicGalleryCardListSchema,
} from './types'

type TriggerType = 'manual' | 'webhook' | 'schedule'

const SECRET_ALGORITHM = 'aes-256-cbc'

function getSecretKey() {
  const keySeed = process.env.NEXTAUTH_SECRET || process.env.APP_SECRET_KEY || 'playgram-secret'
  return crypto.createHash('sha256').update(keySeed).digest()
}

function encryptSecret(secret: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(SECRET_ALGORITHM, getSecretKey(), iv)
  let encrypted = cipher.update(secret, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return `${iv.toString('hex')}:${encrypted}`
}

function decryptSecret(encryptedSecret: string): string {
  const [ivHex, encrypted] = encryptedSecret.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const decipher = crypto.createDecipheriv(SECRET_ALGORITHM, getSecretKey(), iv)
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

function hashCards(cards: DynamicGalleryCardList): string {
  return crypto.createHash('sha256').update(JSON.stringify(cards)).digest('hex')
}

export class DynamicGalleryService {
  private async getOrCreateTool(adminId: string, toolName?: string) {
    let tool = await db.tool.findFirst({
      where: {
        adminId,
        toolType: 'dynamic_gallery',
      },
    })

    if (!tool) {
      tool = await db.tool.create({
        data: {
          adminId,
          toolType: 'dynamic_gallery',
          name: toolName || 'Dynamic Gallery',
          description: 'Manage ManyChat gallery cards dynamically',
          settings: {},
          isActive: true,
        },
      })
    }

    // Find the first gallery config for this tool, or create a default one
    let config = await db.dynamicGalleryConfig.findFirst({
      where: { toolId: tool.id },
      orderBy: { createdAt: 'asc' },
    })

    if (!config) {
      config = await db.dynamicGalleryConfig.create({
        data: {
          toolId: tool.id,
          name: 'Default Gallery',
        },
      })
    }

    return { tool, config }
  }

  async getSummary(adminId: string, baseUrl?: string): Promise<DynamicGallerySummaryDTO> {
    const { tool, config } = await this.getOrCreateTool(adminId)

    const fullConfig = await db.dynamicGalleryConfig.findUnique({
      where: { id: config.id },
      include: {
        snapshots: {
          orderBy: { version: 'desc' },
          take: 1,
        },
        sources: {
          orderBy: { createdAt: 'desc' },
        },
        secrets: {
          orderBy: { createdAt: 'desc' },
        },
        syncLogs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    })

    if (!fullConfig) {
      throw new Error('Dynamic gallery config not found')
    }

    const latestSnapshot = fullConfig.snapshots[0]

    return {
      config: {
        toolId: tool.id,
        autoSyncEnabled: fullConfig.autoSyncEnabled,
        ingestMode: fullConfig.ingestMode,
        ingestLimit: fullConfig.ingestLimit,
        scheduledTimes: (fullConfig.scheduledTimes as any) || [],
        shuffleWindows: (fullConfig.shuffleWindows as any) || [],
        orderingRules: (fullConfig.orderingRules as any) || [],
        stagedPayloadCount: fullConfig.stagedPayload ? (Array.isArray(fullConfig.stagedPayload) ? fullConfig.stagedPayload.length : 0) : 0,
        lastScheduledSyncAt: fullConfig.lastScheduledSyncAt?.toISOString() || null,
        lastSyncedAt: fullConfig.lastSyncedAt?.toISOString() || null,
        lastWebhookAt: fullConfig.lastWebhookAt?.toISOString() || null,
        lastSyncStatus: (fullConfig.lastSyncStatus as any) || null,
      },
      snapshot: latestSnapshot
        ? {
            id: latestSnapshot.id,
            version: latestSnapshot.version,
            cardCount: latestSnapshot.cardCount,
            cards: (latestSnapshot.cardsJson as DynamicGalleryCardList) || [],
            hash: latestSnapshot.hash,
            createdAt: latestSnapshot.createdAt.toISOString(),
          }
        : null,
      sources: fullConfig.sources.map((source): DynamicGallerySummaryDTO['sources'][number] => ({
        id: source.id,
        name: source.name,
        sourceType: source.sourceType,
        endpoint: source.endpoint ?? undefined,
        description: source.description ?? undefined,
        isActive: source.isActive,
        createdAt: source.createdAt.toISOString(),
        updatedAt: source.updatedAt.toISOString(),
      })),
      secrets: fullConfig.secrets
        .filter((secret) => !secret.revokedAt)
        .map((secret): DynamicGallerySummaryDTO['secrets'][number] => ({
          id: secret.id,
          label: secret.label,
          createdAt: secret.createdAt.toISOString(),
          lastUsedAt: secret.lastUsedAt ? secret.lastUsedAt.toISOString() : null,
          revokedAt: secret.revokedAt ? secret.revokedAt.toISOString() : null,
        })),
      syncLogs: fullConfig.syncLogs.map((log): DynamicGallerySummaryDTO['syncLogs'][number] => ({
        id: log.id,
        triggerType: log.triggerType,
        status: log.status,
        cardCount: log.cardCount,
        contactsImpacted: log.contactsImpacted,
        durationMs: log.durationMs ?? undefined,
        errorMessage: log.errorMessage ?? undefined,
        createdAt: log.createdAt.toISOString(),
      })),
      webhookUrl: `${baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002'}/api/v1/webhooks/dynamic-gallery/${tool.id}`,
    }
  }

  async storeCardsForAdmin(adminId: string, cards: DynamicGalleryCardList, trigger: 'manual' | 'webhook') {
    const { tool } = await this.getOrCreateTool(adminId)
    return this.storeCardsForTool(tool.id, cards, trigger)
  }

  async storeCardsForTool(toolId: string, cards: DynamicGalleryCardList, trigger: 'manual' | 'webhook') {
    // Find the first gallery config for this tool (for backward compatibility)
    const config = await db.dynamicGalleryConfig.findFirst({
      where: { toolId },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    })

    if (!config) {
      throw new Error('Dynamic gallery config not found')
    }

    const parsedCards = dynamicGalleryCardListSchema.parse(cards)
    const contentHash = hashCards(parsedCards)

    const lastSnapshot = await db.dynamicGallerySnapshot.findFirst({
      where: { configId: config.id },
      orderBy: { version: 'desc' },
    })

    if (lastSnapshot?.hash === contentHash) {
      return {
        snapshotId: lastSnapshot.id,
        version: lastSnapshot.version,
        created: false,
      }
    }

    const snapshot = await db.dynamicGallerySnapshot.create({
      data: {
        configId: config.id,
        version: lastSnapshot ? lastSnapshot.version + 1 : 1,
        cardCount: parsedCards.length,
        cardsJson: parsedCards,
        hash: contentHash,
      },
      select: {
        id: true,
        version: true,
      },
    })

    await db.dynamicGalleryConfig.update({
      where: { id: config.id },
      data: {
        lastWebhookAt: trigger === 'webhook' ? new Date() : undefined,
      },
    })

    return {
      snapshotId: snapshot.id,
      version: snapshot.version,
      created: true,
    }
  }

  async setAutoSync(adminId: string, enabled: boolean) {
    const { config } = await this.getOrCreateTool(adminId)
    await db.dynamicGalleryConfig.update({
      where: { id: config.id },
      data: { autoSyncEnabled: enabled },
    })
  }

  async generateSecretForAdmin(adminId: string, label?: string) {
    const { config } = await this.getOrCreateTool(adminId)
    const secret = crypto.randomBytes(32).toString('hex')
    const encryptedSecret = encryptSecret(secret)

    const created = await db.dynamicGallerySecret.create({
      data: {
        configId: config.id,
        label: label || `Secret ${new Date().toISOString()}`,
        encryptedSecret,
      },
    })

    return {
      id: created.id,
      label: created.label,
      secret,
      createdAt: created.createdAt,
    }
  }

  async revokeSecretForAdmin(adminId: string, secretId: string) {
    const { config } = await this.getOrCreateTool(adminId)
    await db.dynamicGallerySecret.updateMany({
      where: {
        id: secretId,
        configId: config.id,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    })
  }

  async verifyWebhookSignature(toolId: string, payload: string, signature: string) {
    const secrets = await db.dynamicGallerySecret.findMany({
      where: {
        config: { toolId },
        revokedAt: null,
      },
    })

    if (secrets.length === 0) {
      throw new Error('No webhook secrets configured')
    }

    const isValid = secrets.some((secret) => {
      const plaintext = decryptSecret(secret.encryptedSecret)
      const expected = crypto.createHmac('sha256', plaintext).update(payload).digest('hex')

      if (expected.length !== signature.length) {
        return false
      }

      const valid = crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))

      if (valid) {
        db.dynamicGallerySecret
          .update({
            where: { id: secret.id },
            data: { lastUsedAt: new Date() },
          })
          .catch((error) => console.error('Failed to update secret usage', error))
      }

      return valid
    })

    if (!isValid) {
      throw new Error('Invalid webhook signature')
    }
  }

  async syncToManychat(adminId: string, options: {
    trigger: TriggerType
    snapshotId?: string
    dryRun?: boolean
    contactIds?: string[]
  }) {
    const { config } = await this.getOrCreateTool(adminId)
    const snapshot = options.snapshotId
      ? await db.dynamicGallerySnapshot.findUnique({ where: { id: options.snapshotId } })
      : await db.dynamicGallerySnapshot.findFirst({
          where: { configId: config.id },
          orderBy: { version: 'desc' },
        })

    if (!snapshot) {
      throw new Error('No dynamic gallery snapshot available')
    }

    const cards = snapshot.cardsJson as DynamicGalleryCardList

    // Fetch API token once and cache it for all operations
    const apiToken = await manychatService.getApiToken(adminId)
    if (!apiToken) {
      throw new Error('ManyChat not connected')
    }

    if (options.dryRun) {
      return {
        success: true,
        dryRun: true,
        cardCount: cards.length,
      }
    }

    let targetContactIds = options.contactIds || []

    if (targetContactIds.length === 0) {
      targetContactIds = await this.fetchManychatContactIds(adminId)
    }

    const start = Date.now()
    let updatedCount = 0

    // Batch contacts into smaller chunks to avoid overwhelming the connection pool
    const CHUNK_SIZE = 2 // Process 2 contacts at a time for safety
    const contactChunks = []
    for (let i = 0; i < targetContactIds.length; i += CHUNK_SIZE) {
      contactChunks.push(targetContactIds.slice(i, i + CHUNK_SIZE))
    }

    // Process each chunk sequentially, but parallelize within chunks
    for (const chunk of contactChunks) {
      const chunkPromises = chunk.map(async (contactId) => {
        try {
          // Collect all field updates for this contact
          const fieldUpdates: Array<Promise<void>> = []

          // Update card fields
          for (let index = 0; index < cards.length; index++) {
            const card = cards[index]
            const baseField = `playgram_gallery_${index + 1}`

            fieldUpdates.push(manychatService.setCustomFieldWithToken(apiToken, contactId, `${baseField}_image_url`, card.imageUrl))
            if (card.imageClickUrl) {
              fieldUpdates.push(manychatService.setCustomFieldWithToken(apiToken, contactId, `${baseField}_image_click_url`, card.imageClickUrl))
            }
            fieldUpdates.push(manychatService.setCustomFieldWithToken(apiToken, contactId, `${baseField}_title`, card.title))
            fieldUpdates.push(manychatService.setCustomFieldWithToken(apiToken, contactId, `${baseField}_subtitle`, card.subtitle))

            // Update button fields
            for (let buttonIndex = 0; buttonIndex < card.buttons.length; buttonIndex++) {
              const button = card.buttons[buttonIndex]
              const buttonField = `${baseField}_button_${buttonIndex + 1}`

              fieldUpdates.push(manychatService.setCustomFieldWithToken(apiToken, contactId, `${buttonField}_title`, button.title))
              if (button.url) {
                fieldUpdates.push(manychatService.setCustomFieldWithToken(apiToken, contactId, `${buttonField}_url`, button.url))
              }
              if (button.value) {
                fieldUpdates.push(manychatService.setCustomFieldWithToken(apiToken, contactId, `${buttonField}_value`, button.value))
              }
              fieldUpdates.push(manychatService.setCustomFieldWithToken(apiToken, contactId, `${buttonField}_type`, button.type))
            }
          }

          // Update metadata fields
          fieldUpdates.push(manychatService.setCustomFieldWithToken(apiToken, contactId, 'playgram_gallery_active_count', cards.length))
          fieldUpdates.push(manychatService.setCustomFieldWithToken(apiToken, contactId, 'playgram_gallery_last_updated_iso', new Date().toISOString()))

          // Execute all field updates for this contact in parallel with timeout
          await Promise.race([
            Promise.all(fieldUpdates),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Contact update timeout')), 30000)
            )
          ])
          return true
        } catch (error) {
          console.error(`Failed to update contact ${contactId}:`, error)
          return false
        }
      })

      // Wait for this chunk to complete before moving to next
      const results = await Promise.all(chunkPromises)
      updatedCount += results.filter(Boolean).length

      // Add delay between chunks to prevent overwhelming the system
      if (contactChunks.indexOf(chunk) < contactChunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    }

    const duration = Date.now() - start

    await db.dynamicGalleryConfig.update({
      where: { id: config.id },
      data: {
        lastSyncedAt: new Date(),
        lastSyncStatus: updatedCount > 0 ? 'success' : 'warning',
      },
    })

    await db.dynamicGallerySyncLog.create({
      data: {
        configId: config.id,
        triggerType: options.trigger,
        status: updatedCount > 0 ? 'success' : 'warning',
        cardCount: cards.length,
        contactsImpacted: updatedCount,
        durationMs: duration,
        errorMessage: updatedCount > 0 ? null : 'No ManyChat contacts were updated',
      },
    })

    return {
      success: true,
      cardCount: cards.length,
      contactsUpdated: updatedCount,
      durationMs: duration,
    }
  }

  private async fetchManychatContactIds(adminId: string, pageSize = 100): Promise<string[]> {
    const contactIds: string[] = []
    let page = 1
    let hasMore = true

    while (hasMore && contactIds.length < 1000) {
      const { contacts, hasMore: nextPage } = await manychatService.getContacts(adminId, page, pageSize)
      contactIds.push(...contacts.map((contact) => String(contact.id)))
      hasMore = nextPage
      page += 1
    }

    return contactIds
  }

  // =========================================================================
  // MULTIPLE GALLERIES CRUD OPERATIONS
  // =========================================================================

  /**
   * Create a new gallery for an admin
   */
  async createGallery(adminId: string, name: string, displayOrder?: number) {
    // First, ensure we have a tool for dynamic galleries
    let tool = await db.tool.findFirst({
      where: {
        adminId,
        toolType: 'dynamic_gallery',
      },
    })

    if (!tool) {
      tool = await db.tool.create({
        data: {
          adminId,
          toolType: 'dynamic_gallery',
          name: 'Dynamic Galleries',
          description: 'Manage multiple ManyChat gallery sets',
          settings: {},
          isActive: true,
        },
      })
    }

    // Create the gallery config
    const config = await db.dynamicGalleryConfig.create({
      data: {
        toolId: tool.id,
        name,
        displayOrder,
      },
    })

    return {
      id: config.id,
      toolId: tool.id,
      name: config.name,
      displayOrder: config.displayOrder,
      autoSyncEnabled: config.autoSyncEnabled,
      ingestMode: config.ingestMode,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    }
  }

  /**
   * List all galleries for an admin
   */
  async listGalleries(adminId: string) {
    const tools = await db.tool.findMany({
      where: {
        adminId,
        toolType: 'dynamic_gallery',
      },
      include: {
        dynamicGalleries: {
          orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
          include: {
            snapshots: {
              orderBy: { version: 'desc' },
              take: 1,
            },
            triggers: {
              where: { isActive: true },
            },
            _count: {
              select: {
                snapshots: true,
                sources: true,
                syncLogs: true,
              },
            },
          },
        },
      },
    })

    const galleries = tools.flatMap((tool) =>
      tool.dynamicGalleries.map((config) => ({
        id: config.id,
        toolId: tool.id,
        name: config.name,
        displayOrder: config.displayOrder,
        autoSyncEnabled: config.autoSyncEnabled,
        ingestMode: config.ingestMode,
        lastSyncedAt: config.lastSyncedAt?.toISOString() || null,
        lastSyncStatus: config.lastSyncStatus,
        cardCount: config.snapshots[0]?.cardCount || 0,
        version: config.snapshots[0]?.version || 0,
        triggers: config.triggers.map((t) => ({
          id: t.id,
          triggerType: t.triggerType,
          triggerKey: t.triggerKey,
        })),
        stats: {
          snapshotCount: config._count.snapshots,
          sourceCount: config._count.sources,
          syncLogCount: config._count.syncLogs,
        },
        createdAt: config.createdAt.toISOString(),
        updatedAt: config.updatedAt.toISOString(),
      }))
    )

    return galleries
  }

  /**
   * Get a specific gallery by ID
   */
  async getGalleryById(galleryId: string, adminId: string) {
    const config = await db.dynamicGalleryConfig.findFirst({
      where: {
        id: galleryId,
        tool: { adminId },
      },
      include: {
        tool: true,
        snapshots: {
          orderBy: { version: 'desc' },
          take: 1,
        },
        sources: {
          orderBy: { createdAt: 'desc' },
        },
        secrets: {
          where: { revokedAt: null },
          orderBy: { createdAt: 'desc' },
        },
        triggers: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
        },
        syncLogs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    })

    if (!config) {
      return null
    }

    return {
      id: config.id,
      toolId: config.toolId,
      name: config.name,
      displayOrder: config.displayOrder,
      autoSyncEnabled: config.autoSyncEnabled,
      ingestMode: config.ingestMode,
      snapshot: config.snapshots[0]
        ? {
            id: config.snapshots[0].id,
            version: config.snapshots[0].version,
            cardCount: config.snapshots[0].cardCount,
            cards: config.snapshots[0].cardsJson,
            hash: config.snapshots[0].hash,
            createdAt: config.snapshots[0].createdAt.toISOString(),
          }
        : null,
      sources: config.sources.map((s) => ({
        id: s.id,
        name: s.name,
        sourceType: s.sourceType,
        endpoint: s.endpoint,
        isActive: s.isActive,
        createdAt: s.createdAt.toISOString(),
      })),
      secrets: config.secrets.map((s) => ({
        id: s.id,
        label: s.label,
        createdAt: s.createdAt.toISOString(),
        lastUsedAt: s.lastUsedAt?.toISOString() || null,
      })),
      triggers: config.triggers.map((t) => ({
        id: t.id,
        triggerType: t.triggerType,
        triggerKey: t.triggerKey,
        metadata: t.metadata,
        createdAt: t.createdAt.toISOString(),
      })),
      syncLogs: config.syncLogs.map((log) => ({
        id: log.id,
        triggerType: log.triggerType,
        status: log.status,
        cardCount: log.cardCount,
        contactsImpacted: log.contactsImpacted,
        durationMs: log.durationMs,
        errorMessage: log.errorMessage,
        createdAt: log.createdAt.toISOString(),
      })),
      lastSyncedAt: config.lastSyncedAt?.toISOString() || null,
      lastSyncStatus: config.lastSyncStatus,
      createdAt: config.createdAt.toISOString(),
      updatedAt: config.updatedAt.toISOString(),
    }
  }

  /**
   * Update a gallery
   */
  async updateGallery(
    galleryId: string,
    adminId: string,
    updates: { name?: string; displayOrder?: number; autoSyncEnabled?: boolean }
  ) {
    const config = await db.dynamicGalleryConfig.findFirst({
      where: {
        id: galleryId,
        tool: { adminId },
      },
    })

    if (!config) {
      throw new Error('Gallery not found')
    }

    const updated = await db.dynamicGalleryConfig.update({
      where: { id: galleryId },
      data: updates,
    })

    return {
      id: updated.id,
      toolId: updated.toolId,
      name: updated.name,
      displayOrder: updated.displayOrder,
      autoSyncEnabled: updated.autoSyncEnabled,
      updatedAt: updated.updatedAt,
    }
  }

  /**
   * Delete a gallery
   */
  async deleteGallery(galleryId: string, adminId: string) {
    const config = await db.dynamicGalleryConfig.findFirst({
      where: {
        id: galleryId,
        tool: { adminId },
      },
    })

    if (!config) {
      throw new Error('Gallery not found')
    }

    await db.dynamicGalleryConfig.delete({
      where: { id: galleryId },
    })

    return { success: true }
  }

  /**
   * Add a trigger to a gallery
   */
  async addGalleryTrigger(
    galleryId: string,
    adminId: string,
    triggerType: string,
    triggerKey: string,
    metadata?: Record<string, unknown>
  ) {
    const config = await db.dynamicGalleryConfig.findFirst({
      where: {
        id: galleryId,
        tool: { adminId },
      },
    })

    if (!config) {
      throw new Error('Gallery not found')
    }

    const trigger = await db.galleryTrigger.create({
      data: {
        configId: galleryId,
        triggerType,
        triggerKey,
        metadata: metadata ? (metadata as any) : undefined,
      },
    })

    return {
      id: trigger.id,
      triggerType: trigger.triggerType,
      triggerKey: trigger.triggerKey,
      metadata: trigger.metadata,
      createdAt: trigger.createdAt,
    }
  }

  /**
   * Remove a trigger from a gallery
   */
  async removeGalleryTrigger(triggerId: string, adminId: string) {
    const trigger = await db.galleryTrigger.findFirst({
      where: {
        id: triggerId,
        config: {
          tool: { adminId },
        },
      },
    })

    if (!trigger) {
      throw new Error('Trigger not found')
    }

    await db.galleryTrigger.delete({
      where: { id: triggerId },
    })

    return { success: true }
  }

  /**
   * Find galleries by trigger (e.g., for ManyChat keyword routing)
   */
  async getGalleriesByTrigger(adminId: string, triggerType: string, triggerKey: string) {
    const triggers = await db.galleryTrigger.findMany({
      where: {
        triggerType,
        triggerKey,
        isActive: true,
        config: {
          tool: { adminId },
        },
      },
      include: {
        config: {
          include: {
            snapshots: {
              orderBy: { version: 'desc' },
              take: 1,
            },
          },
        },
      },
    })

    return triggers.map((trigger) => ({
      galleryId: trigger.configId,
      galleryName: trigger.config.name,
      snapshot: trigger.config.snapshots[0]
        ? {
            cards: trigger.config.snapshots[0].cardsJson,
            version: trigger.config.snapshots[0].version,
          }
        : null,
    }))
  }
}

export const dynamicGalleryService = new DynamicGalleryService()
