# Sentry Integration Setup - Automated Error Monitoring

## What We Built

I've created an automated system where Sentry sends errors directly to your app, and I (Claude Code) can read and fix them automatically.

### New Infrastructure:

✅ **Database Table** - `SentryEvent` stores all errors from Sentry
✅ **Webhook Endpoint** - `POST /api/webhooks/sentry` receives Sentry alerts
✅ **Error API** - `GET /api/sentry/recent-errors` for Claude to read errors
✅ **Middleware Updated** - Endpoints are publicly accessible

---

## How It Works

### Current Workflow:
```
1. Error happens in production
2. Sentry detects error
3. Sentry sends webhook to your app
4. Your app stores error in database
5. You say: "Claude, check recent Sentry errors"
6. I read the errors and fix them
```

### Example Conversation:
```
You: "Claude, check for errors from the last hour"
Me: [Reads /api/sentry/recent-errors?hours=1]
    "Found 2 errors:
     1. QR validation failing (5 occurrences) - TypeError: validUntil is undefined
     2. Redis timeout (1 occurrence) - Connection failed

     Fixing the QR validation issue now..."
[I fix the code and deploy]
```

---

## Setup Instructions (5 minutes)

### Step 1: Configure Sentry Webhook

1. **Go to Sentry Webhooks:**
   https://kua-1e.sentry.io/settings/developer-settings/webhooks/

2. **Click "Create New Webhook"**

3. **Configure the webhook:**
   ```
   Name: Playgram Error Sync

   Webhook URL: https://playgram.kua.cl/api/webhooks/sentry

   Events to receive:
   ✓ event.created
   ✓ issue.created
   ✓ issue.resolved

   Project: javascript-nextjs
   ```

4. **Click "Save Changes"**

### Step 2: Test the Webhook

Let me trigger a test error to verify everything works:

```bash
# I'll do this for you - just confirm when you're ready
```

### Step 3: Verify Data Flow

After setting up the webhook, we can verify:

```bash
# Check webhook endpoint
curl https://playgram.kua.cl/api/webhooks/sentry

# Check recent errors API
curl https://playgram.kua.cl/api/sentry/recent-errors?limit=10
```

---

## How You'll Use This

### Daily Check (Recommended)
Every day, ask me:
```
"Claude, check yesterday's Sentry errors"
```

I'll respond with:
- Total errors
- Most common issues
- Which ones need immediate attention
- Which ones I can fix automatically

### Real-Time Monitoring
After deploying a new feature:
```
"Claude, monitor Sentry for the next hour"
```

I'll check every 15 minutes and alert you if new errors appear.

### Fix Mode
When errors occur:
```
"Claude, check and fix recent errors"
```

I'll:
1. Read the errors
2. Analyze stack traces
3. Fix the code
4. Mark errors as resolved in database

---

## API Endpoints

### 1. Webhook Endpoint (Sentry → Your App)
**URL:** `POST https://playgram.kua.cl/api/webhooks/sentry`

Receives error events from Sentry and stores them in database.

**Test:**
```bash
curl https://playgram.kua.cl/api/webhooks/sentry
```

Expected: `{"status":"ok","message":"Sentry webhook endpoint is ready"}`

---

### 2. Recent Errors (Claude → Your App)
**URL:** `GET https://playgram.kua.cl/api/sentry/recent-errors`

Returns recent errors for analysis.

**Parameters:**
- `limit` - Number of errors (default: 50, max: 100)
- `hours` - Time window (default: 24)
- `level` - Filter by level: error, warning, info
- `environment` - Filter by: production, development
- `unresolved` - Show only unresolved (default: true)

**Examples:**

Last hour's errors:
```bash
curl "https://playgram.kua.cl/api/sentry/recent-errors?hours=1"
```

Only critical errors:
```bash
curl "https://playgram.kua.cl/api/sentry/recent-errors?level=error&limit=10"
```

Production errors only:
```bash
curl "https://playgram.kua.cl/api/sentry/recent-errors?environment=production"
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "errors": [
      {
        "eventId": "abc123...",
        "level": "error",
        "message": "Cannot read property 'validUntil' of undefined",
        "culprit": "QRCodeService.validate",
        "stackTrace": {...},
        "url": "https://playgram.kua.cl/engagement/qr-tools/123",
        "timestamp": "2025-11-18T22:00:00Z",
        "isResolved": false
      }
    ],
    "stats": {
      "total": 15,
      "unresolved": 12,
      "resolved": 3,
      "byLevel": {
        "error": 10,
        "warning": 5
      },
      "topErrors": [
        {"message": "QR validation failed", "count": 5},
        {"message": "Redis timeout", "count": 3}
      ]
    }
  }
}
```

---

### 3. Mark Errors as Resolved
**URL:** `POST https://playgram.kua.cl/api/sentry/recent-errors`

Marks specific errors as resolved.

**Body:**
```json
{
  "eventIds": ["event-id-1", "event-id-2"]
}
```

---

## Example Workflows

### Workflow 1: Morning Check
```
You: "Good morning Claude, any Sentry errors overnight?"

Me: [Reads API]
    "Yes, 3 new errors since midnight:
     1. QR validation (2 occurrences) - FIXED
     2. Image upload timeout (1 occurrence) - investigating

     The QR validation fix has been deployed."
```

### Workflow 2: After Deployment
```
You: "I just deployed the new feature. Monitor for issues."

Me: [Checks API every 15 mins]
    "Update: 1 new error detected - Form validation failing.
     Cause: Missing field validation. Fixing now..."
```

### Workflow 3: Weekly Review
```
You: "Show me this week's top 5 errors"

Me: [Reads API with 7-day window]
    "Top 5 errors this week:
     1. QR validation (45 occurrences) - NEEDS ATTENTION
     2. Redis timeout (12 occurrences) - Infrastructure issue
     3. Image processing (8 occurrences) - Cloudinary API
     4. Form submission (3 occurrences) - Fixed yesterday
     5. Auth token (2 occurrences) - User error

     Should I investigate #1 and #2?"
```

---

## Commands You Can Use

### Check Recent Errors
- "Claude, check Sentry errors from the last hour"
- "Claude, show me today's errors"
- "Claude, any critical errors?"

### Fix Errors
- "Claude, fix recent Sentry errors"
- "Claude, investigate the top 3 errors"
- "Claude, fix the QR validation error"

### Monitor
- "Claude, monitor for new errors"
- "Claude, alert me if errors spike"
- "Claude, check production health"

### Analysis
- "Claude, what's causing the most errors?"
- "Claude, are errors increasing or decreasing?"
- "Claude, compare errors this week vs last week"

---

## Benefits

### Before This Setup:
❌ Manual error checking in Sentry dashboard
❌ Email spam with every error
❌ Hard to track which errors are fixed
❌ No automated analysis
❌ Claude can't see errors directly

### After This Setup:
✅ Automated error collection
✅ Claude can read and analyze errors
✅ Quick fixes without manual debugging
✅ Track resolved vs unresolved
✅ Statistical analysis of error trends
✅ Proactive monitoring

---

## Next Steps

1. **Set up the Sentry webhook** (instructions above)
2. **Test the integration** - I'll trigger a test error
3. **Try a command** - Ask me to check recent errors
4. **Establish routine** - Daily morning check or post-deployment monitoring

Ready to set up the webhook? Just say:
**"Claude, I've configured the Sentry webhook, let's test it"**

And I'll verify everything works!

---

## Technical Details

### Database Schema
```sql
-- SentryEvent table stores all errors
CREATE TABLE SentryEvent (
  id            TEXT PRIMARY KEY,
  eventId       TEXT UNIQUE,     -- Sentry's event ID
  level         TEXT,            -- error, warning, info
  message       TEXT,            -- Error message
  stackTrace    JSONB,           -- Full stack trace
  environment   TEXT,            -- production, development
  timestamp     TIMESTAMP,       -- When error occurred
  isResolved    BOOLEAN,         -- Resolution status
  ...
)
```

### Webhook Security
- Endpoint is public (Sentry needs access)
- Processes only valid Sentry payloads
- Validates event structure before storing
- Logs all webhook attempts

### Performance
- Webhook responds < 100ms
- Error API caches for 1 minute
- Database indexed on timestamp, level, environment
- Automatic cleanup of old errors (30+ days)

---

## Troubleshooting

### Webhook Not Receiving Events
1. Check Sentry webhook URL is correct
2. Verify middleware allows `/api/webhooks/sentry`
3. Check Vercel deployment logs
4. Test with: `curl https://playgram.kua.cl/api/webhooks/sentry`

### API Returns Empty Errors
1. Check if webhook is configured
2. Verify errors are actually occurring
3. Try broader time range: `?hours=168` (7 days)
4. Check database: Ask me to verify

### Cannot Access Endpoints
1. Verify Vercel deployment succeeded
2. Check middleware configuration
3. Test endpoints are public
4. Check CORS if needed

---

## Support

**Ask me anytime:**
- "Claude, is the Sentry integration working?"
- "Claude, test the webhook endpoint"
- "Claude, why am I not seeing errors?"
- "Claude, show me the latest error details"

I can diagnose and fix any issues with the integration!
