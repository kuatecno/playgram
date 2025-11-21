import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { dynamicGalleryService } from '@/features/dynamic-gallery/service'

/**
 * GET /api/v1/dynamic-gallery/galleries/[galleryId]
 * Get a specific gallery with full details
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ galleryId: string }> }
) {
  try {
    const user = await requireAuth()
    const { galleryId } = await params

    const gallery = await dynamicGalleryService.getGalleryById(galleryId, user.id)

    if (!gallery) {
      return NextResponse.json(
        { success: false, error: 'Gallery not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: gallery,
    })
  } catch (error: any) {
    console.error('Error fetching gallery:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch gallery', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/v1/dynamic-gallery/galleries/[galleryId]
 * Update a gallery (name, displayOrder, autoSyncEnabled)
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ galleryId: string }> }
) {
  try {
    const user = await requireAuth()
    const { galleryId } = await params
    const body = await req.json()
    const { name, displayOrder, autoSyncEnabled } = body

    const updates: { name?: string; displayOrder?: number; autoSyncEnabled?: boolean } = {}
    if (name !== undefined) updates.name = name
    if (displayOrder !== undefined) updates.displayOrder = displayOrder
    if (autoSyncEnabled !== undefined) updates.autoSyncEnabled = autoSyncEnabled

    const gallery = await dynamicGalleryService.updateGallery(galleryId, user.id, updates)

    return NextResponse.json({
      success: true,
      data: gallery,
    })
  } catch (error: any) {
    console.error('Error updating gallery:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update gallery', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/v1/dynamic-gallery/galleries/[galleryId]
 * Delete a gallery
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ galleryId: string }> }
) {
  try {
    const user = await requireAuth()
    const { galleryId } = await params

    await dynamicGalleryService.deleteGallery(galleryId, user.id)

    return NextResponse.json({
      success: true,
      message: 'Gallery deleted successfully',
    })
  } catch (error: any) {
    console.error('Error deleting gallery:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete gallery', details: error.message },
      { status: 500 }
    )
  }
}
