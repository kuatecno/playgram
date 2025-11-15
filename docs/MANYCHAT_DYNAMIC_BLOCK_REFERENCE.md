# ManyChat Dynamic Block API Reference

Complete reference for ManyChat's Dynamic Block v2 API across all platforms (Instagram, Facebook, WhatsApp, Telegram).

**Official Documentation:**
- [Instagram/WhatsApp/Telegram](https://manychat.github.io/dynamic_block_docs/)
- [Facebook](https://manychat.github.io/dynamic_block_docs/)

---

## API Version & Limits

- **Current Version:** `v2`
- **Max Messages:** 10 per response
- **Max Quick Replies:** 11 per response
- **Max Actions:** 5 per response

---

## Response Format by Platform

### Instagram, WhatsApp, Telegram

**Requires `type` field in content:**

```json
{
  "version": "v2",
  "content": {
    "type": "instagram",  // Required! "whatsapp" or "telegram" also supported
    "messages": [...],
    "actions": [],        // optional
    "quick_replies": []   // optional (not supported for WhatsApp/Telegram)
  }
}
```

### Facebook

**No `type` field needed:**

```json
{
  "version": "v2",
  "content": {
    "messages": [...],
    "actions": [],        // optional
    "quick_replies": []   // optional
  }
}
```

---

## Message Types

### Text Message

```json
{
  "type": "text",
  "text": "Hello! This is a text message.",
  "buttons": []  // optional
}
```

**Supported Buttons:** url, flow, node, buy (platform-dependent)

### Image Message

```json
{
  "type": "image",
  "url": "https://example.com/image.png"
}
```

**Notes:**
- Supports JPG, PNG, GIF
- No buttons supported for Instagram/WhatsApp/Telegram
- Facebook supports buttons

### Video Message

❌ **Not supported:** WhatsApp, Instagram
✅ **Supported:** Facebook, Telegram

```json
{
  "type": "video",
  "url": "https://example.com/video.mp4",
  "buttons": []  // optional (Telegram/Facebook only)
}
```

**Limits:** Max 25MB file size

### Audio Message

❌ **Not supported:** WhatsApp, Instagram
✅ **Supported:** Facebook, Telegram

```json
{
  "type": "audio",
  "url": "https://example.com/audio.mp3",
  "buttons": []  // optional (Telegram/Facebook only)
}
```

**Limits:** Max 25MB file size

### File Message

❌ **Not supported:** WhatsApp, Instagram
✅ **Supported:** Facebook, Telegram

```json
{
  "type": "file",
  "url": "https://example.com/document.pdf"
}
```

**Limits:** Max 25MB file size

### Gallery Cards (Carousel)

❌ **Not supported:** WhatsApp, Telegram
✅ **Supported:** Facebook, Instagram

```json
{
  "type": "cards",
  "elements": [
    {
      "title": "Product Name",
      "subtitle": "Product description",
      "image_url": "https://example.com/product.png",
      "action_url": "https://example.com/product",  // optional
      "buttons": []  // optional
    }
  ],
  "image_aspect_ratio": "horizontal"  // or "square"
}
```

**Notes:**
- `action_url` should use HTTPS
- `image_aspect_ratio` defaults to "horizontal"

---

## Button Types

### URL Button

```json
{
  "type": "url",
  "caption": "Visit Website",
  "url": "https://example.com",
  "webview_size": "full",  // optional: "full", "medium", "compact" (Facebook only)
  "actions": []  // optional
}
```

### Go to Flow Button

```json
{
  "type": "flow",
  "caption": "Continue",
  "target": "content20180221085508_278589",  // Flow ID from URL
  "actions": []  // optional
}
```

### Go to Node Button

```json
{
  "type": "node",
  "caption": "Next Step",
  "target": "My Content",  // Node name (must be unique)
  "actions": []  // optional
}
```

**⚠️ Important:**
- Target must be exact node name from flow
- Not supported in Public API
- Multiple nodes with same name = unpredictable behavior

### Buy Button

```json
{
  "type": "buy",
  "caption": "Purchase",
  "customer": {
    "shipping_address": true,
    "contact_name": false,
    "contact_phone": true,
    "contact_email": true
  },
  "product": {
    "label": "T-Shirt",
    "cost": 2250  // in cents ($22.50)
  },
  "success_target": "Order Confirmed"  // optional node name
}
```

**Requirements:**
- Stripe or PayPal must be connected in ManyChat
- Cost in cents (2250 = $22.50)

### Call Button (Facebook only)

```json
{
  "type": "call",
  "caption": "Call Us",
  "phone": "+1 (555) 555-5555"
}
```

### Dynamic Block Callback Button

```json
{
  "type": "dynamic_block_callback",
  "caption": "Load More",
  "url": "https://your-api.com/endpoint",
  "method": "post",
  "headers": {         // optional
    "x-api-key": "value"
  },
  "payload": {         // optional
    "key": "value"
  }
}
```

**Notes:**
- Must use HTTPS
- Triggers another Dynamic Block request on click

---

## Actions

Actions are executed automatically when the message is sent.

### Add Tag

```json
{
  "action": "add_tag",
  "tag_name": "qualified_lead"
}
```

**Note:** Tag must already exist in ManyChat

### Remove Tag

```json
{
  "action": "remove_tag",
  "tag_name": "unqualified"
}
```

### Set Custom Field Value

```json
{
  "action": "set_field_value",
  "field_name": "last_purchase_date",
  "value": "2024-03-25"
}
```

**Field Type Formats:**
- **Number:** `2` or `3.14` (no quotes)
- **Text:** `"some text"` (with quotes)
- **Date:** `"2024-03-25"` (YYYY-MM-DD)
- **DateTime:** `"2024-03-25T13:25:00.000Z"` (ISO8601 UTC)
- **Boolean:** `true` or `false` (no quotes)

### Unset Custom Field Value

```json
{
  "action": "unset_field_value",
  "field_name": "temporary_data"
}
```

---

## Quick Replies

❌ **Not supported:** WhatsApp, Telegram
✅ **Supported:** Facebook, Instagram

**Limitations:**
- Cannot use if there are blocks after Dynamic Block
- Max 11 quick replies

### Go to Flow Quick Reply

```json
{
  "type": "flow",
  "caption": "Start Over",
  "target": "content20180221085508_278589"
}
```

### Go to Node Quick Reply

```json
{
  "type": "node",
  "caption": "Yes",
  "target": "Confirmation Node"
}
```

### Dynamic Block Callback Quick Reply

```json
{
  "type": "dynamic_block_callback",
  "caption": "Show Options",
  "url": "https://your-api.com/options",
  "method": "post",
  "headers": {},    // optional
  "payload": {}     // optional
}
```

---

## Variables (Full Contact Data)

ManyChat sends this data structure in Dynamic Block requests:

```json
{
  "id": 13245647xxxxxxxxx,
  "key": "user:13245647xxxxxxxxx",
  "page_id": 234564657xxxxxxxx,
  "status": "active",
  "first_name": "John",
  "last_name": "Doe",
  "name": "John Doe",
  "gender": "male",
  "profile_pic": "https://example.com/profile.jpg",
  "locale": "en_US",
  "language": "English",
  "timezone": "UTC-07",
  "live_chat_url": "https://manychat.com/fb234564657xxxxxxxx/chat/13245647xxxxxxxxx",
  "last_input_text": "User's last message",
  "last_growth_tool": null,
  "subscribed": "2018-07-02T00:00:00+00:00",
  "last_interaction": "2018-07-02T00:00:00+00:00",
  "last_seen": "2018-07-02T00:00:00+00:00",
  "custom_fields": {
    "email": "john@example.com",
    "purchase_count": 5,
    "is_premium": true,
    "last_order_date": "2024-03-25"
  }
}
```

**Common Placeholders:**
- `{{user_id}}` - User ID
- `{{first_name}}` - First name
- `{{last_name}}` - Last name
- `{{user_input}}` - Last input text
- Custom fields accessible via their names

---

## Platform Support Matrix

| Feature | Facebook | Instagram | WhatsApp | Telegram |
|---------|----------|-----------|----------|----------|
| **Text Messages** | ✅ | ✅ | ✅ | ✅ |
| **Images** | ✅ | ✅ | ✅ | ✅ |
| **Videos** | ✅ | ❌ | ❌ | ✅ |
| **Audio** | ✅ | ❌ | ❌ | ✅ |
| **Files** | ✅ | ❌ | ❌ | ✅ |
| **Gallery Cards** | ✅ | ✅ | ❌ | ❌ |
| **Quick Replies** | ✅ | ✅ | ❌ | ❌ |
| **URL Buttons** | ✅ | ✅ | ✅ | ✅ |
| **Flow Buttons** | ✅ | ✅ | ✅ | ✅ |
| **Node Buttons** | ✅ | ✅ | ✅ | ✅ |
| **Buy Buttons** | ✅ | ✅ | ❌ | ✅ |
| **Call Buttons** | ✅ | ❌ | ❌ | ❌ |
| **Webview Size** | ✅ | ❌ | ❌ | ❌ |
| **Actions (Tags/Fields)** | ✅ | ✅ | ✅ | ✅ |

---

## Complete Examples

### Instagram: Send QR Code Image

```json
{
  "version": "v2",
  "content": {
    "type": "instagram",
    "messages": [
      {
        "type": "image",
        "url": "data:image/png;base64,iVBORw0KGgo..."
      },
      {
        "type": "text",
        "text": "✅ Your QR code: PROMO-ABC123\n\nShow this at checkout!"
      }
    ],
    "actions": [
      {
        "action": "set_field_value",
        "field_name": "qr_code_sent",
        "value": true
      },
      {
        "action": "add_tag",
        "tag_name": "has_qr_code"
      }
    ]
  }
}
```

### Instagram: Product Gallery

```json
{
  "version": "v2",
  "content": {
    "type": "instagram",
    "messages": [
      {
        "type": "cards",
        "elements": [
          {
            "title": "Product 1",
            "subtitle": "$29.99",
            "image_url": "https://example.com/product1.jpg",
            "action_url": "https://example.com/product1",
            "buttons": [
              {
                "type": "url",
                "caption": "View Details",
                "url": "https://example.com/product1"
              }
            ]
          },
          {
            "title": "Product 2",
            "subtitle": "$39.99",
            "image_url": "https://example.com/product2.jpg",
            "action_url": "https://example.com/product2",
            "buttons": [
              {
                "type": "url",
                "caption": "View Details",
                "url": "https://example.com/product2"
              }
            ]
          }
        ],
        "image_aspect_ratio": "square"
      }
    ]
  }
}
```

### Facebook: Interactive Menu

```json
{
  "version": "v2",
  "content": {
    "messages": [
      {
        "type": "text",
        "text": "What would you like to do?",
        "buttons": [
          {
            "type": "flow",
            "caption": "Shop Products",
            "target": "content20180221085508_278589"
          },
          {
            "type": "url",
            "caption": "Contact Support",
            "url": "https://example.com/support",
            "webview_size": "medium"
          }
        ]
      }
    ],
    "quick_replies": [
      {
        "type": "node",
        "caption": "Main Menu",
        "target": "Main Menu"
      }
    ]
  }
}
```

---

## Best Practices

1. **Always use HTTPS** for URLs (HTTP may not work)
2. **Keep file sizes under 25MB** for media
3. **Use unique node names** to avoid routing issues
4. **Test on target platform** - features vary by platform
5. **Validate field types** before setting custom field values
6. **Create tags/fields first** before referencing them in actions
7. **Use data URIs** for inline images (base64 encoding)
8. **Handle errors gracefully** - return user-friendly messages
9. **Respect rate limits** - max 10 messages per response
10. **Test Dynamic Block callbacks** with HTTPS endpoints

---

## Common Errors

### "Invalid response format"
- Missing `version` property
- Missing `type` for Instagram/WhatsApp/Telegram
- Exceeded message/action limits

### "Field/Tag not found"
- Tag/field doesn't exist in ManyChat
- Typo in field_name or tag_name

### "Button not working"
- Node target doesn't exist
- Multiple nodes with same name
- Using unsupported button type for platform

### "Image not displaying"
- HTTP URL instead of HTTPS
- File too large (>25MB)
- Invalid image format
- CORS issues with external URLs
