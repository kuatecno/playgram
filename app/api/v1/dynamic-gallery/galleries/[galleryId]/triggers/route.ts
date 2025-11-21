import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { dynamicGalleryService } from '@/features/dynamic-gallery/service'

/**
 * POST /api/v1/dynamic-gallery/galleries/[galleryId]/triggers
 * Add a trigger to a gallery
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ galleryId: string }> }
) {
  try {
    const user = await requireAuth()
    const { galleryId } = await params
    const body = await req.json()
    const { triggerType, triggerKey, metadata } = body

    if (!triggerType || !triggerKey) {
      return NextResponse.json(
        { success: false, error: 'triggerType and triggerKey are required' },
        { status: 400 }
      )
    }

    const trigger = await dynamicGalleryService.addGalleryTrigger(
      galleryId,
      user.id,
      triggerType,
      triggerKey,
      metadata
    )

    return NextResponse.json({
      success: true,
      data: trigger,
    })
  } catch (error: any) {
    console.error('Error adding trigger:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to add trigger', details: error.message },
      { status: 500 }
    )
  }
}
