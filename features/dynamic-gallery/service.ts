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

    const config = await db.dynamicGalleryConfig.upsert({
      where: { toolId: tool.id },
      update: {},
      create: { toolId: tool.id },
    })

    return { tool, config }
  }

  async getSummary(adminId: string): Promise<DynamicGallerySummaryDTO> {
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
      webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3002'}/api/webhooks/dynamic-gallery/${tool.id}`,
    }
  }

  async storeCardsForAdmin(adminId: string, cards: DynamicGalleryCardList, trigger: 'manual' | 'webhook') {
    const { tool } = await this.getOrCreateTool(adminId)
    return this.storeCardsForTool(tool.id, cards, trigger)
  }

  async storeCardsForTool(toolId: string, cards: DynamicGalleryCardList, trigger: 'manual' | 'webhook') {
    const config = await db.dynamicGalleryConfig.findUnique({
      where: { toolId },
      select: { id: true },
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

    // Batch contacts into chunks to avoid overwhelming the connection pool
    const CHUNK_SIZE = 5 // Process 5 contacts at a time
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

            fieldUpdates.push(manychatService.setCustomField(adminId, contactId, `${baseField}_image_url`, card.imageUrl))
            fieldUpdates.push(manychatService.setCustomField(adminId, contactId, `${baseField}_title`, card.title))
            fieldUpdates.push(manychatService.setCustomField(adminId, contactId, `${baseField}_subtitle`, card.subtitle))

            // Update button fields
            for (let buttonIndex = 0; buttonIndex < card.buttons.length; buttonIndex++) {
              const button = card.buttons[buttonIndex]
              const buttonField = `${baseField}_button_${buttonIndex + 1}`

              fieldUpdates.push(manychatService.setCustomField(adminId, contactId, `${buttonField}_title`, button.title))
              if (button.url) {
                fieldUpdates.push(manychatService.setCustomField(adminId, contactId, `${buttonField}_url`, button.url))
              }
              if (button.value) {
                fieldUpdates.push(manychatService.setCustomField(adminId, contactId, `${buttonField}_value`, button.value))
              }
              fieldUpdates.push(manychatService.setCustomField(adminId, contactId, `${buttonField}_type`, button.type))
            }
          }

          // Update metadata fields
          fieldUpdates.push(manychatService.setCustomField(adminId, contactId, 'playgram_gallery_active_count', cards.length))
          fieldUpdates.push(manychatService.setCustomField(adminId, contactId, 'playgram_gallery_last_updated_iso', new Date().toISOString()))

          // Execute all field updates for this contact in parallel
          await Promise.all(fieldUpdates)
          return true
        } catch (error) {
          console.error(`Failed to update contact ${contactId}:`, error)
          return false
        }
      })

      // Wait for this chunk to complete before moving to next
      const results = await Promise.all(chunkPromises)
      updatedCount += results.filter(Boolean).length
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
}

export const dynamicGalleryService = new DynamicGalleryService()
