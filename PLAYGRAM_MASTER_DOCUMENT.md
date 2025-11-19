# Playgram v3 Master Documentation

> **Current Status**: Phase 3 Complete, moving to Phase 4 (Integrations & Polish).
> **Note**: QR Codes, Bookings, Tools, and Dynamic Gallery are implemented (including UI).

## Section 1: Architecture High-Level Overview

**Core Principles**
1. **Simplicity First**: Clear is better than clever.
2. **Hybrid Structure**: `app/` for routes, `features/` for complex domain logic.
3. **Scalability**: Built-in Redis caching, background jobs (BullMQ), and solid patterns.

**Project Structure**
- `app/`: Next.js App Router (Routes & UI Pages)
- `features/`: Domain logic (Services, Hooks, Types) - *Keep complex logic here*
- `lib/`: Shared infrastructure (DB, Auth, Cache, Queue)
- `api/`: API Route Handlers

---

## Section 2: Remaining Roadmap

### Phase 4: Webhook & CRM Integration (Next Up)
*Focus: Making Playgram talk to the outside world reliably.*

1.  **Webhook System**
    *   [ ] **Visual Webhook Builder**: UI to configure subscriptions and filters.
    *   [ ] **Delivery System**: Reliable delivery with retry logic (BullMQ) and dead letter queues.
    *   [ ] **Webhook Playground**: "RequestBin"-like UI for testing webhooks.
    *   [ ] **Event Catalog**: Define all emit-able events in the system.

2.  **Manychat CRM Sync**
    *   [ ] **Real-time Webhook Sync**: Receive data from Manychat webhooks.
    *   [ ] **Background Sync Jobs**: Robust background syncing for large contact lists.
    *   [ ] **Conflict Resolution**: Logic for when data changes in both places.

3.  **Data Export**
    *   [ ] **Export Engine**: Generate PDF/Excel files for user data.
    *   [ ] **Scheduled Exports**: Cron jobs to email reports automatically.

### Phase 5: Social Data & Content
*Focus: Advanced Instagram data handling.*

1.  **Social Data Service**
    *   [ ] **Instagram Graph API Integration**: Official API integration (requires app approval).
    *   [ ] **Apify Fallback**: Robust failover to Apify when Graph API is limited/unavailable.
    *   [ ] **Media Proxy**: Securely serve expiration-prone media URLs.

2.  **Post Management**
    *   [ ] **Auto-Categorization**: AI-based tagging of posts.
    *   [ ] **Drag-and-drop Grid**: Visual grid planner for posts.

### Phase 6: Advanced Features & AI Polish
*Focus: Taking the AI features from "working" to "magic".*

1.  **Advanced AI Chat**
    *   [ ] **Streaming Responses**: UI updates for real-time text streaming.
    *   [ ] **Function Calling**: Allow AI to actually *do* things (book appts, generate QRs).
    *   [ ] **Vector Database**: Implement RAG for larger knowledge bases (Pinecone/pgvector).

2.  **Instagram DM Automation**
    *   [ ] **Unified Inbox**: If approved for Messaging API, build a direct inbox.
    *   [ ] **Direct Auto-replies**: Reply without Manychat intermediate.

### Phase 7: Analytics & Search
1.  **Search Engine**
    *   [ ] **Command Palette (⌘K)**: Global search and navigation.
    *   [ ] **Advanced Filtering**: Saved segments and complex queries.

2.  **Analytics Dashboard**
    *   [ ] **Custom Report Builder**: Let users design their own dashboards.
    *   [ ] **Funnel Visualization**: Conversion tracking graphs.

---

## Section 3: Core "Don't Forget" Items

**1. Infrastructure & Security**
-   **Redis Layer**: Ensure `lib/cache` is used for all frequent reads.
-   **Rate Limiting**: All public endpoints (especially QR scans) must have rate limits.
-   **API Key Rotation**: Automated rotation for external integration keys.

**2. Development Guidelines**
-   **Strict Types**: No `any`. Use Zod for all validation at the API boundary.
-   **Error Handling**: Use `AppError` class and global error handler.
-   **Testing**: Write tests for "Critical Path" features (Payment, Auth, Data Loss risks).

**3. User Experience Standards**
-   **Optimistic UI**: Interfaces should feel instant.
-   **Mobile First**: All dashboards must work on phone screens.
-   **Empty States**: Every list view needs a helpful "Create your first..." empty state.
