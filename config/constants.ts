/**
 * Application Constants
 * Centralized configuration values
 */

export const APP_NAME = 'Playgram'
export const APP_VERSION = '3.0.0'
export const APP_DESCRIPTION = 'Modern Instagram Business Management Platform'

// API Configuration
export const API_VERSION = 'v1'
export const API_PREFIX = `/api/${API_VERSION}`

// Cache TTL (Time To Live) in seconds
export const TTL = {
  ONE_MINUTE: 60,
  FIVE_MINUTES: 300,
  TEN_MINUTES: 600,
  THIRTY_MINUTES: 1800,
  ONE_HOUR: 3600,
  SIX_HOURS: 21600,
  ONE_DAY: 86400,
  ONE_WEEK: 604800,
  ONE_MONTH: 2592000,
} as const

// QR Code Types
export const QR_TYPES = {
  PROMOTION: 'promotion',
  VALIDATION: 'validation',
  DISCOUNT: 'discount',
} as const

// Booking Status
export const BOOKING_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const

// Verification Status
export const VERIFICATION_STATUS = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  EXPIRED: 'expired',
} as const

// Flowkick Subscription Tiers
export const FLOWKICK_TIERS = {
  FREE: {
    name: 'free',
    requestLimit: 1000,
    price: 0,
  },
  STARTER: {
    name: 'starter',
    requestLimit: 10000,
    price: 29,
  },
  PRO: {
    name: 'pro',
    requestLimit: 100000,
    price: 99,
  },
  ENTERPRISE: {
    name: 'enterprise',
    requestLimit: -1, // Unlimited
    price: 299,
  },
} as const

// Social Media Platforms
export const PLATFORMS = {
  INSTAGRAM: 'instagram',
  TIKTOK: 'tiktok',
  GOOGLE: 'google',
  TWITTER: 'twitter',
  YOUTUBE: 'youtube',
  FACEBOOK: 'facebook',
} as const

// Webhook Events
export const WEBHOOK_EVENTS = {
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_TAGGED: 'user.tagged',
  USER_UNTAGGED: 'user.untagged',
  BOOKING_CREATED: 'booking.created',
  BOOKING_UPDATED: 'booking.updated',
  BOOKING_CANCELLED: 'booking.cancelled',
  QR_GENERATED: 'qr.generated',
  QR_SCANNED: 'qr.scanned',
  FIELD_UPDATED: 'field.updated',
  INTERACTION_LOGGED: 'interaction.logged',
} as const

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 100,
} as const

// Rate Limiting
export const RATE_LIMITS = {
  API_REQUESTS_PER_MINUTE: 60,
  VERIFICATION_PER_HOUR: 100,
  VERIFICATION_PER_DAY: 1000,
} as const

// Apify Configuration (INTERNAL ONLY - not exposed publicly)
export const APIFY_CONFIG = {
  INSTAGRAM_ACTOR: 'apify/instagram-scraper',
  TIKTOK_ACTOR: 'apify/tiktok-scraper',
  GOOGLE_MAPS_ACTOR: 'apify/google-maps-scraper',
  DEFAULT_TIMEOUT: 120000, // 2 minutes
  MAX_RETRIES: 3,
} as const

// File Upload Limits
export const UPLOAD_LIMITS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'text/csv'],
} as const
