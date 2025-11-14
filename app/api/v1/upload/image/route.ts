import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { apiResponse } from '@/lib/utils/api-response'
import { uploadGalleryImage } from '@/lib/cloudinary'

/**
 * POST /api/v1/upload/image
 * Upload and crop image to Cloudinary for dynamic gallery
 */
export async function POST(request: NextRequest) {
  try {
    await requireAuth()

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return apiResponse.validationError('No file provided')
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return apiResponse.validationError('Invalid file type. Only JPEG, PNG, and WebP are allowed.')
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return apiResponse.validationError('File too large. Maximum size is 10MB.')
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Upload to Cloudinary with auto-crop to 5:6 ratio
    const result = await uploadGalleryImage(buffer)

    return apiResponse.success({
      url: result.url,
      publicId: result.publicId,
      width: result.width,
      height: result.height,
      message: 'Image uploaded and cropped to 5:6 aspect ratio (1080x1296)',
    })
  } catch (error) {
    console.error('Image upload error:', error)
    return apiResponse.error(error)
  }
}
