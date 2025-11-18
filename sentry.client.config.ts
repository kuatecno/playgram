/**
 * Sentry Client-Side Configuration
 * This file configures Sentry for the browser
 */

import * as Sentry from '@sentry/nextjs'

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN

// Only initialize if DSN is configured
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV,

    // Adjust this value in production, or use tracesSampler for greater control
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Setting this option to true will print useful information to the console while you're setting up Sentry
    debug: false,

    // Disable session replay (requires additional setup)
    // replaysOnErrorSampleRate: 1.0,
    // replaysSessionSampleRate: 0.1,
  })
}
