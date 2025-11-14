import { v2 as cloudinary } from 'cloudinary'

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export { cloudinary }

/**
 * Upload image to Cloudinary with auto-crop to 5:6 aspect ratio
 * @param file - File path, buffer, or base64 string
 * @param folder - Optional folder name in Cloudinary
 * @returns Cloudinary upload result with optimized URL
 */
export async function uploadGalleryImage(
  file: string | Buffer,
  folder: string = 'playgram/gallery'
) {
  const result = await cloudinary.uploader.upload(file, {
    folder,
    // Crop to 5:6 aspect ratio (1080x1296)
    transformation: [
      {
        width: 1080,
        height: 1296,
        crop: 'fill',
        gravity: 'auto',
        quality: 'auto',
        fetch_format: 'auto',
      },
    ],
    // Generate responsive versions
    responsive_breakpoints: {
      create_derived: true,
      bytes_step: 20000,
      min_width: 400,
      max_width: 1080,
      max_images: 3,
    },
  })

  return {
    url: result.secure_url,
    publicId: result.public_id,
    width: result.width,
    height: result.height,
  }
}

/**
 * Generate optimized Cloudinary URL for an existing image
 * @param publicId - Cloudinary public ID
 * @param width - Target width
 * @param height - Target height
 * @returns Optimized URL
 */
export function getOptimizedImageUrl(
  publicId: string,
  width: number = 1080,
  height: number = 1296
) {
  return cloudinary.url(publicId, {
    width,
    height,
    crop: 'fill',
    gravity: 'auto',
    quality: 'auto',
    fetch_format: 'auto',
  })
}
