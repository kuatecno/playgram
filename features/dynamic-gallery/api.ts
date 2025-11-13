import type {
  DynamicGallerySummaryDTO,
  DynamicGalleryCardList,
} from './types'

const API_BASE = '/api/v1/dynamic-gallery'

export const dynamicGalleryApi = {
  /**
   * Get complete dynamic gallery summary
   */
  async getSummary(): Promise<DynamicGallerySummaryDTO> {
    const response = await fetch(API_BASE, {
      method: 'GET',
      credentials: 'include',
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to fetch summary' }))
      throw new Error(error.message || 'Failed to fetch summary')
    }

    const data = await response.json()
    return data.data
  },

  /**
   * Store gallery cards manually
   */
  async storeCards(cards: DynamicGalleryCardList): Promise<{
    snapshotId: string
    version: number
    created: boolean
  }> {
    const response = await fetch(`${API_BASE}/cards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ cards }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to store cards' }))
      throw new Error(error.message || 'Failed to store cards')
    }

    const data = await response.json()
    return data.data
  },

  /**
   * Trigger manual sync to ManyChat
   */
  async triggerSync(options?: {
    snapshotId?: string
    dryRun?: boolean
    contactIds?: string[]
  }): Promise<{
    success: boolean
    cardCount: number
    contactsUpdated?: number
    durationMs?: number
    dryRun?: boolean
  }> {
    const response = await fetch(`${API_BASE}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(options || {}),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Sync failed' }))
      throw new Error(error.message || 'Sync failed')
    }

    const data = await response.json()
    return data.data
  },

  /**
   * Generate new webhook secret
   */
  async generateSecret(label?: string): Promise<{
    id: string
    label: string
    secret: string
    createdAt: Date
  }> {
    const response = await fetch(`${API_BASE}/secrets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ label }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to generate secret' }))
      throw new Error(error.message || 'Failed to generate secret')
    }

    const data = await response.json()
    return data.data
  },

  /**
   * Revoke webhook secret
   */
  async revokeSecret(secretId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/secrets/${secretId}`, {
      method: 'DELETE',
      credentials: 'include',
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to revoke secret' }))
      throw new Error(error.message || 'Failed to revoke secret')
    }
  },

  /**
   * Update configuration
   */
  async updateConfig(config: {
    autoSyncEnabled?: boolean
  }): Promise<DynamicGallerySummaryDTO> {
    const response = await fetch(`${API_BASE}/config`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(config),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to update config' }))
      throw new Error(error.message || 'Failed to update config')
    }

    const data = await response.json()
    return data.data
  },
}
