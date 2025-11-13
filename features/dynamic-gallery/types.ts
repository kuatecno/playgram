import { z } from 'zod'

export const dynamicGalleryButtonSchema = z.object({
  title: z.string().min(1).max(80),
  type: z.enum(['link', 'flow', 'call']).default('link'),
  url: z.string().max(2048).optional(),
  value: z.string().max(2048).optional(),
})
  .refine(
    (button) => {
      if (button.type === 'link' || button.type === 'call') {
        return Boolean(button.url)
      }
      if (button.type === 'flow') {
        return Boolean(button.value)
      }
      return true
    },
    {
      message: 'Buttons must include a URL for link/call or a flow ID for flow buttons',
      path: ['url'],
    }
  )

export const dynamicGalleryCardSchema = z.object({
  id: z.string().optional(),
  imageUrl: z.string().url().max(2048),
  title: z.string().min(1).max(80),
  subtitle: z.string().min(1).max(80),
  buttons: z
    .array(dynamicGalleryButtonSchema)
    .max(3)
    .optional()
    .default([]),
})

export const dynamicGalleryCardListSchema = z
  .array(dynamicGalleryCardSchema)
  .max(10, 'Maximum of 10 cards supported')

export type DynamicGalleryButton = z.infer<typeof dynamicGalleryButtonSchema>
export type DynamicGalleryCard = z.infer<typeof dynamicGalleryCardSchema>
export type DynamicGalleryCardList = z.infer<typeof dynamicGalleryCardListSchema>

export interface DynamicGallerySnapshotDTO {
  id: string
  version: number
  cardCount: number
  cards: DynamicGalleryCardList
  hash: string
  createdAt: string
}

export interface DynamicGallerySecretDTO {
  id: string
  label: string
  createdAt: string
  lastUsedAt: string | null
  revokedAt: string | null
}

export interface DynamicGallerySourceDTO {
  id: string
  name: string
  sourceType: 'webhook' | 'api' | 'manual'
  endpoint?: string | null
  description?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface DynamicGallerySyncLogDTO {
  id: string
  triggerType: 'manual' | 'webhook' | 'schedule'
  status: 'success' | 'warning' | 'failed'
  cardCount: number
  contactsImpacted: number
  durationMs?: number | null
  errorMessage?: string | null
  createdAt: string
}

export interface DynamicGallerySummaryDTO {
  config: {
    toolId: string
    autoSyncEnabled: boolean
    lastSyncedAt: string | null
    lastWebhookAt: string | null
    lastSyncStatus: 'success' | 'warning' | 'failed' | null
  }
  snapshot: DynamicGallerySnapshotDTO | null
  sources: DynamicGallerySourceDTO[]
  secrets: DynamicGallerySecretDTO[]
  syncLogs: DynamicGallerySyncLogDTO[]
  webhookUrl: string | null
}
