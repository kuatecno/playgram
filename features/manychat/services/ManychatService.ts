import { db } from '@/lib/db'
import crypto from 'crypto'

const MANYCHAT_API_URL = process.env.MANYCHAT_API_URL || 'https://api.manychat.com'

export interface ManychatConfig {
  id: string
  adminId: string
  apiToken: string
  pageToken?: string | null
  pageName?: string | null
  isConnected: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ManychatContact {
  id: string
  first_name?: string
  last_name?: string
  profile_pic?: string
  instagram_username?: string
  custom_fields?: Record<string, any>
  tags?: Array<{ id: string; name: string }>
}

export interface ManychatTag {
  id: string
  name: string
}

/**
 * Manychat Service
 * Handles integration with Manychat API for contact and tag management
 */
export class ManychatService {
  /**
   * Encrypt API token for storage
   */
  private encryptToken(token: string): string {
    const algorithm = 'aes-256-cbc'
    const key = crypto.scryptSync(process.env.NEXTAUTH_SECRET || 'secret', 'salt', 32)
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv(algorithm, key, iv)
    let encrypted = cipher.update(token, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    return `${iv.toString('hex')}:${encrypted}`
  }

  /**
   * Decrypt API token from storage
   */
  private decryptToken(encryptedToken: string): string {
    const algorithm = 'aes-256-cbc'
    const key = crypto.scryptSync(process.env.NEXTAUTH_SECRET || 'secret', 'salt', 32)
    const [ivHex, encrypted] = encryptedToken.split(':')
    const iv = Buffer.from(ivHex, 'hex')
    const decipher = crypto.createDecipheriv(algorithm, key, iv)
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  }

  /**
   * Make authenticated request to Manychat API
   */
  private async makeRequest<T = any>(
    endpoint: string,
    apiToken: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${MANYCHAT_API_URL}${endpoint}`

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`,
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Manychat API error: ${response.status} - ${error}`)
    }

    return response.json()
  }

  /**
   * Save or update Manychat configuration
   */
  async saveConfig(adminId: string, apiToken: string, pageToken?: string): Promise<ManychatConfig> {
    // Test the connection first
    try {
      await this.testConnection(apiToken)
    } catch (error) {
      throw new Error('Invalid API token or Manychat connection failed')
    }

    // Encrypt tokens
    const encryptedApiToken = this.encryptToken(apiToken)
    const encryptedPageToken = pageToken ? this.encryptToken(pageToken) : null

    // Get page info if possible
    let pageName: string | null = null
    try {
      const pageInfo = await this.getPageInfo(apiToken)
      pageName = pageInfo?.name || null
    } catch (error) {
      console.warn('Could not fetch page info:', error)
    }

    // Upsert configuration
    const config = await db.manychatConfig.upsert({
      where: { adminId },
      create: {
        adminId,
        apiToken: encryptedApiToken,
        pageToken: encryptedPageToken,
        pageName,
        isConnected: true,
      },
      update: {
        apiToken: encryptedApiToken,
        pageToken: encryptedPageToken,
        pageName,
        isConnected: true,
        updatedAt: new Date(),
      },
    })

    return config
  }

  /**
   * Get Manychat configuration for admin
   */
  async getConfig(adminId: string): Promise<ManychatConfig | null> {
    const config = await db.manychatConfig.findUnique({
      where: { adminId },
    })

    return config
  }

  /**
   * Get decrypted API token
   */
  async getApiToken(adminId: string): Promise<string | null> {
    const config = await this.getConfig(adminId)
    if (!config || !config.apiToken) {
      return null
    }

    try {
      return this.decryptToken(config.apiToken)
    } catch (error) {
      console.error('Error decrypting token:', error)
      return null
    }
  }

  /**
   * Test Manychat API connection
   */
  async testConnection(apiToken: string): Promise<boolean> {
    try {
      await this.makeRequest('/fb/page/getInfo', apiToken)
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * Get page information
   */
  async getPageInfo(apiToken: string): Promise<any> {
    return this.makeRequest('/fb/page/getInfo', apiToken)
  }

  /**
   * Get all contacts from Manychat
   */
  async getContacts(adminId: string, page = 1, pageSize = 100): Promise<{
    contacts: ManychatContact[]
    hasMore: boolean
  }> {
    const apiToken = await this.getApiToken(adminId)
    if (!apiToken) {
      throw new Error('Manychat not configured')
    }

    const response = await this.makeRequest<{
      data: ManychatContact[]
      next_page?: string
    }>(`/fb/subscriber/getSubscribers?page=${page}&count=${pageSize}`, apiToken)

    return {
      contacts: response.data || [],
      hasMore: !!response.next_page,
    }
  }

  /**
   * Get single contact by ID
   */
  async getContact(adminId: string, subscriberId: string): Promise<ManychatContact> {
    const apiToken = await this.getApiToken(adminId)
    if (!apiToken) {
      throw new Error('Manychat not configured')
    }

    const response = await this.makeRequest<{ data: ManychatContact }>(
      `/fb/subscriber/getInfo?subscriber_id=${subscriberId}`,
      apiToken
    )

    return response.data
  }

  /**
   * Sync contacts from Manychat to database
   */
  async syncContacts(adminId: string): Promise<{
    synced: number
    created: number
    updated: number
  }> {
    let page = 1
    let hasMore = true
    let synced = 0
    let created = 0
    let updated = 0

    while (hasMore) {
      const { contacts, hasMore: more } = await this.getContacts(adminId, page)
      hasMore = more

      for (const contact of contacts) {
        try {
          // Check if user exists
          const existingUser = contact.instagram_username
            ? await db.user.findUnique({ where: { igUsername: contact.instagram_username } })
            : await db.user.findUnique({ where: { manychatId: contact.id } })

          if (existingUser) {
            // Update existing user
            await db.user.update({
              where: { id: existingUser.id },
              data: {
                manychatId: contact.id,
                igUsername: contact.instagram_username || existingUser.igUsername,
                firstName: contact.first_name || existingUser.firstName,
                lastName: contact.last_name || existingUser.lastName,
                profilePicUrl: contact.profile_pic || existingUser.profilePicUrl,
                lastInteraction: new Date(),
                updatedAt: new Date(),
              },
            })
            updated++
          } else {
            // Create new user
            await db.user.create({
              data: {
                manychatId: contact.id,
                igUsername: contact.instagram_username,
                firstName: contact.first_name,
                lastName: contact.last_name,
                profilePicUrl: contact.profile_pic,
                lastInteraction: new Date(),
                isSubscribed: true,
              },
            })
            created++
          }

          synced++
        } catch (error) {
          console.error(`Error syncing contact ${contact.id}:`, error)
        }
      }

      page++
    }

    // Log sync
    await db.syncLog.create({
      data: {
        syncType: 'contact',
        status: 'success',
        recordsProcessed: synced,
      },
    })

    return { synced, created, updated }
  }

  /**
   * Get all tags from Manychat
   */
  async getTags(adminId: string): Promise<ManychatTag[]> {
    const apiToken = await this.getApiToken(adminId)
    if (!apiToken) {
      throw new Error('Manychat not configured')
    }

    const response = await this.makeRequest<{ data: ManychatTag[] }>(
      '/fb/page/getTags',
      apiToken
    )

    return response.data || []
  }

  /**
   * Sync tags from Manychat to database
   */
  async syncTags(adminId: string): Promise<number> {
    const tags = await this.getTags(adminId)
    let synced = 0

    for (const tag of tags) {
      try {
        await db.tag.upsert({
          where: { manychatId: tag.id },
          create: {
            name: tag.name,
            manychatId: tag.id,
            adminId,
          },
          update: {
            name: tag.name,
          },
        })
        synced++
      } catch (error) {
        console.error(`Error syncing tag ${tag.id}:`, error)
      }
    }

    // Log sync
    await db.syncLog.create({
      data: {
        syncType: 'tags',
        status: 'success',
        recordsProcessed: synced,
      },
    })

    return synced
  }

  /**
   * Add tag to contact in Manychat
   */
  async addTagToContact(adminId: string, subscriberId: string, tagId: string): Promise<void> {
    const apiToken = await this.getApiToken(adminId)
    if (!apiToken) {
      throw new Error('Manychat not configured')
    }

    await this.makeRequest(
      '/fb/subscriber/addTag',
      apiToken,
      {
        method: 'POST',
        body: JSON.stringify({
          subscriber_id: subscriberId,
          tag_id: tagId,
        }),
      }
    )
  }

  /**
   * Remove tag from contact in Manychat
   */
  async removeTagFromContact(adminId: string, subscriberId: string, tagId: string): Promise<void> {
    const apiToken = await this.getApiToken(adminId)
    if (!apiToken) {
      throw new Error('Manychat not configured')
    }

    await this.makeRequest(
      '/fb/subscriber/removeTag',
      apiToken,
      {
        method: 'POST',
        body: JSON.stringify({
          subscriber_id: subscriberId,
          tag_id: tagId,
        }),
      }
    )
  }

  /**
   * Set custom field value for contact
   */
  async setCustomField(
    adminId: string,
    subscriberId: string,
    fieldId: string,
    value: any
  ): Promise<void> {
    const apiToken = await this.getApiToken(adminId)
    if (!apiToken) {
      throw new Error('Manychat not configured')
    }

    await this.makeRequest(
      '/fb/subscriber/setCustomField',
      apiToken,
      {
        method: 'POST',
        body: JSON.stringify({
          subscriber_id: subscriberId,
          field_id: fieldId,
          field_value: value,
        }),
      }
    )
  }

  /**
   * Disconnect Manychat
   */
  async disconnect(adminId: string): Promise<void> {
    await db.manychatConfig.update({
      where: { adminId },
      data: {
        isConnected: false,
        updatedAt: new Date(),
      },
    })
  }

  /**
   * Delete Manychat configuration
   */
  async deleteConfig(adminId: string): Promise<void> {
    await db.manychatConfig.delete({
      where: { adminId },
    })
  }
}

export const manychatService = new ManychatService()
