# Playgram v3.0 - Architecture & Code Organization

> **Pragmatic architecture for simplicity, scalability, and maintainability**

## Table of Contents

1. [Architecture Philosophy](#architecture-philosophy)
2. [Project Structure](#project-structure)
3. [Layer Architecture](#layer-architecture)
4. [Design Patterns](#design-patterns)
5. [Coding Principles](#coding-principles)
6. [Scalability Strategy](#scalability-strategy)
7. [Code Examples](#code-examples)

---

## Architecture Philosophy

### Core Principles

**1. Simplicity First**
- Start simple, add complexity only when needed
- Avoid over-engineering
- Clear is better than clever

**2. Progressive Enhancement**
- Core features use simple patterns
- Complex features get advanced patterns (services, repositories)
- Don't force unnecessary abstractions

**3. Developer Happiness**
- Easy to find code (predictable structure)
- Easy to add features (clear patterns)
- Easy to debug (good logging, error handling)

**4. Scalability Built-in**
- Designed for growth
- Can handle 1,000+ concurrent users
- Easy to add background workers, caching layers

---

## Project Structure

### Hybrid Feature-Based Architecture

We use a **hybrid approach**: Shared infrastructure + Feature modules

```
playgram/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Auth routes (login, signup)
│   │   ├── (dashboard)/       # Dashboard routes (protected)
│   │   ├── api/               # API routes
│   │   │   ├── v1/           # Versioned APIs
│   │   │   │   └── social/   # Social media data API
│   │   │   ├── qr/           # QR code endpoints
│   │   │   ├── bookings/     # Booking endpoints
│   │   │   ├── ai/           # AI chat endpoints
│   │   │   └── webhooks/     # Webhook endpoints
│   │   ├── layout.tsx        # Root layout
│   │   └── page.tsx          # Landing page
│   │
│   ├── features/              # Feature modules (complex features)
│   │   ├── qr-codes/
│   │   │   ├── components/   # QR-specific components
│   │   │   ├── services/     # QRCodeService, QRValidationService
│   │   │   ├── hooks/        # useQRCode, useQRAnalytics
│   │   │   ├── types/        # QR-specific types
│   │   │   ├── utils/        # QR-specific utilities
│   │   │   └── index.ts      # Public API
│   │   │
│   │   ├── bookings/
│   │   │   ├── components/
│   │   │   ├── services/     # BookingService, AvailabilityService
│   │   │   ├── hooks/
│   │   │   ├── types/
│   │   │   └── index.ts
│   │   │
│   │   ├── ai-chat/
│   │   ├── social-data/      # Flowkick social data service
│   │   ├── manychat/         # Manychat integration
│   │   ├── webhooks/
│   │   └── analytics/
│   │
│   ├── components/            # Shared UI components
│   │   ├── ui/               # shadcn/ui components
│   │   ├── layout/           # Layout components (Sidebar, Header)
│   │   ├── forms/            # Reusable form components
│   │   ├── tables/           # Reusable table components
│   │   └── charts/           # Chart components
│   │
│   ├── lib/                   # Shared infrastructure
│   │   ├── auth/             # Authentication (NextAuth config)
│   │   ├── db/               # Database (Prisma client, connection)
│   │   ├── cache/            # Caching layer (Redis, memory cache)
│   │   ├── queue/            # Background jobs (Bull/BullMQ)
│   │   ├── apify/            # Apify integration
│   │   ├── email/            # Email service (SendGrid)
│   │   ├── logger/           # Logging (Winston/Pino)
│   │   ├── monitoring/       # Error tracking (Sentry)
│   │   └── utils/            # Shared utilities
│   │
│   ├── types/                 # Shared TypeScript types
│   │   ├── api.ts            # API response types
│   │   ├── database.ts       # Database types (from Prisma)
│   │   └── global.ts         # Global types
│   │
│   ├── config/                # Configuration
│   │   ├── constants.ts      # App constants
│   │   ├── env.ts            # Environment validation (Zod)
│   │   └── features.ts       # Feature flags
│   │
│   └── middleware.ts          # Next.js middleware (auth, rate limiting)
│
├── prisma/
│   ├── schema.prisma         # Database schema
│   ├── migrations/           # Database migrations
│   └── seed.ts               # Seed data
│
├── tests/
│   ├── unit/                 # Unit tests
│   ├── integration/          # Integration tests
│   └── e2e/                  # End-to-end tests (Playwright)
│
├── public/                   # Static assets
├── .env.example              # Environment variables template
├── .eslintrc.json            # ESLint config
├── .prettierrc               # Prettier config
├── next.config.js            # Next.js config
├── tailwind.config.ts        # Tailwind config
├── tsconfig.json             # TypeScript config
└── package.json
```

---

## Layer Architecture

### 1. Presentation Layer (React Components)

**Location**: `src/app/` (pages) and `src/components/` or `src/features/*/components/`

**Responsibility**: UI, user interaction, display logic

**Rules**:
- Components should be "dumb" (minimal logic)
- Use hooks for state and side effects
- Delegate business logic to services
- Use TypeScript for props

**Example**:
```typescript
// src/features/qr-codes/components/QRCodeGenerator.tsx
export function QRCodeGenerator() {
  const { generateQR, isLoading } = useQRCode()

  return (
    <Form onSubmit={handleSubmit}>
      {/* UI only - no business logic */}
    </Form>
  )
}
```

---

### 2. Business Logic Layer (Services)

**Location**: `src/features/*/services/` or `src/lib/services/`

**Responsibility**: Business rules, validation, orchestration

**Rules**:
- One service per domain (QRCodeService, BookingService)
- Services are stateless (pure functions or classes)
- Handle errors and return typed results
- Use dependency injection for testability

**Example**:
```typescript
// src/features/qr-codes/services/QRCodeService.ts
export class QRCodeService {
  async generateQRCode(params: GenerateQRParams): Promise<QRCode> {
    // 1. Validate input
    const validated = GenerateQRSchema.parse(params)

    // 2. Business logic
    const code = this.generateUniqueCode(validated)

    // 3. Save to database
    const qrCode = await db.qRCode.create({ data: { ... } })

    // 4. Cache
    await cache.set(`qr:${code}`, qrCode, TTL.ONE_DAY)

    // 5. Emit event
    await eventBus.emit('qr.generated', qrCode)

    return qrCode
  }

  private generateUniqueCode(params: ValidatedParams): string {
    // Format: {PREFIX}-{USER_ID}-{RANDOM}
    return `${params.prefix}-${params.userId}-${randomString(6)}`
  }
}
```

---

### 3. Data Access Layer (Repositories)

**Location**: `src/features/*/repositories/` (optional, only for complex features)

**Responsibility**: Database queries, caching

**Rules**:
- Abstract database operations
- Handle caching transparently
- Return domain models (not raw DB records)

**When to use**: Complex features with many database operations

**Example**:
```typescript
// src/features/qr-codes/repositories/QRCodeRepository.ts
export class QRCodeRepository {
  async findByCode(code: string): Promise<QRCode | null> {
    // Try cache first
    const cached = await cache.get(`qr:${code}`)
    if (cached) return cached

    // Fetch from DB
    const qrCode = await db.qRCode.findUnique({ where: { code } })

    // Cache result
    if (qrCode) {
      await cache.set(`qr:${code}`, qrCode, TTL.ONE_DAY)
    }

    return qrCode
  }
}
```

**For simple features**: Skip repositories, use Prisma directly in services

---

### 4. API Layer (Route Handlers)

**Location**: `src/app/api/`

**Responsibility**: HTTP handling, validation, response formatting

**Rules**:
- Thin layer (delegate to services)
- Validate input with Zod
- Standardized response format
- Error handling

**Example**:
```typescript
// src/app/api/qr/generate/route.ts
export async function POST(request: Request) {
  try {
    // 1. Parse and validate
    const body = await request.json()
    const params = GenerateQRSchema.parse(body)

    // 2. Delegate to service
    const qrCodeService = new QRCodeService()
    const qrCode = await qrCodeService.generateQRCode(params)

    // 3. Return standardized response
    return apiResponse.success(qrCode, 201)
  } catch (error) {
    return apiResponse.error(error)
  }
}
```

---

## Design Patterns

### 1. Service Pattern (for Business Logic)

**When**: All features with business logic

**Why**: Separates business logic from UI and data access

```typescript
class BookingService {
  async createBooking(params: CreateBookingParams) {
    // Business logic here
  }
}
```

---

### 2. Repository Pattern (Optional - for Complex Features)

**When**: Features with complex database operations

**Why**: Abstracts data access, enables caching

```typescript
class UserRepository {
  async findById(id: string) { /* ... */ }
  async findByEmail(email: string) { /* ... */ }
}
```

---

### 3. Factory Pattern (for Object Creation)

**When**: Complex object creation

```typescript
class QRCodeFactory {
  static create(type: 'promotion' | 'validation', params: any) {
    switch (type) {
      case 'promotion': return new PromotionQRCode(params)
      case 'validation': return new ValidationQRCode(params)
    }
  }
}
```

---

### 4. Strategy Pattern (for Algorithms)

**When**: Multiple ways to do something

```typescript
interface CacheStrategy {
  get(key: string): Promise<any>
  set(key: string, value: any, ttl: number): Promise<void>
}

class MemoryCacheStrategy implements CacheStrategy { /* ... */ }
class RedisCacheStrategy implements CacheStrategy { /* ... */ }
```

---

### 5. Observer Pattern (for Events)

**When**: Decoupling features (webhooks, notifications)

```typescript
// Event emitter
eventBus.emit('booking.created', booking)

// Event listeners
eventBus.on('booking.created', async (booking) => {
  await webhookService.notify('booking.created', booking)
  await emailService.sendConfirmation(booking)
})
```

---

## Coding Principles

### 1. SOLID Principles (Simplified)

**S - Single Responsibility**
- One class/function does one thing
- Easy to name (if hard to name, it's doing too much)

**O - Open/Closed**
- Open for extension, closed for modification
- Use interfaces and strategies

**L - Liskov Substitution**
- Subtypes should be replaceable
- Use interfaces

**I - Interface Segregation**
- Small, focused interfaces
- Don't force unnecessary methods

**D - Dependency Inversion**
- Depend on abstractions, not implementations
- Use dependency injection

---

### 2. DRY (Don't Repeat Yourself)

**Bad**:
```typescript
// Duplicated validation
const email1 = params.email?.toLowerCase().trim()
const email2 = user.email?.toLowerCase().trim()
```

**Good**:
```typescript
// Extracted utility
const normalizeEmail = (email: string) => email.toLowerCase().trim()
const email1 = normalizeEmail(params.email)
const email2 = normalizeEmail(user.email)
```

---

### 3. KISS (Keep It Simple, Stupid)

**Bad** (over-engineered):
```typescript
class AbstractQRCodeGeneratorFactoryBuilder {
  // 200 lines of abstraction
}
```

**Good** (simple):
```typescript
function generateQRCode(code: string): string {
  return qrcode.generate(code)
}
```

---

### 4. YAGNI (You Aren't Gonna Need It)

Don't build features you don't need yet.

**Bad**:
```typescript
// Building for future multi-tenancy we don't have yet
class QRCodeService {
  constructor(
    private tenantResolver: TenantResolver,
    private featureFlagService: FeatureFlagService,
    private cacheInvalidator: CacheInvalidator,
    // ... 10 more dependencies we don't use
  ) {}
}
```

**Good**:
```typescript
// Build what you need now
class QRCodeService {
  async generateQRCode(params: GenerateQRParams) {
    // Simple implementation
  }
}
```

---

### 5. Type Safety

**Always use TypeScript types**:
```typescript
// ❌ Bad
function createBooking(data: any) { /* ... */ }

// ✅ Good
interface CreateBookingParams {
  userId: string
  toolId: string
  date: Date
  startTime: string
}

function createBooking(params: CreateBookingParams) { /* ... */ }
```

---

### 6. Error Handling

**Use consistent error handling**:
```typescript
// Define custom errors
class NotFoundError extends Error {
  statusCode = 404
}

class ValidationError extends Error {
  statusCode = 400
}

// Service throws specific errors
async function getQRCode(code: string) {
  const qr = await db.qRCode.findUnique({ where: { code } })
  if (!qr) throw new NotFoundError('QR code not found')
  return qr
}

// API handler catches and formats
try {
  const qr = await getQRCode(code)
  return apiResponse.success(qr)
} catch (error) {
  if (error instanceof NotFoundError) {
    return apiResponse.notFound(error.message)
  }
  return apiResponse.error(error)
}
```

---

### 7. Logging & Monitoring

**Log important events**:
```typescript
import { logger } from '@/lib/logger'

async function createBooking(params: CreateBookingParams) {
  logger.info('Creating booking', { params })

  try {
    const booking = await db.booking.create({ data: params })
    logger.info('Booking created', { bookingId: booking.id })
    return booking
  } catch (error) {
    logger.error('Failed to create booking', { error, params })
    throw error
  }
}
```

---

## Scalability Strategy

### 1. Caching (Multi-Layer)

**Memory → Redis → Database → Source**

```typescript
class CacheService {
  private memory = new Map()

  async get(key: string) {
    // 1. Check memory (fastest)
    if (this.memory.has(key)) {
      return this.memory.get(key)
    }

    // 2. Check Redis (fast)
    const cached = await redis.get(key)
    if (cached) {
      this.memory.set(key, cached) // Promote to memory
      return cached
    }

    // 3. Check database
    const dbValue = await db.cache.findUnique({ where: { key } })
    if (dbValue) {
      await redis.set(key, dbValue.value, 'EX', 300) // Cache in Redis
      this.memory.set(key, dbValue.value) // Cache in memory
      return dbValue.value
    }

    return null
  }
}
```

---

### 2. Background Jobs (Async Processing)

**Use Bull/BullMQ for heavy operations**:

```typescript
import { Queue } from 'bull'

const webhookQueue = new Queue('webhooks', process.env.REDIS_URL)

// API handler (fast response)
export async function POST(request: Request) {
  const webhook = await db.webhook.create({ data: ... })

  // Queue for background processing
  await webhookQueue.add('send-webhook', { webhookId: webhook.id })

  return apiResponse.success({ message: 'Webhook queued' })
}

// Worker (processes in background)
webhookQueue.process('send-webhook', async (job) => {
  const { webhookId } = job.data
  await webhookService.send(webhookId)
})
```

---

### 3. Database Optimization

**Proper indexes**:
```prisma
model User {
  id          String @id @default(cuid())
  email       String @unique
  manychatId  String @unique
  igUsername  String?
  createdAt   DateTime @default(now())

  // Indexes for frequently queried fields
  @@index([manychatId])
  @@index([igUsername])
  @@index([createdAt])
}
```

**Avoid N+1 queries**:
```typescript
// ❌ Bad (N+1 query)
const users = await db.user.findMany()
for (const user of users) {
  user.tags = await db.tag.findMany({ where: { userId: user.id } })
}

// ✅ Good (eager loading)
const users = await db.user.findMany({
  include: { tags: true }
})
```

---

### 4. API Rate Limiting

```typescript
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'), // 10 requests per 10 seconds
})

export async function POST(request: Request) {
  const { success } = await ratelimit.limit(request.ip)

  if (!success) {
    return apiResponse.tooManyRequests()
  }

  // Process request
}
```

---

### 5. Horizontal Scaling

**Design for multiple instances**:
- Use Redis for shared cache (not in-memory)
- Use database for session storage (not in-memory)
- Use message queues for cross-instance communication

---

## Code Examples

### Example 1: Simple Feature (No Repository)

**QR Code Generation (uses Prisma directly)**:

```typescript
// src/features/qr-codes/services/QRCodeService.ts
import { db } from '@/lib/db'
import { cache } from '@/lib/cache'
import { GenerateQRSchema } from './schemas'
import { randomString } from '@/lib/utils'

export class QRCodeService {
  async generateQRCode(params: unknown) {
    // 1. Validate
    const validated = GenerateQRSchema.parse(params)

    // 2. Generate unique code
    const code = `${validated.prefix}-${validated.userId}-${randomString(6)}`

    // 3. Save to DB (no repository - direct Prisma)
    const qrCode = await db.qRCode.create({
      data: {
        code,
        qrType: validated.type,
        userId: validated.userId,
        toolId: validated.toolId,
        metadata: validated.metadata,
        expiresAt: validated.expiresAt,
      },
    })

    // 4. Cache
    await cache.set(`qr:${code}`, qrCode, 86400) // 24 hours

    // 5. Track analytics
    await db.qRAnalytics.create({
      data: { qrCodeId: qrCode.id, event: 'generated' }
    })

    return qrCode
  }

  async validateQRCode(code: string) {
    // Check cache first
    let qrCode = await cache.get(`qr:${code}`)

    if (!qrCode) {
      // Cache miss - fetch from DB
      qrCode = await db.qRCode.findUnique({ where: { code } })
      if (qrCode) {
        await cache.set(`qr:${code}`, qrCode, 86400)
      }
    }

    if (!qrCode) {
      throw new NotFoundError('QR code not found')
    }

    if (qrCode.expiresAt && qrCode.expiresAt < new Date()) {
      throw new ValidationError('QR code expired')
    }

    // Update scan count
    await db.qRCode.update({
      where: { id: qrCode.id },
      data: { scanCount: { increment: 1 }, scannedAt: new Date() }
    })

    return qrCode
  }
}
```

---

### Example 2: Complex Feature (With Repository)

**User Management (with repository for caching)**:

```typescript
// src/features/users/repositories/UserRepository.ts
export class UserRepository {
  async findById(id: string) {
    const cached = await cache.get(`user:${id}`)
    if (cached) return cached

    const user = await db.user.findUnique({
      where: { id },
      include: { tags: true, customFields: true }
    })

    if (user) {
      await cache.set(`user:${id}`, user, 3600) // 1 hour
    }

    return user
  }

  async findByManychatId(manychatId: string) {
    const cached = await cache.get(`user:manychat:${manychatId}`)
    if (cached) return cached

    const user = await db.user.findUnique({
      where: { manychatId },
      include: { tags: true }
    })

    if (user) {
      await cache.set(`user:manychat:${manychatId}`, user, 3600)
      await cache.set(`user:${user.id}`, user, 3600) // Cache by ID too
    }

    return user
  }
}

// src/features/users/services/UserService.ts
export class UserService {
  constructor(private userRepo: UserRepository) {}

  async syncFromManychat(manychatId: string) {
    // 1. Fetch from Manychat API
    const manychatUser = await manychatApi.getSubscriber(manychatId)

    // 2. Upsert user
    const user = await db.user.upsert({
      where: { manychatId },
      update: {
        firstName: manychatUser.first_name,
        lastName: manychatUser.last_name,
        igUsername: manychatUser.ig_username,
        lastInteraction: new Date(),
      },
      create: {
        manychatId,
        firstName: manychatUser.first_name,
        lastName: manychatUser.last_name,
        igUsername: manychatUser.ig_username,
      },
    })

    // 3. Invalidate cache
    await cache.delete(`user:${user.id}`)
    await cache.delete(`user:manychat:${manychatId}`)

    // 4. Emit event
    eventBus.emit('user.synced', user)

    return user
  }
}
```

---

### Example 3: API Route with Standardized Response

```typescript
// src/lib/api/response.ts
export const apiResponse = {
  success: (data: any, statusCode = 200) => {
    return NextResponse.json({
      success: true,
      data,
      error: null,
      meta: { timestamp: new Date().toISOString() }
    }, { status: statusCode })
  },

  error: (error: unknown, statusCode = 500) => {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({
      success: false,
      data: null,
      error: { message, code: statusCode },
      meta: { timestamp: new Date().toISOString() }
    }, { status: statusCode })
  },

  notFound: (message = 'Resource not found') => {
    return apiResponse.error(new Error(message), 404)
  },

  badRequest: (message = 'Bad request') => {
    return apiResponse.error(new Error(message), 400)
  },

  tooManyRequests: () => {
    return apiResponse.error(new Error('Too many requests'), 429)
  },
}

// src/app/api/qr/[code]/route.ts
export async function GET(
  request: Request,
  { params }: { params: { code: string } }
) {
  try {
    const qrCodeService = new QRCodeService()
    const qrCode = await qrCodeService.getByCode(params.code)

    return apiResponse.success(qrCode)
  } catch (error) {
    if (error instanceof NotFoundError) {
      return apiResponse.notFound(error.message)
    }
    return apiResponse.error(error)
  }
}
```

---

## Summary: Architecture Decision Tree

```
┌─ Need to build a feature? ─────────────────────────────┐
│                                                         │
│  1. Is it simple (< 5 files)?                         │
│     YES → Use direct Prisma + simple service           │
│     NO  → Continue to 2                                │
│                                                         │
│  2. Does it have complex database queries?             │
│     YES → Use Repository pattern                       │
│     NO  → Use Service pattern only                     │
│                                                         │
│  3. Does it need caching?                              │
│     YES → Implement in Repository or Service           │
│     NO  → Skip caching                                 │
│                                                         │
│  4. Does it need background processing?                │
│     YES → Use Bull/BullMQ queue                        │
│     NO  → Handle in API route                          │
│                                                         │
│  5. Does it emit events for other features?            │
│     YES → Use EventBus/Observer pattern                │
│     NO  → Direct calls are fine                        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Next Steps

1. Read [UI_ORGANIZATION.md](./UI_ORGANIZATION.md) for end-user UI/UX organization
2. Read [PLAYGRAM_V3_ROADMAP.md](./PLAYGRAM_V3_ROADMAP.md) for implementation plan
3. Start with Phase 1: Foundation setup

---

**Last Updated**: 2025-11-09
**Status**: Architecture Guidelines Approved
