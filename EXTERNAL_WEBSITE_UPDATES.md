# Updates for External Websites - Instagram Login Integration

## Overview

We've implemented a **privacy-first data sharing system** that gives users control over what information is shared with your website during Instagram login verification.

## What Changed?

### Before (Old Behavior)
- All available user data was automatically shared:
  - First name, last name, full name
  - Profile picture
  - Instagram username
  - Follower count
  - All custom fields

### After (New Behavior)
- **Only data the user explicitly allows is shared**
- **Default: Only Instagram username is shared** (privacy-first)
- Users must opt-in to share additional data
- Custom fields can be selectively shared

## Impact on Your Integration

### 1. Webhook Payload Changes

**Before:**
```json
{
  "event": "verification.success",
  "user": {
    "first_name": "John",
    "last_name": "Doe",
    "full_name": "John Doe",
    "profile_pic": "https://...",
    "ig_username": "johndoe"
  }
}
```

**After:**
```json
{
  "event": "verification.success",
  "user": {
    "ig_username": "johndoe",        // Always included
    "instagram_id": "123456789",      // Always included (needed for verification)
    "manychat_user_id": "987654321",  // Always included (needed for verification)
    // These fields are OPTIONAL - only if user enabled sharing:
    "first_name": "John",             // May be undefined
    "last_name": "Doe",               // May be undefined
    "full_name": "John Doe",          // May be undefined
    "profile_pic": "https://...",     // May be undefined
    "follower_count": 5000,           // May be undefined
    "email": "user@example.com",      // May be undefined
    "phone": "+1234567890",           // May be undefined
    "custom_fields": {                // May be undefined or partial
      "favorite_color": "blue"        // Only fields user allowed
    }
  }
}
```

### 2. Check Endpoint Changes

The `/api/v1/verification/check` endpoint now returns filtered user data in the `user` object when verification is complete.

**Response (Verified):**
```json
{
  "success": true,
  "data": {
    "status": "verified",
    "verified_at": "2025-01-15T10:15:30Z",
    "user": {
      "ig_username": "johndoe",
      "instagram_id": "123456789",
      "manychat_user_id": "987654321",
      // Only fields user allowed to share
      "first_name": "John",
      "profile_pic": "https://..."
    }
  }
}
```

## Required Code Changes

### 1. Update Webhook Handler

**❌ OLD CODE (Will break if user hasn't enabled sharing):**
```javascript
app.post('/webhooks/instagram-verify', async (req, res) => {
  const { user } = req.body;
  
  // This will fail if user didn't allow sharing first_name
  createUserSession({
    firstName: user.first_name,  // ❌ May be undefined!
    lastName: user.last_name,     // ❌ May be undefined!
    profilePic: user.profile_pic  // ❌ May be undefined!
  });
});
```

**✅ NEW CODE (Safe - checks for field existence):**
```javascript
app.post('/webhooks/instagram-verify', async (req, res) => {
  const { user } = req.body;
  
  // Always available
  const session = await createUserSession({
    instagramUsername: user.ig_username,        // ✅ Always present
    instagramId: user.instagram_id,              // ✅ Always present
    manychatUserId: user.manychat_user_id,      // ✅ Always present
    
    // Optional fields - check before using
    firstName: user.first_name || null,         // ✅ Safe
    lastName: user.last_name || null,           // ✅ Safe
    fullName: user.full_name || null,            // ✅ Safe
    profilePic: user.profile_pic || null,       // ✅ Safe
    followerCount: user.follower_count || null,  // ✅ Safe
    email: user.email || null,                  // ✅ Safe
    phone: user.phone || null,                  // ✅ Safe
    customFields: user.custom_fields || {}      // ✅ Safe
  });
  
  // Handle case where user didn't share profile data
  if (!user.first_name && !user.profile_pic) {
    // User chose minimal sharing - handle gracefully
    console.log('User opted for minimal data sharing');
  }
});
```

### 2. Update Polling Code

**❌ OLD CODE:**
```javascript
const response = await fetch(`/api/v1/verification/check?session=${sessionId}`);
const data = await response.json();

if (data.data.status === 'verified') {
  // Assumes all fields are present
  loginUser({
    name: data.data.user.first_name + ' ' + data.data.user.last_name,
    avatar: data.data.user.profile_pic
  });
}
```

**✅ NEW CODE:**
```javascript
const response = await fetch(`/api/v1/verification/check?session=${sessionId}`);
const data = await response.json();

if (data.data.status === 'verified' && data.data.user) {
  const user = data.data.user;
  
  // Always available
  loginUser({
    instagramUsername: user.ig_username,
    instagramId: user.instagram_id,
    
    // Optional - provide fallbacks
    name: user.full_name || user.first_name || user.ig_username,
    avatar: user.profile_pic || '/default-avatar.png',
    email: user.email || null
  });
}
```

### 3. Handle Missing Data Gracefully

Since users control what data is shared, your code should handle missing fields:

```javascript
function createUserProfile(userData) {
  return {
    // Always available
    username: userData.ig_username,
    id: userData.instagram_id,
    
    // Optional with fallbacks
    displayName: userData.full_name 
      || `${userData.first_name || ''} ${userData.last_name || ''}`.trim()
      || userData.ig_username,
    
    avatar: userData.profile_pic || getDefaultAvatar(),
    
    // Optional fields
    ...(userData.email && { email: userData.email }),
    ...(userData.phone && { phone: userData.phone }),
    ...(userData.follower_count && { followers: userData.follower_count }),
    ...(userData.custom_fields && { metadata: userData.custom_fields })
  };
}
```

## Migration Checklist

- [ ] Update webhook handler to check for optional fields
- [ ] Update polling code to handle missing data
- [ ] Add fallback values for missing profile data
- [ ] Update user profile creation logic
- [ ] Test with users who have minimal sharing enabled
- [ ] Update UI to handle missing profile pictures/names
- [ ] Update database schema if you store user data (make fields nullable)

## What Data is Always Available?

These fields are **always** included (needed for verification):

- ✅ `ig_username` - Instagram username
- ✅ `instagram_id` - Instagram platform ID
- ✅ `manychat_user_id` - ManyChat subscriber ID

Everything else is **optional** and depends on user preferences.

## User Preference Management

Users can manage their data sharing preferences. You can:

1. **Inform users** about data sharing during verification
2. **Guide users** to update preferences if they want to share more
3. **Respect user choices** - don't require data they haven't shared

### Example: Prompting Users to Share More Data

```javascript
// After successful verification
if (!userData.profile_pic || !userData.first_name) {
  showMessage(
    "You can share more profile information for a better experience. " +
    "Update your preferences in your ManyChat bot."
  );
}
```

## Benefits of This Change

1. **Privacy-First**: Users control their data
2. **GDPR/CCPA Compliant**: Explicit consent for data sharing
3. **User Trust**: Transparent data handling
4. **Flexible**: Users can choose what to share
5. **Secure**: Minimal data exposure by default

## Testing Recommendations

1. **Test with minimal sharing** (default - username only)
2. **Test with full sharing** (all fields enabled)
3. **Test with selective sharing** (some fields enabled)
4. **Test custom fields** (selective custom field sharing)
5. **Test webhook handling** with missing fields
6. **Test polling** with missing fields

## Support

If you have questions or need help updating your integration:
- Review the updated [Instagram Login Integration Guide](./INSTAGRAM_LOGIN_INTEGRATION.md)
- Check API documentation for field descriptions
- Test with the verification endpoints

## Timeline

- **Effective Date**: After database migration is applied
- **Backward Compatibility**: Old webhooks will continue to work but may have missing fields
- **Migration Period**: Update your code within 30 days for best user experience

---

**Summary**: The system now respects user privacy by only sharing data users explicitly allow. Update your code to handle optional fields gracefully, and always check for field existence before using user data.

