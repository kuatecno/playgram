# Playgram v3.0 - UI/UX Organization

> **Intuitive feature organization for end users**
>
> Making 42 features feel simple and accessible

## Table of Contents

1. [UI Philosophy](#ui-philosophy)
2. [Feature Categorization](#feature-categorization)
3. [Navigation Structure](#navigation-structure)
4. [Dashboard Organization](#dashboard-organization)
5. [User Flows](#user-flows)
6. [Mobile Experience](#mobile-experience)
7. [Progressive Disclosure](#progressive-disclosure)

---

## UI Philosophy

### Core Principles

**1. Task-Oriented, Not Feature-Oriented**
- Users think in terms of tasks ("I want to create a QR code")
- Not technical features ("I need to access the QR code generator module")

**2. Progressive Disclosure**
- Show simple options first
- Hide advanced features until needed
- Don't overwhelm new users

**3. Consistent Patterns**
- Same UI patterns across features
- Predictable navigation
- Muscle memory

**4. Mobile-First**
- Works great on phones
- Desktop gets enhanced experience
- Touch-friendly interactions

**5. Fast Access**
- Most common tasks: 1-2 clicks
- Command palette (⌘K) for power users
- Quick actions everywhere

---

## Feature Categorization

### Problem: 42 Features is Too Many

Old Flowkick approach:
- Flat navigation (12 menu items)
- Hard to find features
- Overwhelming for new users

### Solution: Group by User Intent

We organize features into **5 main categories** based on what users want to accomplish:

---

## The 5 Main Categories

### 1. 📊 **Dashboard** (Overview)
**User intent**: "I want to see what's happening"

**Features (6)**:
- Key metrics (users, bookings, QR scans, revenue)
- Recent activity feed
- Upcoming bookings (next 5)
- Recent QR codes (last 10)
- Quick actions (create QR, create booking, sync contacts)
- Notifications center

**UI Design**:
- Widget-based dashboard
- Customizable layout (drag-drop widgets)
- Real-time updates
- Dark mode friendly

---

### 2. 👥 **Contacts** (CRM)
**User intent**: "I want to manage my Instagram audience"

**Features (8)**:
- Contact list with search/filters
- Individual contact profile
- Tags management
- Custom fields
- Interaction history
- User snapshots (historical data)
- Data export (CSV, JSON, PDF)
- Segments (smart groups)

**UI Design**:
- Gmail-like interface:
  - Left sidebar: Filters, tags, segments
  - Center: Contact list (table view)
  - Right: Contact detail panel (slides in)
- Advanced search (⌘K)
- Bulk actions (tag, export, delete)

**Navigation**:
```
Contacts
├── All Contacts
├── Tags
├── Custom Fields
├── Segments
└── Export Data
```

---

### 3. 🎯 **Engagement** (Tools for Customers)
**User intent**: "I want to engage with my audience"

**Features (12)**:
- **QR Codes** (4 features):
  - Generate QR codes
  - Validate QR codes
  - QR analytics
  - QR scanner
- **Bookings** (4 features):
  - Create booking
  - Calendar view
  - Availability management
  - Booking reports
- **AI Chat** (3 features):
  - Conversations
  - Message templates
  - AI settings
- **Verification** (1 feature):
  - Instagram verification codes

**UI Design**:
- Each tool has its own sub-section
- Wizard-based creation flows
- Calendar interface for bookings
- Chat interface for AI

**Navigation**:
```
Engagement
├── QR Codes
│   ├── Generate
│   ├── My QR Codes
│   ├── Scanner
│   └── Analytics
├── Bookings
│   ├── Calendar
│   ├── All Bookings
│   └── Availability
├── AI Chat
│   ├── Conversations
│   └── Templates
└── Verification
    └── Codes
```

---

### 4. 📱 **Social** (Social Media Data & Posts)
**User intent**: "I want to manage my social media content"

**Features (7)**:
- **Flowkick API** (5 features):
  - Instagram posts
  - TikTok videos
  - Google Reviews
  - API clients
  - Usage analytics
- **Instagram Posts** (2 features):
  - Post categories
  - Post management

**UI Design**:
- Grid view for posts (like Instagram)
- Table view for API clients
- Charts for usage analytics
- Drag-drop for post categorization

**Navigation**:
```
Social
├── Instagram
│   ├── Posts
│   └── Categories
├── TikTok
│   └── Videos
├── Google Reviews
│   └── Reviews
└── API Service
    ├── Clients
    └── Analytics
```

---

### 5. ⚙️ **Settings** (Configuration)
**User intent**: "I want to configure my account"

**Features (9)**:
- **Account** (1 feature):
  - Profile settings
  - Password change
  - Session management
- **Integrations** (3 features):
  - Manychat connection
  - Instagram accounts (future)
  - API keys
- **Webhooks** (3 features):
  - Webhook subscriptions
  - Delivery logs
  - Webhook playground
- **Tools** (2 features):
  - Tool management
  - Tool settings

**UI Design**:
- Tab-based interface
- Settings form with sections
- Connection status indicators
- Test buttons for integrations

**Navigation**:
```
Settings
├── Account
│   ├── Profile
│   └── Security
├── Integrations
│   ├── Manychat
│   ├── Instagram
│   └── API Keys
├── Webhooks
│   ├── Manage
│   ├── Logs
│   └── Playground
└── Tools
    └── My Tools
```

---

## Navigation Structure

### Primary Navigation (Sidebar)

```
┌────────────────────────────────┐
│  [Logo] Playgram              │
├────────────────────────────────┤
│  🏠 Dashboard                  │
│  👥 Contacts                   │
│  🎯 Engagement          >      │
│  📱 Social              >      │
│  ⚙️  Settings           >      │
├────────────────────────────────┤
│  [User Profile]                │
│  [Notifications] 3             │
│  [Command Palette] ⌘K          │
└────────────────────────────────┘
```

### Expandable Sections (on hover/click)

```
🎯 Engagement  >
  ├── QR Codes
  ├── Bookings
  ├── AI Chat
  └── Verification
```

### Mobile Navigation (Bottom Bar)

```
┌──────────────────────────────────┐
│ [Dashboard] [Contacts] [+] [Social] [Settings] │
└──────────────────────────────────┘
```

Center button ("+") opens quick actions:
- Generate QR Code
- Create Booking
- New Conversation
- Sync Contacts

---

## Dashboard Organization

### Default Layout (Widgets)

```
┌──────────────────────────────────────────────────┐
│  Welcome back, Admin! 👋                         │
├──────────────────────────────────────────────────┤
│                                                  │
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐ │
│  │ Users  │  │Bookings│  │QR Scans│  │Revenue │ │
│  │ 1,234  │  │   45   │  │  789   │  │ $4,567 │ │
│  └────────┘  └────────┘  └────────┘  └────────┘ │
│                                                  │
│  ┌─────────────────────┐  ┌──────────────────┐  │
│  │ Upcoming Bookings   │  │ Recent Activity  │  │
│  │                     │  │                  │  │
│  │ • Today 2pm - John  │  │ • QR code scan   │  │
│  │ • Today 4pm - Jane  │  │ • New contact    │  │
│  │ • Tomorrow 10am     │  │ • Booking created│  │
│  └─────────────────────┘  └──────────────────┘  │
│                                                  │
│  ┌─────────────────────────────────────────┐    │
│  │ Quick Actions                            │    │
│  │ [Generate QR] [Create Booking] [Sync]   │    │
│  └─────────────────────────────────────────┘    │
│                                                  │
│  ┌─────────────────────────────────────────┐    │
│  │ User Growth Chart (Last 30 days)        │    │
│  │ [Area Chart]                             │    │
│  └─────────────────────────────────────────┘    │
└──────────────────────────────────────────────────┘
```

### Customizable Widgets

Users can:
- Add/remove widgets
- Reorder widgets (drag-drop)
- Resize widgets
- Save layout preferences

**Available Widgets**:
1. Key Metrics (users, bookings, scans, revenue)
2. Upcoming Bookings
3. Recent Activity Feed
4. Recent QR Codes
5. User Growth Chart
6. Engagement Chart
7. Quick Actions
8. Top Performing QR Codes
9. Booking Calendar (mini)
10. Sync Status

---

## User Flows

### Flow 1: Generate QR Code (Simple)

**Goal**: Create a QR code in 3 clicks

```
1. Dashboard → Click "Generate QR Code" (quick action)
   ↓
2. QR Generator Modal Opens
   ├─ Select QR Type: [Promotion] [Validation] [Discount]
   ├─ Enter Prefix: "PROMO"
   ├─ Select User: [Dropdown]
   └─ [Generate] button
   ↓
3. QR Code Created!
   ├─ Preview image
   ├─ Download button
   ├─ Copy link button
   └─ View details link
```

**Advanced Options** (collapsed by default):
- Custom format pattern
- Expiration date
- Metadata
- Multiple QR codes (batch)

---

### Flow 2: Create Booking (Calendar View)

**Goal**: Create booking by clicking calendar slot

```
1. Engagement → Bookings → Calendar
   ↓
2. Calendar shows available slots
   ├─ Green = Available
   ├─ Red = Booked
   └─ Gray = Unavailable
   ↓
3. Click available slot
   ↓
4. Booking form appears (slide-in panel)
   ├─ Pre-filled time slot
   ├─ Select customer: [Search/dropdown]
   ├─ Service type: [Dropdown]
   ├─ Notes: [Textarea]
   └─ [Create Booking] button
   ↓
5. Booking created!
   ├─ Appears on calendar
   ├─ Email sent (if configured)
   └─ Webhook fired
```

---

### Flow 3: Sync Contacts from Manychat

**Goal**: Sync in 2 clicks

```
1. Dashboard → Click "Sync Contacts" (quick action)
   ↓
2. Sync modal appears
   ├─ Last sync: "2 hours ago"
   ├─ [Sync All] button
   ├─ [Sync New Only] button
   └─ Advanced: [Select specific tags]
   ↓
3. Sync progress
   ├─ Progress bar
   ├─ "Syncing 1,234 contacts..."
   └─ Estimated time: 2 minutes
   ↓
4. Sync complete!
   ├─ Summary: "Added 45, Updated 234"
   ├─ View sync log
   └─ [Close] button
```

---

### Flow 4: Search Anything (Command Palette)

**Goal**: Find anything with keyboard (⌘K)

```
1. Press ⌘K (or click search icon)
   ↓
2. Command palette opens (modal)
   ├─ Search box: "Type to search..."
   ├─ Recent searches
   └─ Popular actions
   ↓
3. Type: "qr code"
   ├─ Contacts with "qr" in name
   ├─ QR codes containing "qr"
   ├─ Actions: "Generate QR Code"
   └─ Pages: "QR Code Management"
   ↓
4. Select result
   ↓
5. Navigate to result OR execute action
```

**Keyboard shortcuts**:
- `⌘K` - Open command palette
- `⌘N` - New QR code
- `⌘B` - New booking
- `⌘S` - Sync contacts
- `⌘/` - Toggle sidebar
- `Esc` - Close modal/panel

---

## Mobile Experience

### Mobile-First Design Principles

**1. Touch Targets**
- Minimum 44x44px tap targets
- Adequate spacing between buttons
- Swipe gestures for common actions

**2. Navigation**
- Bottom bar (not sidebar)
- 5 main categories
- Floating action button for quick actions

**3. Responsive Tables**
- Cards on mobile (not tables)
- Swipe to reveal actions
- Infinite scroll

**4. Forms**
- Stack fields vertically
- Large input fields
- Native input types (date picker, number pad)

---

### Mobile Navigation

```
┌─────────────────────────────────────┐
│  Playgram            [🔔] [⌘K]     │
├─────────────────────────────────────┤
│                                     │
│  [Page Content]                     │
│                                     │
│                                     │
│                                     │
│                                     │
│                                     │
│                                     │
│                                     │
│                                     │
├─────────────────────────────────────┤
│ [🏠] [👥] [+] [📱] [⚙️]             │
└─────────────────────────────────────┘
```

### Mobile Contact List (Cards)

```
┌─────────────────────────────────┐
│ John Doe                 [...]  │
│ @johndoe                        │
│ 🏷️ VIP, Customer               │
│ Last seen: 2 hours ago          │
│ [Message] [Create Booking]      │
└─────────────────────────────────┘
```

Swipe right → Quick actions
Swipe left → Delete/Archive

---

## Progressive Disclosure

### Principle: Start Simple, Add Complexity Gradually

**Example: QR Code Generator**

**Level 1: Beginner (default view)**
```
┌────────────────────────────┐
│ Generate QR Code           │
├────────────────────────────┤
│ QR Type: [Promotion ▾]     │
│ For User: [Select... ▾]    │
│                            │
│ [Generate QR Code]         │
│                            │
│ [Show Advanced Options ▾]  │
└────────────────────────────┘
```

**Level 2: Intermediate**
```
┌────────────────────────────┐
│ Generate QR Code           │
├────────────────────────────┤
│ QR Type: [Promotion ▾]     │
│ For User: [Select... ▾]    │
│ Expiration: [30 days ▾]    │
│ Format: [Auto ▾]           │
│                            │
│ [Generate QR Code]         │
│                            │
│ [Show Advanced Options ▾]  │
└────────────────────────────┘
```

**Level 3: Advanced (expanded)**
```
┌────────────────────────────┐
│ Generate QR Code           │
├────────────────────────────┤
│ QR Type: [Promotion ▾]     │
│ For User: [Select... ▾]    │
│ Expiration: [30 days ▾]    │
│ Format: [Custom... ▾]      │
│   {PREFIX}-{USER_ID}-{TAG} │
│ Metadata: [Edit JSON]      │
│ Max Scans: [1]             │
│ Location Tracking: [✓]     │
│                            │
│ [Generate QR Code]         │
│                            │
│ [Hide Advanced Options ▴]  │
└────────────────────────────┘
```

---

## Context-Sensitive Help

### In-App Tooltips

Hover over "?" icon → Show tooltip

```
QR Type (?)
  ↓
┌─────────────────────────────────┐
│ Choose the type of QR code:     │
│                                 │
│ • Promotion: Discount codes     │
│ • Validation: Event tickets     │
│ • Discount: Special offers      │
└─────────────────────────────────┘
```

### Empty States

**No QR codes yet**:
```
┌─────────────────────────────────┐
│          📱                      │
│     No QR codes yet              │
│                                 │
│  QR codes help you track        │
│  customer interactions          │
│                                 │
│  [Generate Your First QR Code]  │
│  [Watch Tutorial Video]         │
└─────────────────────────────────┘
```

### Onboarding Checklist

**First-time user**:
```
┌─────────────────────────────────┐
│ Get Started with Playgram       │
├─────────────────────────────────┤
│ ✅ Create account                │
│ ✅ Connect Manychat              │
│ ⬜ Sync your first contacts      │
│ ⬜ Generate a QR code            │
│ ⬜ Create a booking              │
└─────────────────────────────────┘
```

---

## Notification System

### Types of Notifications

**1. Success** (green)
```
✅ QR code generated successfully!
   [View QR Code] [Dismiss]
```

**2. Error** (red)
```
❌ Failed to sync contacts
   Manychat API is unreachable
   [Retry] [View Details] [Dismiss]
```

**3. Warning** (yellow)
```
⚠️  Your API quota is 80% used
   Upgrade to Pro for unlimited
   [Upgrade] [Dismiss]
```

**4. Info** (blue)
```
ℹ️  New booking created
   John Doe - Tomorrow 2pm
   [View Booking] [Dismiss]
```

### Notification Center

```
┌─────────────────────────────────┐
│ Notifications          [Mark All]│
├─────────────────────────────────┤
│ ⬤ New booking - 2min ago        │
│ • QR code scanned - 1hr ago     │
│ • Contact synced - 2hr ago      │
│ • Webhook failed - 3hr ago      │
└─────────────────────────────────┘
```

---

## Data Visualization

### Charts & Graphs

**User Growth** (Line Chart)
```
Users Over Time
1,500 ┤          ╭─╮
1,000 ┤      ╭───╯ ╰╮
  500 ┤  ╭───╯      ╰──
    0 ┼──┴────────────────
     Jan Feb Mar Apr May
```

**QR Code Scans** (Bar Chart)
```
Scans by Type
400 ┤ ████
300 ┤ ████ ██
200 ┤ ████ ██ ██
100 ┤ ████ ██ ██ █
  0 ┼──────────────
    Promo Val Disc Other
```

**Engagement Heatmap** (Table)
```
Best Times to Post
     Mon Tue Wed Thu Fri
9am   🔥  ⭐  🔥  ⭐  🔥
12pm  ⭐  ⭐  🔥  🔥  ⭐
3pm   ⭐  ⭐  ⭐  🔥  🔥
6pm   🔥  🔥  🔥  ⭐  ⭐
```

---

## Accessibility

### WCAG 2.1 AA Compliance

**1. Color Contrast**
- Text: 4.5:1 minimum
- UI elements: 3:1 minimum
- Don't rely on color alone

**2. Keyboard Navigation**
- All features accessible via keyboard
- Visible focus indicators
- Logical tab order

**3. Screen Reader Support**
- Semantic HTML
- ARIA labels
- Alt text for images

**4. Responsive Text**
- Zoom to 200% without loss of content
- Readable font sizes (16px base)
- Line height 1.5+

**5. Error Handling**
- Clear error messages
- Suggestions for fixes
- Don't rely on icons alone

---

## Performance UX

### Loading States

**Skeleton Loaders** (instead of spinners)
```
┌─────────────────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓▓                 │ ← Loading name
│ ▓▓▓▓▓▓▓                     │ ← Loading username
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓              │ ← Loading tags
└─────────────────────────────┘
```

**Progress Bars** (for long operations)
```
┌─────────────────────────────┐
│ Syncing contacts...          │
│ ████████████░░░░░░░░ 60%    │
│ 1,234 / 2,000 contacts       │
└─────────────────────────────┘
```

**Optimistic UI** (instant feedback)
```
User clicks "Delete"
  ↓
Row fades out immediately (optimistic)
  ↓
API call happens in background
  ↓
If success: Row removed (already faded)
If error: Row reappears + error message
```

---

## Summary: UI Organization Principles

### 1. **Categorize by Intent, Not Features**
✅ Do: "Engagement" → "QR Codes" → "Generate"
❌ Don't: "Tools" → "QR Code Generator" → "Form"

### 2. **Progressive Disclosure**
✅ Start simple, add complexity gradually
❌ Don't show all 20 options at once

### 3. **Fast Access**
✅ Quick actions, command palette (⌘K), shortcuts
❌ Don't bury common tasks 5 clicks deep

### 4. **Consistent Patterns**
✅ Same UI patterns across features
❌ Don't reinvent the wheel for each feature

### 5. **Mobile-First**
✅ Design for mobile, enhance for desktop
❌ Don't make mobile an afterthought

### 6. **Context-Sensitive Help**
✅ Tooltips, empty states, onboarding
❌ Don't assume users know what to do

### 7. **Performance as UX**
✅ Skeleton loaders, optimistic UI, fast transitions
❌ Don't make users wait for spinners

---

## Navigation Map

```
Playgram v3.0
│
├── 🏠 Dashboard
│   ├── Overview (metrics, activity, quick actions)
│   └── Customize Layout
│
├── 👥 Contacts
│   ├── All Contacts (list, search, filter)
│   ├── Contact Detail (profile, history, actions)
│   ├── Tags (manage, assign, analytics)
│   ├── Custom Fields (define, edit)
│   ├── Segments (smart groups)
│   └── Export Data (CSV, JSON, PDF)
│
├── 🎯 Engagement
│   ├── QR Codes
│   │   ├── Generate (wizard)
│   │   ├── My QR Codes (list, filter)
│   │   ├── Scanner (mobile app)
│   │   └── Analytics (charts, reports)
│   │
│   ├── Bookings
│   │   ├── Calendar (day/week/month view)
│   │   ├── All Bookings (list, filter)
│   │   ├── Availability (manage schedules)
│   │   └── Reports (analytics)
│   │
│   ├── AI Chat
│   │   ├── Conversations (list, filter)
│   │   ├── Chat View (message thread)
│   │   ├── Templates (manage)
│   │   └── Settings (model, prompts)
│   │
│   └── Verification
│       └── Codes (generate, validate)
│
├── 📱 Social
│   ├── Instagram
│   │   ├── Posts (grid view)
│   │   └── Categories (manage, assign)
│   │
│   ├── TikTok
│   │   └── Videos (grid view)
│   │
│   ├── Google Reviews
│   │   └── Reviews (list)
│   │
│   └── API Service
│       ├── Clients (manage subscriptions)
│       └── Analytics (usage, performance)
│
└── ⚙️ Settings
    ├── Account
    │   ├── Profile (name, email)
    │   └── Security (password, 2FA)
    │
    ├── Integrations
    │   ├── Manychat (connect, sync)
    │   ├── Instagram (connect accounts - future)
    │   └── API Keys (manage, rotate)
    │
    ├── Webhooks
    │   ├── Manage (create, edit, delete)
    │   ├── Logs (delivery history)
    │   └── Playground (test webhooks)
    │
    └── Tools
        ├── My Tools (list, create, edit)
        └── Tool Settings (configure per tool)
```

---

**Next Steps**:
1. Review this UI organization
2. Validate with user testing (if possible)
3. Create wireframes/mockups
4. Implement in Phase 1

---

**Last Updated**: 2025-11-09
**Status**: UI Organization Guidelines Approved
