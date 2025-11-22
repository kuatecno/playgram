import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { qrCodeService } from '@/features/qr-codes/services/QRCodeService'

const generateQRSchema = z.object({
  toolId: z.string().min(1, 'Tool ID is required'),
  qrType: z.enum(['promotion', 'validation', 'discount']).optional(),
  userId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
})

/**
 * POST /api/v1/qr/manychat-generate
 *
 * ManyChat-compatible QR generation endpoint
 * Returns response in ManyChat Dynamic Block format with version property
 *
 * Expected input from ManyChat:
 * {
 *   "toolId": "tool_id_here",
 *   "qrType": "promotion",
 *   "userId": "{{user_id}}",
 *   "metadata": {
 *     "label": "{{first_name}}'s QR",
 *     "campaign": "spring_2024"
 *   }
 * }
 *
 * Returns ManyChat Dynamic Block format:
 * {
 *   "version": "v2",
 *   "content": {
 *     "messages": [
 *       {
 *         "type": "image",
 *         "url": "data:image/png;base64,..."
 *       },
 *       {
 *         "type": "text",
 *         "text": "Your QR code: PROMO-ABC123"
 *       }
 *     ]
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    const validated = generateQRSchema.parse(body)

    // Get QR type
    const qrType = validated.qrType || 'promotion'

    // Verify the tool exists and get its owner + config
    const tool = await db.tool.findUnique({
      where: { id: validated.toolId },
      select: {
        adminId: true,
        isActive: true,
        name: true,
        qrConfig: {
          select: {
            metadata: true,
          },
        },
      },
    })

    if (!tool) {
      return Response.json({
        version: 'v2',
        content: {
          type: 'instagram',
          messages: [
            {
              type: 'text',
              text: '❌ Invalid tool ID. Please contact support.',
            },
          ],
          actions: [],
          quick_replies: [],
        },
      })
    }

    if (!tool.isActive) {
      return Response.json({
        version: 'v2',
        content: {
          type: 'instagram',
          messages: [
            {
              type: 'text',
              text: '❌ This QR tool is currently inactive. Please contact support.',
            },
          ],
          actions: [],
          quick_replies: [],
        },
      })
    }

    // For ManyChat requests, userId is required
    if (!validated.userId) {
      return Response.json({
        version: 'v2',
        content: {
          type: 'instagram',
          messages: [
            {
              type: 'text',
              text: '❌ User ID is required. Please use {{user_id}} in your ManyChat flow.',
            },
          ],
          actions: [],
          quick_replies: [],
        },
      })
    }

    // Merge stored config metadata with request metadata
    const storedMetadata = (tool.qrConfig?.metadata as any) || {}
    const defaultCampaignName = storedMetadata.campaignName
    const defaultQrType = storedMetadata.defaultQrType || qrType
    const additionalFields = storedMetadata.additionalFields || {}

    // Merge metadata: request metadata overrides stored defaults
    const mergedMetadata = {
      ...additionalFields, // Additional fields from config
      ...(defaultCampaignName && !validated.metadata?.campaign && { campaign: defaultCampaignName }),
      ...(storedMetadata.campaignDescription && { description: storedMetadata.campaignDescription }),
      ...validated.metadata, // Request metadata takes priority
    }

    // Generate label from metadata if provided
    const labelFromMetadata = mergedMetadata.label as string | undefined
    const label = labelFromMetadata || `${defaultQrType}-${Date.now()}`

    // Generate QR code
    const result = await qrCodeService.generateQRCode({
      adminId: tool.adminId,
      toolId: validated.toolId,
      type: validated.qrType || defaultQrType,
      label,
      userId: validated.userId,
      data: {
        metadata: mergedMetadata,
      },
    })

    // Fix image URL to use the actual host from the request or production URL
    const host = request.headers.get('host')
    const protocol = request.headers.get('x-forwarded-proto') || 'https'
    
    // Use production URL if available, otherwise construct from request
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`
    const fixedImageUrl = `${baseUrl}/api/v1/qr/image/${result.qrCode.code}`

    // Return ManyChat-compatible format (Instagram)
    return Response.json({
      version: 'v2',
      content: {
        type: 'instagram',
        messages: [
          {
            type: 'image',
            url: fixedImageUrl,
          },
        ],
        actions: [],
        quick_replies: [],
      },
    })
  } catch (error) {
    console.error('ManyChat QR generation error:', error)

    // Return error in ManyChat format (Instagram)
    return Response.json({
      version: 'v2',
      content: {
        type: 'instagram',
        messages: [
          {
            type: 'text',
            text: '❌ Failed to generate QR code. Please try again or contact support.',
          },
        ],
        actions: [],
        quick_replies: [],
      },
    })
  }
}
