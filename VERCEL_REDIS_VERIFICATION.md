# Vercel Redis Verification Guide

## Deployment Status

✅ Code pushed to GitHub
🚀 Vercel deployment in progress...

## Test Endpoints Created

I've created two test endpoints to verify your Redis and Queue setup:

### 1. Redis Connection Test
**Endpoint:** `https://playgram.kua.cl/api/test/redis`

**What it tests:**
- ✅ REDIS_URL environment variable is set
- ✅ Connection to Upstash Redis works
- ✅ TLS connection is configured correctly
- ✅ Basic read/write operations work

**Expected Response:**
```json
{
  "success": true,
  "message": "Redis connection successful!",
  "details": {
    "url": "rediss://default:****@shining-monkey-11943.upstash.io:6379",
    "protocol": "TLS (Secure)",
    "redisVersion": "7.x.x",
    "testPassed": true,
    "timestamp": "2025-11-18T..."
  }
}
```

### 2. Queue System Test
**Endpoint:** `https://playgram.kua.cl/api/test/queue`

**What it tests:**
- ✅ Queue system can connect to Redis
- ✅ All 5 queues are accessible
- ✅ Queue health monitoring works

**Expected Response:**
```json
{
  "success": true,
  "message": "Queue system is operational",
  "healthy": true,
  "queues": [
    {
      "name": "webhooks",
      "waiting": 0,
      "active": 0,
      "completed": 0,
      "failed": 0,
      "delayed": 0,
      "healthy": true
    },
    // ... 4 more queues
  ],
  "totals": {
    "waiting": 0,
    "active": 0,
    "completed": 0,
    "failed": 0,
    "delayed": 0
  }
}
```

## How to Test

### Option 1: Using Your Browser

1. Wait for Vercel deployment to complete (usually 1-2 minutes)
2. Visit: **https://playgram.kua.cl/api/test/redis**
3. Visit: **https://playgram.kua.cl/api/test/queue**

### Option 2: Using curl

```bash
# Test Redis connection
curl https://playgram.kua.cl/api/test/redis

# Test Queue system
curl https://playgram.kua.cl/api/test/queue
```

### Option 3: Add a Test Job

```bash
# Add a test job to the queue
curl -X POST https://playgram.kua.cl/api/test/queue
```

This will add a test webhook job. Since you don't have a worker running on Vercel yet, the job will stay in the queue (which is expected).

## What to Look For

### ✅ Success Indicators

1. **Redis Test Returns:**
   - `"success": true`
   - `"protocol": "TLS (Secure)"`
   - `"testPassed": true`

2. **Queue Test Returns:**
   - `"success": true`
   - `"healthy": true`
   - All 5 queues listed

### ❌ Common Errors & Solutions

#### Error: "REDIS_URL environment variable not set"
**Solution:**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add `REDIS_URL` with your Upstash connection string
3. Redeploy (or wait for automatic redeploy)

#### Error: "Connection refused" or "ECONNREFUSED"
**Solution:**
- Check REDIS_URL starts with `rediss://` (double 's')
- Verify the password is correct
- Check Upstash dashboard to ensure database is active

#### Error: "Authentication failed"
**Solution:**
- Password might be wrong
- Get fresh connection string from Upstash Console
- Update environment variable in Vercel

#### Error: "TLS handshake failed"
**Solution:**
- Should be fixed with the TLS configuration I added
- If still failing, check Upstash dashboard for SSL/TLS requirements

## Vercel Environment Variables Checklist

Make sure these are set in Vercel:

- [ ] `REDIS_URL` - Your Upstash Redis connection string
- [ ] `POSTGRES_PRISMA_URL` - Database connection
- [ ] `POSTGRES_URL_NON_POOLING` - Database direct connection
- [ ] `NEXTAUTH_SECRET` - Auth secret
- [ ] `NEXTAUTH_URL` - https://playgram.kua.cl
- [ ] `NEXT_PUBLIC_SENTRY_DSN` - Sentry DSN (optional)
- [ ] `OPENAI_API_KEY` - OpenAI key (if using AI features)

## After Successful Test

Once both endpoints return success:

1. **Queue Jobs Will Work** - Your API routes can now add jobs to the queue
2. **Jobs Won't Process Yet** - You need a worker to process them (see below)
3. **Production Ready** - Redis infrastructure is ready!

## Setting Up a Worker on Vercel

**Important:** Vercel doesn't natively support long-running workers. You have 3 options:

### Option 1: Use Vercel Cron Jobs (Recommended for Light Use)

Create periodic jobs that process the queue:

```typescript
// app/api/cron/process-queue/route.ts
export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Process jobs from queue
  // ... implementation
}
```

Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/process-queue",
    "schedule": "* * * * *"  // Every minute
  }]
}
```

### Option 2: Deploy Worker to Render/Railway (Recommended for Production)

Keep your Next.js app on Vercel, but run the worker elsewhere:

1. Create a new service on Render
2. Deploy as "Background Worker"
3. Start command: `npm run worker`
4. Use same REDIS_URL environment variable

### Option 3: Use Serverless Queue Processors

Process jobs in API routes (works but less efficient):

```typescript
// In your API routes
import { processWebhookJob } from '@/lib/queue/processors'

// After adding job, optionally trigger processing
await addWebhookJob(data)
// Trigger serverless function to process it
```

## Monitoring

### Upstash Console
- Commands per second
- Memory usage
- Connection count
- Key browser (see queue jobs)

### Vercel Logs
- Real-time logs
- Function invocations
- Error tracking

## Next Steps After Verification

1. [ ] Test Redis endpoint - verify success
2. [ ] Test Queue endpoint - verify success
3. [ ] Decide on worker strategy (Cron/Render/Serverless)
4. [ ] Set up Sentry for error tracking
5. [ ] Monitor Upstash usage (free tier: 10K commands/day)
6. [ ] Implement actual queue job processing

## Quick Verification Script

Run this after deployment completes:

```bash
#!/bin/bash

echo "🧪 Testing Playgram Infrastructure..."
echo ""

echo "1️⃣ Testing Redis connection..."
REDIS_RESULT=$(curl -s https://playgram.kua.cl/api/test/redis)
echo $REDIS_RESULT | grep -q '"success":true' && echo "✅ Redis: PASS" || echo "❌ Redis: FAIL"
echo ""

echo "2️⃣ Testing Queue system..."
QUEUE_RESULT=$(curl -s https://playgram.kua.cl/api/test/queue)
echo $QUEUE_RESULT | grep -q '"success":true' && echo "✅ Queue: PASS" || echo "❌ Queue: FAIL"
echo ""

echo "3️⃣ Adding test job..."
curl -s -X POST https://playgram.kua.cl/api/test/queue | grep -q '"success":true' && echo "✅ Add Job: PASS" || echo "❌ Add Job: FAIL"
echo ""

echo "Done! Check detailed results above."
```

Save as `test-infrastructure.sh`, make executable (`chmod +x test-infrastructure.sh`), and run: `./test-infrastructure.sh`

## Troubleshooting Commands

```bash
# Check Vercel deployment status
vercel ls

# View logs in real-time
vercel logs --follow

# Check environment variables
vercel env ls

# Pull environment variables locally
vercel env pull .env.local
```

---

**Once you verify both endpoints return success, your Redis + Queue infrastructure is ready! 🎉**
