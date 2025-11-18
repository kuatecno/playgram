# Queue System Documentation

Background job processing system using Bull and Redis for handling asynchronous tasks.

## Overview

The queue system handles tasks that should run in the background:
- Webhook delivery with automatic retries
- ManyChat contact/tag/field syncing
- Email sending
- Analytics processing
- Data exports

## Setup

### 1. Redis Configuration

Make sure Redis is running and configured in `.env`:

```bash
REDIS_URL="redis://localhost:6379"
```

### 2. Start the Worker

Run the worker process to start processing jobs:

```bash
npm run worker
```

**In production**, run the worker as a separate process:
- Use PM2, systemd, or Docker
- Keep the worker running alongside your Next.js app

## Usage

### Adding Jobs to Queues

```typescript
import { addWebhookJob, addManyChatSyncJob, addEmailJob } from '@/lib/queue'

// In your API route or service
export async function POST(request: Request) {
  // Your business logic here...

  // Add job to queue (non-blocking)
  await addWebhookJob({
    webhookId: 'webhook_123',
    event: 'qr.scanned',
    url: 'https://api.manychat.com/webhook',
    payload: { qrCode: 'ABC123', userId: 'user_456' }
  })

  // Return immediately - job processes in background
  return Response.json({ success: true })
}
```

### Available Queues

#### 1. Webhooks
```typescript
await addWebhookJob({
  webhookId: 'unique_id',
  event: 'qr.scanned',
  url: 'https://api.example.com/webhook',
  payload: { /* your data */ },
  headers: { 'X-API-Key': 'key' } // optional
})
```

#### 2. ManyChat Sync
```typescript
await addManyChatSyncJob({
  type: 'contact' | 'tag' | 'field',
  action: 'create' | 'update' | 'delete',
  toolId: 'tool_123',
  data: { /* sync data */ }
})
```

#### 3. Email
```typescript
await addEmailJob({
  to: 'user@example.com',
  subject: 'Your Subject',
  template: 'template-name',
  data: { /* template data */ }
})
```

#### 4. QR Analytics
```typescript
await addQRAnalyticsJob({
  qrCodeId: 'qr_123',
  event: 'scan' | 'validation',
  data: { /* analytics data */ }
})
```

#### 5. Data Export
```typescript
await addDataExportJob({
  userId: 'user_123',
  exportType: 'csv' | 'json' | 'pdf' | 'excel',
  dataType: 'contacts' | 'qr_scans' | 'bookings',
  filters: { /* optional filters */ }
})
```

### Advanced Options

```typescript
// High priority job (processes first)
await addWebhookJob(data, {
  priority: 1, // Lower = higher priority
  attempts: 5, // Retry up to 5 times
  backoff: {
    type: 'exponential',
    delay: 5000 // Start with 5s delay
  }
})

// Delayed job (run in 1 hour)
await addEmailJob(data, {
  delay: 60 * 60 * 1000 // milliseconds
})
```

## Job Processing

Jobs are automatically retried with exponential backoff:
- **Attempt 1**: Immediate
- **Attempt 2**: After 2 seconds
- **Attempt 3**: After 4 seconds
- **Attempt 4**: After 8 seconds (if attempts increased)

Failed jobs are kept for debugging (last 500 failures per queue).

## Monitoring

### Queue Health Check

```typescript
import { getQueueHealth } from '@/lib/queue'

const health = await getQueueHealth()
// Returns: [
//   {
//     name: 'webhooks',
//     waiting: 5,
//     active: 2,
//     completed: 1234,
//     failed: 3,
//     delayed: 0,
//     healthy: true
//   },
//   ...
// ]
```

### Logs

The worker logs all job processing:
- Job started
- Job completed (with processing time)
- Job failed (with error details)
- Queue errors

## Production Deployment

### Option 1: Vercel + Background Function
```typescript
// Use Vercel Background Functions (beta)
// Or trigger worker via cron endpoint
```

### Option 2: Separate Worker Process
```bash
# Using PM2
pm2 start npm --name "playgram-worker" -- run worker

# Using Docker
docker-compose up worker
```

### Option 3: Serverless Workers
Use services like:
- Render Background Workers
- Railway
- Fly.io

## Common Patterns

### Pattern 1: Fire and Forget
```typescript
// Add job and return immediately
await addWebhookJob(data)
return Response.json({ success: true })
```

### Pattern 2: Wait for Completion
```typescript
// Add job and wait for it to complete
const job = await addWebhookJob(data)
const result = await job.finished()
return Response.json({ result })
```

### Pattern 3: Bulk Jobs
```typescript
// Add multiple jobs at once
const jobs = await Promise.all([
  addWebhookJob(data1),
  addWebhookJob(data2),
  addManyChatSyncJob(data3)
])
```

## Troubleshooting

### Jobs not processing?
1. Check Redis is running: `redis-cli ping` (should return PONG)
2. Check worker is running: `npm run worker`
3. Check logs for errors

### Jobs failing?
1. Check failed job details in logs
2. Verify external API endpoints are accessible
3. Check retry attempts haven't been exhausted

### Queue backing up?
1. Add more workers (horizontal scaling)
2. Increase job concurrency
3. Optimize job processors

## Next Steps

- [ ] Implement actual webhook delivery in processors
- [ ] Implement ManyChat sync logic
- [ ] Add email service integration (SendGrid/Resend)
- [ ] Add analytics processing
- [ ] Add data export service
- [ ] Set up queue monitoring dashboard (Bull Board)
- [ ] Add dead letter queue for permanently failed jobs
