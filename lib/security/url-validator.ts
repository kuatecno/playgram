/**
 * URL Security Validator
 * Prevents open redirect vulnerabilities by validating URLs against a whitelist
 */

// Allowed domains for QR fallback URLs
// Add your production domains here
const ALLOWED_DOMAINS = [
  'localhost',
  '127.0.0.1',
  'playgram.kua.cl',
  'playgram.vercel.app',
  // Add more trusted domains as needed
]

// Allow subdomains by default
const ALLOW_SUBDOMAINS = true

/**
 * Validates if a URL is safe to use as a redirect target
 * @param url - The URL to validate
 * @returns true if URL is safe, false otherwise
 */
export function isValidRedirectUrl(url: string | null | undefined): boolean {
  if (!url) return false

  try {
    const parsedUrl = new URL(url)

    // Only allow http and https protocols
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return false
    }

    // Extract hostname
    const hostname = parsedUrl.hostname.toLowerCase()

    // Check if hostname is in allowed list
    if (ALLOWED_DOMAINS.includes(hostname)) {
      return true
    }

    // Check if subdomain of allowed domain
    if (ALLOW_SUBDOMAINS) {
      return ALLOWED_DOMAINS.some(domain => {
        return hostname.endsWith(`.${domain}`)
      })
    }

    return false
  } catch (error) {
    // Invalid URL format
    return false
  }
}

/**
 * Validates and sanitizes a fallback URL
 * @param url - The URL to validate
 * @returns The validated URL or null if invalid
 */
export function validateFallbackUrl(url: string | null | undefined): string | null {
  if (!url) return null

  // Trim whitespace
  const trimmedUrl = url.trim()

  // Validate
  if (!isValidRedirectUrl(trimmedUrl)) {
    console.warn(`Invalid fallback URL rejected: ${trimmedUrl}`)
    return null
  }

  return trimmedUrl
}

/**
 * Get list of allowed domains (for display/documentation)
 */
export function getAllowedDomains(): readonly string[] {
  return ALLOWED_DOMAINS
}
