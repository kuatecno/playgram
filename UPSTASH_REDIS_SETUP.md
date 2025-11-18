# Upstash Redis Setup Guide

## What You Have

You're using **Upstash Redis** - a serverless Redis service that's perfect for:
- Vercel/Render deployments
- Pay-per-request pricing
- Global replication
- No server management

## Configuration

### Step 1: Get Your Connection String

Go to: https://console.upstash.com → Your Database → Details

You'll see **two connection options**:

#### Option A: Redis Client (Recommended for Bull Queue)
```bash
# Use REDISS (double 's') for TLS connection
REDIS_URL="rediss://default:YOUR_PASSWORD@shining-monkey-11943.upstash.io:6379"
```

#### Option B: REST API (Alternative)
```bash
UPSTASH_REDIS_REST_URL="https://shining-monkey-11943.upstash.io"
UPSTASH_REDIS_REST_TOKEN="YOUR_REST_TOKEN"
```

### Step 2: Add to `.env`

**Local Development:**
```bash
# .env.local
REDIS_URL="redis://localhost:6379"  # Use local Redis
```

**Production (Vercel/Render):**
```bash
# .env or Environment Variables
REDIS_URL="rediss://default:YOUR_PASSWORD@shining-monkey-11943.upstash.io:6379"
```

### Step 3: Verify Connection

Test the connection:

```bash
# Using redis-cli (install if needed: brew install redis)
redis-cli --tls -u "rediss://default:YOUR_PASSWORD@shining-monkey-11943.upstash.io:6379" ping

# Should return: PONG
```

Or test in your app:

```typescript
// test-redis.ts
import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL!, {
  tls: process.env.REDIS_URL?.startsWith('rediss://')
    ? { rejectUnauthorized: false }
    : undefined,
})

async function test() {
  try {
    await redis.set('test', 'hello')
    const value = await redis.get('test')
    console.log('✅ Redis connected! Value:', value)
    await redis.del('test')
    process.exit(0)
  } catch (error) {
    console.error('❌ Redis connection failed:', error)
    process.exit(1)
  }
}

test()
```

Run it:
```bash
tsx test-redis.ts
```

## Updated Queue Configuration

The queue system has been updated to automatically detect and handle TLS connections:

```typescript
// lib/queue/index.ts - Already updated!
const useTLS = redisUrl.startsWith('rediss://')

const redisConfig = {
  redis: {
    url: redisUrl,
    ...(useTLS && {
      tls: {
        rejectUnauthorized: false, // Required for Upstash
      },
    }),
  },
}
```

## Security Best Practices

### 🔒 Rotate Your Password

Since you shared your Redis URL publicly, rotate the password immediately:

1. Go to Upstash Console → Your Database
2. Settings → **Reset Password**
3. Copy new connection string
4. Update in your environment variables

### 🔐 Environment Variables

**Never commit** your Redis URL to git. Always use:

```bash
# .env.local (gitignored)
REDIS_URL="rediss://default:NEW_PASSWORD@shining-monkey-11943.upstash.io:6379"
```

**On Vercel:**
1. Project Settings → Environment Variables
2. Add `REDIS_URL` with your connection string
3. Available for all deployments

**On Render:**
1. Your Web Service → Environment
2. Add `REDIS_URL`
3. Also add to Worker Service (if you create one)

## Testing the Queue System

### 1. Start the Worker

```bash
npm run worker
```

You should see:
```
[INFO] Starting queue workers...
[INFO] Queue workers started successfully
```

### 2. Add a Test Job

```bash
# In another terminal
node --eval "
const { addWebhookJob } = require('./lib/queue');
addWebhookJob({
  webhookId: 'test_123',
  event: 'test.connection',
  url: 'https://webhook.site/your-unique-url',
  payload: { message: 'Hello from Upstash!' }
}).then(() => console.log('✅ Job added!'))
"
```

### 3. Check Upstash Dashboard

Go to your Upstash Console → Database → Data Browser

You should see keys like:
- `bull:webhooks:*`
- `bull:webhooks:wait`
- `bull:webhooks:active`

## Upstash Free Tier Limits

- **10,000 commands/day** (resets daily)
- **256 MB storage**
- **100 concurrent connections**

This is plenty for development and small production apps!

## Upstash Pro Features (Optional)

- **$0.2 per 100K commands** (pay as you go)
- Global replication
- Auto-scaling
- Advanced analytics

## Deployment Checklist

- [ ] Redis password rotated (after sharing publicly)
- [ ] `REDIS_URL` set in Vercel/Render environment variables
- [ ] Test connection successful (`redis-cli ping` returns PONG)
- [ ] Worker service deployed and running
- [ ] Test job processed successfully
- [ ] Checked Upstash dashboard for queue keys

## Common Issues

### Issue: "Connection refused"
**Solution:** Check your REDIS_URL has `rediss://` (double 's') for TLS

### Issue: "TLS handshake failed"
**Solution:** Ensure `rejectUnauthorized: false` is set (already configured)

### Issue: "Authentication failed"
**Solution:** Password might be wrong - get fresh connection string from Upstash

### Issue: Jobs not processing
**Solution:**
1. Check worker is running: `npm run worker`
2. Check Upstash dashboard for job keys
3. Check worker logs for errors

## Monitoring

**Upstash Console** shows:
- Commands per second
- Storage usage
- Connection count
- Latency

**Your App Logs** show:
- Job completed/failed
- Queue health
- Processing time

## Next Steps

1. **Rotate your Redis password** (IMPORTANT!)
2. Test connection: `redis-cli --tls -u "YOUR_NEW_URL" ping`
3. Start worker: `npm run worker`
4. Add test job and verify it processes
5. Deploy to production with environment variables

---

**Quick Commands:**

```bash
# Test connection
redis-cli --tls -u "$REDIS_URL" ping

# Check queue stats
redis-cli --tls -u "$REDIS_URL" INFO stats

# List all keys
redis-cli --tls -u "$REDIS_URL" KEYS "*"

# Monitor in real-time
redis-cli --tls -u "$REDIS_URL" MONITOR
```

**Resources:**
- Upstash Console: https://console.upstash.com
- Upstash Docs: https://docs.upstash.com/redis
- Bull Queue Docs: https://github.com/OptimalBits/bull
