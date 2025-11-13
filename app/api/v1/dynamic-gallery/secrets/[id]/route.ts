import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { apiResponse } from '@/lib/utils/api-response'
import { dynamicGalleryService } from '@/features/dynamic-gallery/service'

/**
 * DELETE /api/v1/dynamic-gallery/secrets/:id
 * Revoke a webhook secret
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params

    await dynamicGalleryService.revokeSecretForAdmin(user.id, id)

    return apiResponse.success({ message: 'Secret revoked successfully' })
  } catch (error) {
    return apiResponse.error(error)
  }
}
