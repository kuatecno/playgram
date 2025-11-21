# Instagram Login Integration Guide

## Overview

This system allows external websites to verify user identity through Instagram Direct Messages (DMs). Instead of traditional OAuth, users prove their Instagram ownership by sending a verification code via DM to your ManyChat bot.

## How It Works

### Flow Diagram

```
1. User visits your website → Clicks "Login with Instagram"
2. Your website → Requests verification code from Playgram API
3. Playgram → Generates unique code (e.g., "X7K-73-ABC")
4. Your website → Displays code to user
5. User → Opens Instagram, sends code to your ManyChat bot
6. ManyChat → Receives DM, calls Playgram validation endpoint
7. Playgram → Validates code, creates/updates user record
8. Playgram → Sends webhook to your website (if configured)
9. Your website → Logs user in with verified Instagram identity
```

## Step-by-Step Integration

### 1. Get an API Key

First, you need to create an API key in the Playgram dashboard:

1. Log in to your Playgram account
2. Navigate to **Verification** → **API Keys**
3. Click **Create API Key**
4. Fill in:
   - **Name**: Your website/service name
   - **Website Domain**: Your website domain (e.g., `example.com`)
   - **Service Prefix**: A short identifier (e.g., `MYAPP`)
   - **Rate Limits**: Set max requests per hour/day
5. **Save the API key immediately** - it's only shown once!

### 2. Generate a Verification Code

When a user wants to log in, call the generation endpoint:

**Endpoint:** `POST https://playgram.kua.cl/api/v1/verification/generate`

**Headers:**
```http
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

**Request Body:**
```json
{
  "external_website": "example.com",
  "external_user_id": "user_12345",  // Optional: Your internal user ID
  "webhook_url": "https://example.com/webhooks/instagram-verify",  // Optional
  "callback_token": "your-secret-token",  // Optional: For webhook auth
  "expires_in_minutes": 10,  // Optional: Default 10, max 60
  "metadata": {  // Optional: Custom data you want back in webhook
    "session_id": "abc123",
    "redirect_url": "/dashboard"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "code": "X7K-73-ABC",
    "expires_at": "2025-01-15T10:20:00Z",
    "verification_id": "cmhy5qkhz0002wtqrtw7hsh4m"
  }
}
```

### 3. Display Code to User

Show the verification code to the user with instructions:

```html
<div class="verification-box">
  <h2>Verify Your Instagram Account</h2>
  <p>Send this code to our Instagram bot:</p>
  <div class="code-display">X7K-73-ABC</div>
  <ol>
    <li>Open Instagram</li>
    <li>Go to @your_bot_username</li>
    <li>Send a DM with: <strong>X7K-73-ABC</strong></li>
  </ol>
  <p class="expires">Code expires in 10 minutes</p>
</div>
```

### 4. Poll for Verification Status

While the user is sending the DM, poll the check endpoint:

**Endpoint:** `GET https://playgram.kua.cl/api/v1/verification/check?code=X7K-73-ABC`

**Headers:**
```http
Authorization: Bearer YOUR_API_KEY
```

**Response (Pending):**
```json
{
  "success": true,
  "data": {
    "status": "pending",
    "code": "X7K-73-ABC",
    "expires_at": "2025-01-15T10:20:00Z"
  }
}
```

**Response (Verified):**
```json
{
  "success": true,
  "data": {
    "status": "verified",
    "code": "X7K-73-ABC",
    "ig_username": "johndoe",
    "instagram_id": "123456789",
    "manychat_user_id": "987654321",
    "verified_at": "2025-01-15T10:15:30Z",
    "user": {
      "first_name": "John",
      "last_name": "Doe",
      "full_name": "John Doe",
      "profile_pic": "https://instagram.com/pic.jpg"
    }
  }
}
```

**Polling Example (JavaScript):**
```javascript
async function pollVerificationStatus(code) {
  const maxAttempts = 60; // 5 minutes max (5 second intervals)
  let attempts = 0;
  
  const poll = async () => {
    try {
      const response = await fetch(
        `https://playgram.kua.cl/api/v1/verification/check?code=${code}`,
        {
          headers: {
            'Authorization': `Bearer ${YOUR_API_KEY}`
          }
        }
      );
      
      const data = await response.json();
      
      if (data.data.status === 'verified') {
        // Success! Log user in
        handleVerificationSuccess(data.data);
        return;
      }
      
      if (data.data.status === 'expired' || data.data.status === 'failed') {
        // Show error, allow retry
        handleVerificationFailure(data.data);
        return;
      }
      
      // Still pending, poll again
      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(poll, 5000); // Poll every 5 seconds
      } else {
        handleVerificationTimeout();
      }
    } catch (error) {
      console.error('Polling error:', error);
      setTimeout(poll, 5000);
    }
  };
  
  poll();
}
```

### 5. Receive Webhook (Optional but Recommended)

Instead of polling, you can configure a webhook to receive instant notifications:

**Webhook Payload:**
```json
{
  "event": "verification.success",
  "verification_id": "cmhy5qkhz0002wtqrtw7hsh4m",
  "code": "X7K-73-ABC",
  "external_website": "example.com",
  "external_user_id": "user_12345",
  "verified_at": "2025-01-15T10:15:30Z",
  "metadata": {
    "session_id": "abc123",
    "redirect_url": "/dashboard"
  },
  "user": {
    "ig_username": "johndoe",
    "instagram_id": "123456789",
    "manychat_user_id": "987654321",
    "first_name": "John",
    "last_name": "Doe",
    "full_name": "John Doe",
    "profile_pic": "https://instagram.com/pic.jpg",
    "custom_fields": {
      "favorite_color": "blue"
    }
  }
}
```

**Note:** The `user` object only contains fields that the user has explicitly allowed to share. If a user hasn't enabled sharing for a field, it will not appear in the payload. Always check for field existence before using it.

**Webhook Security:**
If you provided a `callback_token` when generating the code, Playgram will include it in the webhook request headers:

```http
X-Callback-Token: your-secret-token
```

Always verify this token in your webhook handler to ensure the request is legitimate.

**Webhook Handler Example (Node.js/Express):**
```javascript
app.post('/webhooks/instagram-verify', async (req, res) => {
  // Verify callback token
  const token = req.headers['x-callback-token'];
  if (token !== EXPECTED_CALLBACK_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const { event, external_user_id, user, metadata } = req.body;
  
  if (event === 'verification.success') {
    // Log user in with filtered user data
    // Note: Only fields the user allowed will be present
    const session = await createUserSession({
      instagram_username: user.ig_username,
      instagram_id: user.instagram_id,
      manychat_user_id: user.manychat_user_id,
      // These may be undefined if user didn't allow sharing
      first_name: user.first_name,
      last_name: user.last_name,
      full_name: user.full_name,
      profile_pic: user.profile_pic,
      custom_fields: user.custom_fields || {}
    });
    
    // Redirect user if metadata contains redirect_url
    if (metadata?.redirect_url) {
      // Store session token and redirect
      res.redirect(`${metadata.redirect_url}?token=${session.token}`);
    }
  }
  
  res.json({ received: true });
});
```

## Error Handling

### Common Error Responses

**Invalid API Key:**
```json
{
  "error": "Invalid API key",
  "status": 401
}
```

**Code Not Found:**
```json
{
  "success": false,
  "error": "CODE_NOT_FOUND",
  "message": "Code not found. Please request a new code."
}
```

**Code Expired:**
```json
{
  "success": false,
  "error": "EXPIRED",
  "message": "This code has expired. Please request a new code.",
  "expired_at": "2025-01-15T10:20:00Z"
}
```

**Code Already Used:**
```json
{
  "success": false,
  "error": "ALREADY_USED",
  "message": "This code has already been used.",
  "verified_at": "2025-01-15T10:15:30Z"
}
```

## Security Best Practices

1. **Store API keys securely** - Never expose them in client-side code
2. **Use HTTPS** - Always use HTTPS for API calls and webhooks
3. **Verify webhook tokens** - Always validate `X-Callback-Token` header
4. **Set appropriate expiration times** - 10 minutes is recommended
5. **Rate limit on your side** - Don't allow users to spam code generation
6. **Validate user data** - Don't trust data from webhooks without verification

## Rate Limits

Each API key has configurable rate limits:
- **Max requests per hour**: Default 100
- **Max requests per day**: Default 1000

If you exceed limits, you'll receive:
```json
{
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Too many requests. Please try again later.",
  "retry_after": 3600
}
```

## Code Format

Verification codes follow this format:
```
PREFIX-SESSION-SUFFIX
```

Example: `X7K-73-ABC`
- **PREFIX**: Random 3-character identifier (changes per code for security)
- **SESSION**: 2-character session ID
- **SUFFIX**: 3-character random suffix

The prefix is randomized for each code to prevent guessing attacks.

## User Data Available

After verification, you receive user data **based on the user's sharing preferences**. By default, only the Instagram username is shared. Users can control what data they share through their preferences.

### Available Data Fields

- **Instagram Username** (`ig_username`) - Always shared by default
- **Instagram Platform ID** (`instagram_id`) - Always shared (needed for verification)
- **ManyChat Subscriber ID** (`manychat_user_id`) - Always shared (needed for verification)
- **First Name** (`first_name`) - Only if user enabled sharing
- **Last Name** (`last_name`) - Only if user enabled sharing
- **Full Name** (`full_name`) - Only if user enabled sharing
- **Profile Picture** (`profile_pic`) - Only if user enabled sharing
- **Follower Count** (`follower_count`) - Only if user enabled sharing
- **Email** (`email`) - Only if user enabled sharing and available
- **Phone** (`phone`) - Only if user enabled sharing and available
- **Custom Fields** (`custom_fields`) - Only fields the user has explicitly allowed

### User Data Sharing Preferences

Users can control what data is shared with external websites through their data sharing preferences. By default, only the Instagram username is shared. Users can update their preferences via:

**API Endpoint:** `POST /api/v1/user/data-sharing-preferences`

**Request Body:**
```json
{
  "manychat_user_id": "123456789",
  "preferences": {
    "shareFirstName": true,
    "shareLastName": true,
    "shareFullName": true,
    "shareProfilePic": true,
    "shareIgUsername": true,
    "shareFollowerCount": false,
    "shareEmail": false,
    "sharePhone": false,
    "shareCustomFields": {
      "favorite_color": true,
      "birthday": false
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Data sharing preferences updated successfully",
    "preferences": {
      "shareFirstName": true,
      "shareLastName": true,
      "shareFullName": true,
      "shareProfilePic": true,
      "shareIgUsername": true,
      "shareFollowerCount": false,
      "shareEmail": false,
      "sharePhone": false,
      "shareCustomFields": {
        "favorite_color": true,
        "birthday": false
      }
    }
  }
}
```

**Get Current Preferences:**
```http
GET /api/v1/user/data-sharing-preferences?manychat_user_id=123456789
```

### Privacy-First Approach

This system follows a **privacy-first approach**:
- Users control exactly what data is shared
- Default is minimal sharing (username only)
- Users must explicitly opt-in to share additional data
- Custom fields can be selectively shared
- Preferences persist across verifications

## Example Integration (Full Flow)

```javascript
// 1. User clicks "Login with Instagram"
async function handleInstagramLogin() {
  // 2. Generate verification code
  const codeResponse = await fetch('https://playgram.kua.cl/api/v1/verification/generate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      external_website: 'example.com',
      external_user_id: getCurrentSessionId(),
      webhook_url: 'https://example.com/webhooks/instagram-verify',
      callback_token: WEBHOOK_SECRET,
      metadata: {
        redirect_url: '/dashboard'
      }
    })
  });
  
  const { data } = await codeResponse.json();
  const { code, expires_at } = data;
  
  // 3. Display code to user
  showVerificationCode(code, expires_at);
  
  // 4. Start polling (or wait for webhook)
  pollVerificationStatus(code);
}

// 5. Handle successful verification
function handleVerificationSuccess(verificationData) {
  const { ig_username, user, external_user_id, metadata } = verificationData;
  
  // Create session
  createUserSession({
    instagram_username: ig_username,
    instagram_id: verificationData.instagram_id,
    first_name: user.first_name,
    last_name: user.last_name,
    profile_pic: user.profile_pic
  });
  
  // Redirect
  if (metadata?.redirect_url) {
    window.location.href = metadata.redirect_url;
  }
}
```

## Support

For issues or questions:
- Check API documentation: `https://playgram.kua.cl/api/docs`
- Contact support through your Playgram dashboard
- Review error messages for specific guidance

## Notes

- Codes expire after the configured time (default 10 minutes)
- Each code can only be used once
- Users must send the code via Instagram DM to your ManyChat bot
- The ManyChat bot must be configured to forward DMs to Playgram's validation endpoint

