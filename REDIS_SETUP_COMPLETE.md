# Redis Infrastructure Setup - Action Required

## Current Status

✅ **Code is ready** - All infrastructure code committed and pushed
✅ **Local build works** - `npm run build` succeeds locally
✅ **Tests passing** - 19/19 tests pass
✅ **Upstash Redis configured** - TLS support added
❌ **Vercel deployment failing** - Need to investigate

## What Was Implemented

### 1. Queue System (`lib/queue/`)
- 5 queues: webhooks, ManyChat sync, email, analytics, exports
- Automatic retries with exponential backoff
- Upstash Redis TLS support
- Worker process (`npm run worker`)

### 2. Test Endpoints
- `/api/test/redis` - Tests Redis connection
- `/api/test/queue` - Tests queue system health

### 3. Infrastructure
- Sentry error tracking (basic setup)
- Logger system
- Testing framework (Vitest)

## Next Steps - Action Required!

### Step 1: Check Vercel Build Error

Go to:  https://vercel.com/kua/playgram

1. Click on the latest deployment (status: "Error")
2. Click "Building" tab to see build logs
3. Look for the error message

**Common issues:**
- Missing environment variables
- Build timeout
- Memory limit exceeded

### Step 2: Verify REDIS_URL is Set on Vercel

1. Go to Project Settings → Environment Variables
2. Check that `REDIS_URL` exists for **Production**
3. Should look like: `rediss://default:YOUR_PASSWORD@shining-monkey-11943.upstash.io:6379`
4. Note the **double 's'** in `rediss://` (TLS enabled)

**IMPORTANT:** Make sure you rotated your Redis password after sharing it publicly!

### Step 3: Verify Environment Variables Are Complete

Make sure these are ALL set in Vercel (Production):

Required for app to work:
- [ ] `REDIS_URL`
- [ ] `POSTGRES_PRISMA_URL`
- [ ] `POSTGRES_URL_NON_POOLING`
- [ ] `NEXTAUTH_SECRET`
- [ ] `NEXTAUTH_URL` (should be `https://playgram.kua.cl`)

Optional but recommended:
- [ ] `NEXT_PUBLIC_SENTRY_DSN` (for error tracking)
- [ ] `SENTRY_ORG`
- [ ] `SENTRY_PROJECT`
- [ ] `SENTRY_AUTH_TOKEN`

### Step 4: Test After Successful Deployment

Once Vercel shows "✓ Ready", test these URLs:

```bash
# Test Redis connection
curl https://playgram.kua.cl/api/test/redis

# Test Queue system
curl https://playgram.kua.cl/api/test/queue

# Add a test job
curl -X POST https://playgram.kua.cl/api/test/queue
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Redis connection successful!",
  ...
}
```

## Troubleshooting

### If build fails with Sentry errors:
Set these environment variables in Vercel:
```
SENTRY_SUPPRESS_INSTRUMENTATION_FILE_WARNING=1
SENTRY_SUPPRESS_GLOBAL_ERROR_HANDLER_FILE_WARNING=1
```

### If Redis connection fails:
1. Check REDIS_URL format (must be `rediss://` with double 's')
2. Verify password is correct (get fresh connection string from Upstash)
3. Check Upstash dashboard - database should be "Active"

### If endpoints return 404:
- Middleware might be blocking them
- Verify `middleware.ts` has `/api/test` in `publicApiRoutes`

### If redirecting to login:
- Same issue - middleware blocking
- Already fixed in latest commit

## Testing Locally (Works Now)

If you want to test locally before Vercel fixes:

```bash
# 1. Set up local Redis
brew install redis
redis-server

# 2. Add to .env.local
REDIS_URL="redis://localhost:6379"

# 3. Start app
npm run dev

# 4. Start worker (separate terminal)
npm run worker

# 5. Test endpoints
curl http://localhost:3002/api/test/redis
curl http://localhost:3002/api/test/queue
```

## What to Report Back

After checking Vercel:

1. **What does the build error say?** (screenshot or copy text)
2. **Is REDIS_URL set correctly?** (yes/no)
3. **What does `curl https://playgram.kua.cl/api/test/redis` return?** (once deployed)

---

## Quick Reference

**Upstash Console:** https://console.upstash.com
**Vercel Dashboard:** https://vercel.com/kua/playgram
**GitHub Repo:** https://github.com/kuatecno/playgram

**Files to Check:**
- `lib/queue/index.ts` - Queue configuration
- `lib/queue/README.md` - Queue documentation
- `middleware.ts` - Route protection
- `app/api/test/redis/route.ts` - Test endpoint

**Commands:**
```bash
# Check local build
npm run build

# Run tests
npm test

# Start worker
npm run worker

# Check Vercel logs
vercel logs [deployment-url]
```

---

**Your infrastructure is ready!** Just need to get Vercel deployment working. 🚀
