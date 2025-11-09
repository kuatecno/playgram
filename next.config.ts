import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /* Config options here */
  reactStrictMode: true,
  poweredByHeader: false, // Remove X-Powered-By header (security)

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // Allow all HTTPS images (adjust in production)
      },
    ],
  },

  // Environment variables validation
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002',
  },

  // Experimental features
  experimental: {
    // Enable React Server Components optimizations
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
}

export default nextConfig
