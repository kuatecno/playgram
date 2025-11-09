import { ApifyClient } from 'apify-client'
import { db } from '@/lib/db'
import { cache } from '@/lib/cache'
import { TTL, APIFY_CONFIG } from '@/config/constants'
import type {
  Platform,
  DataType,
  InstagramPost,
  TikTokVideo,
  GoogleReview,
  SocialMediaResponse,
  ApifyActorInput,
} from '@/types/social-media'

/**
 * Apify Service
 * Handles all social media data fetching via Apify
 * IMPORTANT: This service is INTERNAL - do not expose Apify in public APIs
 */
export class ApifyService {
  private client: ApifyClient | null = null

  constructor() {
    if (process.env.APIFY_API_TOKEN) {
      this.client = new ApifyClient({
        token: process.env.APIFY_API_TOKEN,
      })
    }
  }

  /**
   * Check if Apify is configured
   */
  isConfigured(): boolean {
    return this.client !== null
  }

  /**
   * Fetch Instagram posts for a user
   */
  async fetchInstagramPosts(username: string, limit = 12): Promise<InstagramPost[]> {
    if (!this.client) {
      throw new Error('Apify is not configured')
    }

    const startTime = Date.now()

    try {
      // Get actor configuration from database
      const actorConfig = await db.apifyDataSource.findUnique({
        where: { platform: 'instagram' },
      })

      const actorId = actorConfig?.actorId || APIFY_CONFIG.INSTAGRAM_ACTOR

      // Prepare input
      const input: ApifyActorInput = {
        directUrls: [`https://www.instagram.com/${username}/`],
        resultsLimit: limit,
        ...((actorConfig?.defaultInput as object) || {}),
      }

      // Run actor
      const run = await this.client.actor(actorId).call(input, {
        timeout: APIFY_CONFIG.DEFAULT_TIMEOUT,
      })

      // Fetch results
      const { items } = await this.client.dataset(run.defaultDatasetId).listItems()

      // Transform to standard format
      const posts: InstagramPost[] = items.map((item: any) => ({
        id: item.id || item.shortCode,
        type: item.type || 'image',
        caption: item.caption,
        mediaUrl: item.displayUrl || item.url,
        thumbnailUrl: item.thumbnailUrl,
        permalink: item.url || `https://www.instagram.com/p/${item.shortCode}/`,
        timestamp: item.timestamp,
        likes: item.likesCount,
        comments: item.commentsCount,
        engagement: (item.likesCount || 0) + (item.commentsCount || 0),
        hashtags: item.hashtags,
        mentions: item.mentions,
        location: item.locationName,
      }))

      const duration = Date.now() - startTime

      // Log fetch for cost tracking
      await this.logFetch('instagram', username, duration, posts.length)

      return posts
    } catch (error) {
      console.error('Apify Instagram fetch error:', error)
      throw error
    }
  }

  /**
   * Fetch TikTok videos for a user
   */
  async fetchTikTokVideos(username: string, limit = 12): Promise<TikTokVideo[]> {
    if (!this.client) {
      throw new Error('Apify is not configured')
    }

    const startTime = Date.now()

    try {
      const actorConfig = await db.apifyDataSource.findUnique({
        where: { platform: 'tiktok' },
      })

      const actorId = actorConfig?.actorId || APIFY_CONFIG.TIKTOK_ACTOR

      const input: ApifyActorInput = {
        profiles: [username],
        resultsPerPage: limit,
        ...((actorConfig?.defaultInput as object) || {}),
      }

      const run = await this.client.actor(actorId).call(input, {
        timeout: APIFY_CONFIG.DEFAULT_TIMEOUT,
      })

      const { items } = await this.client.dataset(run.defaultDatasetId).listItems()

      const videos: TikTokVideo[] = items.map((item: any) => ({
        id: item.id,
        description: item.text || item.description,
        videoUrl: item.videoUrl || item.video?.downloadAddr,
        thumbnailUrl: item.covers?.[0] || item.thumbnail,
        permalink: item.webVideoUrl || `https://www.tiktok.com/@${username}/video/${item.id}`,
        timestamp: item.createTime ? new Date(item.createTime * 1000).toISOString() : new Date().toISOString(),
        likes: item.diggCount || item.stats?.diggCount,
        comments: item.commentCount || item.stats?.commentCount,
        shares: item.shareCount || item.stats?.shareCount,
        views: item.playCount || item.stats?.playCount,
        engagement: (item.diggCount || 0) + (item.commentCount || 0) + (item.shareCount || 0),
        hashtags: item.hashtags,
        music: item.music ? {
          title: item.music.title,
          author: item.music.authorName,
        } : undefined,
      }))

      const duration = Date.now() - startTime
      await this.logFetch('tiktok', username, duration, videos.length)

      return videos
    } catch (error) {
      console.error('Apify TikTok fetch error:', error)
      throw error
    }
  }

  /**
   * Fetch Google Reviews for a place
   */
  async fetchGoogleReviews(placeId: string, limit = 20): Promise<GoogleReview[]> {
    if (!this.client) {
      throw new Error('Apify is not configured')
    }

    const startTime = Date.now()

    try {
      const actorConfig = await db.apifyDataSource.findUnique({
        where: { platform: 'google' },
      })

      const actorId = actorConfig?.actorId || APIFY_CONFIG.GOOGLE_MAPS_ACTOR

      const input: ApifyActorInput = {
        searchStringsArray: [placeId],
        maxReviews: limit,
        ...((actorConfig?.defaultInput as object) || {}),
      }

      const run = await this.client.actor(actorId).call(input, {
        timeout: APIFY_CONFIG.DEFAULT_TIMEOUT,
      })

      const { items } = await this.client.dataset(run.defaultDatasetId).listItems()

      const reviews: GoogleReview[] = items
        .flatMap((item: any) => item.reviews || [])
        .slice(0, limit)
        .map((review: any) => ({
          id: review.reviewId,
          author: review.name,
          authorPhotoUrl: review.profilePhotoUrl,
          rating: review.stars,
          text: review.text,
          timestamp: review.publishedAtDate,
          likes: review.likesCount,
          reply: review.reviewReplyText ? {
            text: review.reviewReplyText,
            timestamp: review.reviewReplyDate,
          } : undefined,
        }))

      const duration = Date.now() - startTime
      await this.logFetch('google', placeId, duration, reviews.length)

      return reviews
    } catch (error) {
      console.error('Apify Google Reviews fetch error:', error)
      throw error
    }
  }

  /**
   * Log fetch for cost tracking and analytics
   */
  private async logFetch(
    platform: Platform,
    identifier: string,
    duration: number,
    itemsCount: number
  ): Promise<void> {
    try {
      // You can log to database or analytics service here
      console.log(`[Apify] ${platform} fetch: ${identifier}, ${itemsCount} items, ${duration}ms`)

      // Optional: Track costs in database
      // await db.apifyFetchLog.create({ ... })
    } catch (error) {
      // Don't throw, just log
      console.error('Failed to log Apify fetch:', error)
    }
  }

  /**
   * Get estimated cost for a fetch
   * Based on Apify pricing and actor consumption
   */
  estimateCost(platform: Platform, itemsCount: number): number {
    // Rough estimates (adjust based on actual actor costs)
    const costPerItem = {
      instagram: 0.0001, // $0.0001 per post
      tiktok: 0.0001,
      google: 0.0001,
      twitter: 0.0001,
      youtube: 0.0001,
      facebook: 0.0001,
    }

    return (costPerItem[platform] || 0.0001) * itemsCount
  }
}

/**
 * Singleton instance
 */
export const apifyService = new ApifyService()
