import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { dynamicGalleryService } from '@/features/dynamic-gallery/service'

/**
 * GET /api/v1/dynamic-gallery/galleries
 * List all galleries for the authenticated admin
 */
export async function GET() {
  try {
    const user = await requireAuth()
    const galleries = await dynamicGalleryService.listGalleries(user.id)

    return NextResponse.json({
      success: true,
      data: galleries,
    })
  } catch (error: any) {
    console.error('Error listing galleries:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to list galleries', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/v1/dynamic-gallery/galleries
 * Create a new gallery
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()
    const { name, displayOrder } = body

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Gallery name is required' },
        { status: 400 }
      )
    }

    const gallery = await dynamicGalleryService.createGallery(
      user.id,
      name,
      displayOrder
    )

    return NextResponse.json({
      success: true,
      data: gallery,
    })
  } catch (error: any) {
    console.error('Error creating gallery:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create gallery', details: error.message },
      { status: 500 }
    )
  }
}
