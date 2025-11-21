import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { dynamicGalleryService } from '@/features/dynamic-gallery/service'

/**
 * DELETE /api/v1/dynamic-gallery/triggers/[triggerId]
 * Remove a trigger from a gallery
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ triggerId: string }> }
) {
  try {
    const user = await requireAuth()
    const { triggerId } = await params

    await dynamicGalleryService.removeGalleryTrigger(triggerId, user.id)

    return NextResponse.json({
      success: true,
      message: 'Trigger removed successfully',
    })
  } catch (error: any) {
    console.error('Error removing trigger:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to remove trigger', details: error.message },
      { status: 500 }
    )
  }
}
