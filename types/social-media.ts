/**
 * Social Media Data Types
 * Standardized format for Instagram, TikTok, Google Reviews, etc.
 */

export type Platform = 'instagram' | 'tiktok' | 'google' | 'twitter' | 'youtube' | 'facebook'

export type DataType = 'posts' | 'videos' | 'reviews' | 'profile' | 'hashtag'

/**
 * Instagram Post
 */
export interface InstagramPost {
  id: string
  type: 'image' | 'video' | 'carousel'
  caption?: string
  mediaUrl: string
  thumbnailUrl?: string
  permalink: string
  timestamp: string
  likes?: number
  comments?: number
  engagement?: number
  hashtags?: string[]
  mentions?: string[]
  location?: string
}

/**
 * TikTok Video
 */
export interface TikTokVideo {
  id: string
  description?: string
  videoUrl: string
  thumbnailUrl: string
  permalink: string
  timestamp: string
  likes?: number
  comments?: number
  shares?: number
  views?: number
  engagement?: number
  hashtags?: string[]
  music?: {
    title: string
    author: string
  }
}

/**
 * Google Review
 */
export interface GoogleReview {
  id: string
  author: string
  authorPhotoUrl?: string
  rating: number
  text?: string
  timestamp: string
  likes?: number
  reply?: {
    text: string
    timestamp: string
  }
}

/**
 * Profile Data
 */
export interface ProfileData {
  username: string
  displayName?: string
  bio?: string
  profilePicUrl?: string
  followersCount?: number
  followingCount?: number
  postsCount?: number
  isVerified?: boolean
  website?: string
}

/**
 * Standardized Response
 */
export interface SocialMediaResponse<T = unknown> {
  platform: Platform
  dataType: DataType
  identifier: string // username, handle, place_id
  data: T[]
  metadata: {
    total: number
    fetched: number
    cached: boolean
    cacheAge?: number // seconds
    fetchDuration?: number // milliseconds
    timestamp: string
  }
}

/**
 * Apify Actor Input
 */
export interface ApifyActorInput {
  [key: string]: unknown
  // Common fields
  directUrls?: string[]
  resultsLimit?: number
}

/**
 * Cache Entry
 */
export interface CacheEntry {
  platform: Platform
  identifier: string
  dataType: DataType
  data: unknown
  lastFetched: Date
  expiresAt: Date
  fetchDuration?: number
}
