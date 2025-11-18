# Infrastructure Setup Complete ✅

This document describes the critical infrastructure components that have been set up for Playgram v3.0.

## Overview

Three critical infrastructure pieces have been configured:
1. **Bull/BullMQ Queue System** - Background job processing
2. **Vitest Testing Framework** - Unit and integration testing
3. **Sentry Error Tracking** - Production error monitoring

---

## 1. Bull/BullMQ Queue System

### Location
- `/lib/queue/index.ts` - Queue definitions and helper functions
- `/lib/queue/processors.ts` - Job processors
- `/lib/queue/worker.ts` - Worker process
- `/lib/queue/examples.ts` - Usage examples
- `/lib/queue/README.md` - Full documentation

### Queues Available

1. **Webhooks** - Deliver webhooks with automatic retries
2. **ManyChat Sync** - Sync contacts, tags, and fields to ManyChat
3. **Email** - Send transactional emails
4. **QR Analytics** - Process QR code analytics
5. **Data Export** - Generate CSV/JSON/PDF/Excel exports

### How to Use

```typescript
import { addWebhookJob, addManyChatSyncJob } from '@/lib/queue'

// Add a webhook job
await addWebhookJob({
  webhookId: 'webhook_123',
  event: 'qr.scanned',
  url: 'https://api.manychat.com/webhook',
  payload: { qrCode: 'ABC123', userId: 'user_456' }
})

// Add a ManyChat sync job
await addManyChatSyncJob({
  type: 'contact',
  action: 'update',
  toolId: 'tool_123',
  data: { contactId: 'contact_123', fields: { ... } }
})
```

### Running the Worker

**Development:**
```bash
npm run worker
```

**Production:**
Run as a separate process using PM2, systemd, or Docker:
```bash
pm2 start npm --name "playgram-worker" -- run worker
```

### Configuration

Add to your `.env`:
```bash
REDIS_URL="redis://localhost:6379"
```

### Features

- ✅ Automatic retries with exponential backoff
- ✅ Job priority support
- ✅ Delayed jobs
- ✅ Queue health monitoring
- ✅ Failed job tracking
- ✅ Event listeners for monitoring

---

## 2. Vitest Testing Framework

### Location
- `/vitest.config.ts` - Vitest configuration
- `/tests/setup.ts` - Test setup and mocks
- `/tests/unit/` - Unit tests
- `/tests/integration/` - Integration tests
- `/tests/e2e/` - End-to-end tests

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm test -- --coverage
```

### Current Test Coverage

**19 tests passing:**
- ✅ Logger tests (6 tests)
- ✅ Queue system tests (7 tests)
- ✅ QR Code service tests (6 tests)

### Writing Tests

Example test structure:

```typescript
import { describe, it, expect, vi } from 'vitest'

describe('MyService', () => {
  it('should do something', () => {
    expect(true).toBe(true)
  })
})
```

### Mocking

The setup file (`tests/setup.ts`) automatically mocks:
- Next.js navigation (`useRouter`, `usePathname`, etc.)
- NextAuth (`useSession`, `signIn`, `signOut`)

### Configuration

Test environment: `jsdom` (for React component testing)

Aliases configured:
- `@/lib` → `./lib`
- `@/features` → `./features`
- `@/components` → `./components`
- `@/app` → `./app`

---

## 3. Sentry Error Tracking

### Location
- `/lib/monitoring/sentry.ts` - Sentry configuration and helpers
- `/sentry.client.config.ts` - Client-side config
- `/sentry.server.config.ts` - Server-side config
- `/sentry.edge.config.ts` - Edge runtime config
- `/next.config.ts` - Next.js integration

### Configuration

Add to your `.env`:
```bash
NEXT_PUBLIC_SENTRY_DSN="https://your-sentry-dsn@sentry.io/your-project-id"
SENTRY_ORG="your-sentry-org-slug"
SENTRY_PROJECT="your-sentry-project-slug"
SENTRY_AUTH_TOKEN="your-sentry-auth-token"
```

Get these values from: https://sentry.io/settings/

### Usage

```typescript
import { captureError, setUser, addBreadcrumb } from '@/lib/monitoring/sentry'

// Capture an error
try {
  await riskyOperation()
} catch (error) {
  captureError(error, { context: 'additional info' })
}

// Set user context
setUser({ id: 'user_123', email: 'user@example.com' })

// Add breadcrumb for debugging
addBreadcrumb('User clicked button', { buttonId: 'submit' })
```

### Features

- ✅ Automatic error capture
- ✅ Performance monitoring (10% sample rate in production)
- ✅ Session replay (captures 10% of sessions, 100% with errors)
- ✅ User context tracking
- ✅ Breadcrumbs for debugging
- ✅ Source maps for stack traces

### Environments

- **Development**: Errors logged to console, not sent to Sentry
- **Production**: All errors sent to Sentry with 10% performance sampling

---

## 4. Logger System

### Location
- `/lib/logger/index.ts` - Structured logging system

### Usage

```typescript
import { logger } from '@/lib/logger'

logger.info('User logged in', { userId: '123' })
logger.warn('Rate limit approaching', { limit: 100, current: 95 })
logger.error('Payment failed', { error: error.message, orderId: 'order_123' })
logger.debug('Debugging info', { state: debugState })
```

### Features

- ✅ Structured logging with JSON output
- ✅ Timestamp on all logs
- ✅ Log levels: info, warn, error, debug
- ✅ Development mode: all logs to console
- ✅ Production ready: can be extended to send to logging services

---

## Next Steps

### Immediate Actions Required

1. **Set up Redis**
   - Install Redis locally: `brew install redis` (macOS) or use Docker
   - Start Redis: `redis-server`
   - Or use cloud Redis (e.g., Upstash, Redis Cloud)

2. **Create Sentry Account**
   - Sign up at https://sentry.io
   - Create a new project
   - Copy DSN and add to `.env`

3. **Start Worker Process**
   - In development: `npm run worker` (separate terminal)
   - In production: Use PM2 or Docker

### Recommended Next Steps

1. **Implement Queue Processors**
   - Complete webhook delivery logic in `lib/queue/processors.ts`
   - Implement ManyChat sync logic
   - Add email sending integration (SendGrid/Resend)

2. **Expand Test Coverage**
   - Target: 80%+ coverage (currently ~10%)
   - Add tests for all services
   - Add integration tests for API routes
   - Set up E2E tests with Playwright

3. **Set Up CI/CD**
   - Add GitHub Actions workflow
   - Run tests on every PR
   - Enforce test coverage thresholds
   - Automated deployments

4. **Production Monitoring**
   - Set up Sentry alerts
   - Monitor queue health
   - Track error rates
   - Set up uptime monitoring

---

## Testing Checklist

Before deploying to production:

- [ ] All tests passing (`npm test`)
- [ ] Redis connection working
- [ ] Worker process running
- [ ] Sentry configured and capturing errors
- [ ] Queue jobs processing successfully
- [ ] Test coverage >80%
- [ ] E2E tests passing
- [ ] CI/CD pipeline green

---

## Troubleshooting

### Tests Failing?
1. Run `npm install` to ensure all dependencies are installed
2. Check that jsdom is installed: `npm list jsdom`
3. Clear test cache: `npm test -- --clearCache`

### Queue Not Processing?
1. Check Redis is running: `redis-cli ping` (should return PONG)
2. Verify REDIS_URL in `.env`
3. Check worker is running: `npm run worker`
4. Check logs for errors

### Sentry Not Capturing Errors?
1. Verify SENTRY_DSN is set in `.env`
2. Check Sentry project settings
3. Verify environment is not 'development' (Sentry disabled in dev)
4. Check browser console for Sentry initialization errors

---

## Resources

- **Bull Documentation**: https://github.com/OptimalBits/bull
- **Vitest Documentation**: https://vitest.dev
- **Sentry Next.js Docs**: https://docs.sentry.io/platforms/javascript/guides/nextjs/
- **Queue System README**: `/lib/queue/README.md`

---

**Status**: ✅ Infrastructure Setup Complete
**Date**: 2025-11-17
**Test Coverage**: 19/19 tests passing
