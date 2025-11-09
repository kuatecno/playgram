import { NextRequest } from 'next/server'
import { apiResponse } from '@/lib/utils/api-response'
import { verifyApiKey, incrementApiUsage, trackApiUsage } from '@/lib/utils/api-key'
import { socialDataService } from '@/features/social-data/services/SocialDataService'
import type { Platform, DataType } from '@/types/social-media'

const SUPPORTED_PLATFORMS: Platform[] = ['instagram', 'tiktok', 'google']

export async function GET(
  request: NextRequest,
  { params }: { params: { platform: string } }
) {
  const startTime = Date.now()
  let clientId: string | undefined
  let cacheHit = false

  try {
    const platform = params.platform as Platform

    // Validate platform
    if (!SUPPORTED_PLATFORMS.includes(platform)) {
      return apiResponse.badRequest(`Unsupported platform: ${platform}`)
    }

    // Get API key from header or query
    const apiKey =
      request.headers.get('x-api-key') ||
      request.nextUrl.searchParams.get('api_key')

    if (!apiKey) {
      return apiResponse.unauthorized('API key is required. Use x-api-key header or api_key query parameter.')
    }

    // Verify API key
    const client = await verifyApiKey(apiKey)
    clientId = client.id

    // Check if client has access to this platform
    if (!client.allowedPlatforms.includes(platform)) {
      return apiResponse.forbidden(`Your plan does not include access to ${platform}`)
    }

    // Get query parameters
    const identifier = request.nextUrl.searchParams.get('identifier') ||
                      request.nextUrl.searchParams.get('username') ||
                      request.nextUrl.searchParams.get('handle')

    const dataType = (request.nextUrl.searchParams.get('type') || 'posts') as DataType
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '12')
    const forceRefresh = request.nextUrl.searchParams.get('force_refresh') === 'true'

    if (!identifier) {
      return apiResponse.badRequest('identifier parameter is required (username, handle, or place_id)')
    }

    // Validate limit
    if (limit < 1 || limit > 100) {
      return apiResponse.badRequest('limit must be between 1 and 100')
    }

    // Fetch data
    const result = await socialDataService.fetchData(
      platform,
      dataType,
      identifier,
      { limit, forceRefresh }
    )

    cacheHit = result.metadata.cached

    // Increment usage counter
    await incrementApiUsage(client.id)

    // Track API usage
    const responseTime = Date.now() - startTime
    await trackApiUsage(
      client.id,
      platform,
      `/api/v1/social/${platform}`,
      responseTime,
      cacheHit,
      200
    )

    // Return data (sanitized - no mention of Apify)
    return apiResponse.success({
      platform,
      identifier,
      data: result.data,
      metadata: {
        total: result.metadata.total,
        cached: result.metadata.cached,
        timestamp: result.metadata.timestamp,
      },
    })

  } catch (error) {
    const responseTime = Date.now() - startTime

    // Track failed request
    if (clientId) {
      await trackApiUsage(
        clientId,
        params.platform,
        `/api/v1/social/${params.platform}`,
        responseTime,
        cacheHit,
        error instanceof Error && 'statusCode' in error
          ? (error as any).statusCode
          : 500
      )
    }

    return apiResponse.error(error)
  }
}
