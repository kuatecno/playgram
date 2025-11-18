/**
 * Sentry Error Tracking Configuration
 * Captures and reports errors in production
 */

import * as Sentry from '@sentry/nextjs'

export const initSentry = () => {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
  const environment = process.env.NODE_ENV || 'development'

  // Only initialize Sentry if DSN is configured
  if (!dsn) {
    console.warn('Sentry DSN not configured - error tracking disabled')
    return
  }

  Sentry.init({
    dsn,
    environment,

    // Performance Monitoring
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0, // 10% in prod, 100% in dev

    // Session Replay
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

    // Error Filtering
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      'chrome-extension://',
      'moz-extension://',
      // Network errors that are expected
      'NetworkError',
      'Failed to fetch',
      'Load failed',
      // User cancellations
      'AbortError',
      'cancelled',
    ],

    // Enhanced error context
    beforeSend(event, hint) {
      // Don't send events in development
      if (environment === 'development') {
        console.error('Sentry Error:', hint.originalException || hint.syntheticException)
        return null
      }

      // Add custom context
      if (event.exception) {
        console.error('Error captured by Sentry:', event.exception)
      }

      return event
    },

    // Integrations configured in sentry.client.config.ts
    // integrations are set per-environment
  })
}

/**
 * Capture exception manually
 */
export const captureError = (error: Error | string, context?: Record<string, any>) => {
  if (typeof error === 'string') {
    Sentry.captureMessage(error, {
      level: 'error',
      extra: context,
    })
  } else {
    Sentry.captureException(error, {
      extra: context,
    })
  }
}

/**
 * Set user context for error tracking
 */
export const setUser = (user: { id: string; email?: string; username?: string } | null) => {
  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username,
    })
  } else {
    Sentry.setUser(null)
  }
}

/**
 * Add breadcrumb for debugging
 */
export const addBreadcrumb = (message: string, data?: Record<string, any>) => {
  Sentry.addBreadcrumb({
    message,
    data,
    timestamp: Date.now() / 1000,
  })
}

/**
 * Measure performance
 * Note: startTransaction is deprecated in newer Sentry versions
 * Use Sentry.startSpan() instead if needed
 */
// export const startTransaction = (name: string, op: string) => {
//   return Sentry.startSpan({ name, op }, () => {})
// }

export default Sentry
