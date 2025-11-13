import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth/session'
import { apiResponse } from '@/lib/utils/api-response'
import { qrCodeService } from '@/features/qr-codes/services/QRCodeService'
import { db } from '@/lib/db'

const bulkGenerateSchema = z.object({
  toolId: z.string().min(1, 'Tool ID is required'),
  type: z.enum(['promotion', 'validation', 'discount']),
  labelTemplate: z.string().min(1, 'Label template is required'),
  campaign: z.string().optional(),
  message: z.string().optional(),
  userIds: z.array(z.string()).min(1, 'At least one user ID is required'),
})

/**
 * POST /api/v1/qr/bulk
 * Generate multiple QR codes for selected users
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()

    // Validate input
    const validated = bulkGenerateSchema.parse(body)

    // Fetch users to get their data for label template resolution
    const users = await db.user.findMany({
      where: {
        id: { in: validated.userIds },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        igUsername: true,
        manychatId: true,
      },
    })

    // Generate QR codes for each user
    const results = await Promise.all(
      users.map(async (userRecord) => {
        // Resolve label template with user data
        let label = validated.labelTemplate
        label = label.replace(/\{\{first_name\}\}/gi, userRecord.firstName || '')
        label = label.replace(/\{\{last_name\}\}/gi, userRecord.lastName || '')
        label = label.replace(/\{\{igUsername\}\}/gi, userRecord.igUsername || '')
        label = label.replace(/\{\{username\}\}/gi, userRecord.igUsername || '')
        // Clean up any double spaces or dashes
        label = label.replace(/\s+/g, ' ').replace(/-+/g, '-').trim()

        // Prepare metadata
        const metadata: Record<string, unknown> = {}
        if (validated.campaign) {
          metadata.campaign = validated.campaign
          metadata.campaign_name = validated.campaign
        }

        // Generate QR code
        const result = await qrCodeService.generateQRCode({
          adminId: user.id,
          toolId: validated.toolId,
          type: validated.type,
          label,
          userId: userRecord.id,
          data: {
            message: validated.message,
            metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
          },
        })

        return {
          userId: userRecord.id,
          userName: `${userRecord.firstName || ''} ${userRecord.lastName || ''}`.trim(),
          label,
          qrCodeDataUrl: result.qrCodeDataUrl,
          scanUrl: result.qrCode.scanUrl,
        }
      })
    )

    return apiResponse.success({
      qrCodes: results,
      count: results.length,
    }, 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiResponse.validationError(error.errors[0].message)
    }
    return apiResponse.error(error)
  }
}
