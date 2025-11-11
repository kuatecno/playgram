import { db } from '@/lib/db'

export interface QRFormatResolverData {
  user?: {
    id: string
    firstName?: string | null
    lastName?: string | null
    igUsername?: string | null
    email?: string | null
    manychatId?: string | null
  }
  tags?: Array<{ id: string; name: string; manychatId?: string | null }>
  customFields?: Array<{ id: string; name: string; value?: any }>
  metadata?: Record<string, any>
}

/**
 * Generate a random alphanumeric string
 */
function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * Resolve dynamic placeholders in QR code format pattern
 *
 * Supported placeholders:
 * - {{first_name}}, {{last_name}}, {{email}}, {{igUsername}}, etc. (user fields)
 * - {{tag:TAG_ID}} (tag references by ID)
 * - {{custom_field:FIELD_ID}} (custom field references by ID)
 * - {{random}} or {{random:N}} (random string of N characters, default 6)
 * - {{timestamp}} (current Unix timestamp)
 * - {{date}} (current date YYYYMMDD)
 * - {{metadata:KEY}} (metadata value by key)
 */
export function resolveQRCodeFormat(
  pattern: string,
  data: QRFormatResolverData
): string {
  let resolved = pattern

  // Replace user fields
  if (data.user) {
    const userFieldMap: Record<string, any> = {
      id: data.user.id,
      first_name: data.user.firstName || '',
      last_name: data.user.lastName || '',
      full_name: `${data.user.firstName || ''} ${data.user.lastName || ''}`.trim(),
      igUsername: data.user.igUsername || '',
      ig_username: data.user.igUsername || '',
      email: data.user.email || '',
      manychat_id: data.user.manychatId || '',
    }

    // Replace {{field_name}} with actual values
    Object.keys(userFieldMap).forEach((field) => {
      const regex = new RegExp(`\\{\\{${field}\\}\\}`, 'gi')
      resolved = resolved.replace(regex, String(userFieldMap[field] || ''))
    })
  }

  // Replace tag references: {{tag:TAG_ID}}
  if (data.tags) {
    data.tags.forEach((tag) => {
      // Match by tag ID or Manychat ID
      const regexById = new RegExp(`\\{\\{tag:${tag.id}\\}\\}`, 'gi')
      const regexByManychatId = tag.manychatId
        ? new RegExp(`\\{\\{tag:${tag.manychatId}\\}\\}`, 'gi')
        : null

      resolved = resolved.replace(regexById, tag.name || '')
      if (regexByManychatId) {
        resolved = resolved.replace(regexByManychatId, tag.name || '')
      }
    })
  }

  // Replace custom field references: {{custom_field:FIELD_ID}}
  if (data.customFields) {
    data.customFields.forEach((field) => {
      const regex = new RegExp(`\\{\\{custom_field:${field.id}\\}\\}`, 'gi')
      resolved = resolved.replace(regex, String(field.value || ''))
    })
  }

  // Replace metadata references: {{metadata:KEY}}
  if (data.metadata) {
    Object.keys(data.metadata).forEach((key) => {
      const regex = new RegExp(`\\{\\{metadata:${key}\\}\\}`, 'gi')
      resolved = resolved.replace(regex, String(data.metadata![key] || ''))
    })
  }

  // Replace timestamp placeholder: {{timestamp}}
  resolved = resolved.replace(/\{\{timestamp\}\}/gi, Date.now().toString())

  // Replace date placeholder: {{date}}
  const now = new Date()
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  resolved = resolved.replace(/\{\{date\}\}/gi, dateStr)

  // Replace random string placeholders: {{random}} or {{random:6}}
  resolved = resolved.replace(/\{\{random(?::(\d+))?\}\}/gi, (match, lengthStr) => {
    const length = lengthStr ? parseInt(lengthStr) : 6
    return generateRandomString(length)
  })

  // Clean up any remaining unreplaced placeholders
  resolved = resolved.replace(/\{\{[^}]+\}\}/g, '')

  // Clean up double dashes, spaces, or leading/trailing dashes
  resolved = resolved
    .replace(/--+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/^-|-$/g, '')
    .replace(/_+/g, '_')
    .toUpperCase()

  return resolved
}

/**
 * Fetch user data for QR code format resolution
 */
export async function fetchUserDataForQR(userId: string): Promise<QRFormatResolverData> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      tags: {
        select: {
          id: true,
          name: true,
          manychatId: true,
        },
      },
      customFieldValues: {
        include: {
          field: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  })

  if (!user) {
    throw new Error('User not found')
  }

  return {
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      igUsername: user.igUsername,
      manychatId: user.manychatId,
    },
    tags: user.tags,
    customFields: user.customFieldValues.map((cfv) => ({
      id: cfv.field.id,
      name: cfv.field.name,
      value: cfv.value,
    })),
  }
}

/**
 * Generate preview of QR code format with sample data
 */
export function previewQRCodeFormat(pattern: string): string {
  const sampleData: QRFormatResolverData = {
    user: {
      id: 'usr_123456',
      firstName: 'John',
      lastName: 'Doe',
      igUsername: 'johndoe',
      email: 'john@example.com',
      manychatId: 'mc_123',
    },
    tags: [
      { id: 'tag_1', name: 'VIP', manychatId: 'mc_tag_1' },
      { id: 'tag_2', name: 'Premium', manychatId: 'mc_tag_2' },
    ],
    customFields: [
      { id: 'field_1', name: 'membership_level', value: 'Gold' },
      { id: 'field_2', name: 'points', value: '1500' },
    ],
    metadata: {
      campaign: 'SUMMER2025',
      location: 'STORE1',
    },
  }

  return resolveQRCodeFormat(pattern, sampleData)
}
