# Playgram v3.0

> Modern Instagram Business Management Platform

**Status**: 🚧 In Development (Phase 1)

## Overview

Playgram v3.0 is a complete ground-up rebuild designed to help businesses manage their Instagram presence with powerful tools including QR codes, booking systems, AI chat, and comprehensive social media data analytics.

### Key Features

- **QR Code Management**: Generate, validate, and track QR codes for promotions and events
- **Booking System**: Manage appointments with calendar integration
- **AI Chat**: OpenAI-powered conversations with customers
- **Social Media Data**: Cached data service for Instagram, TikTok, and Google Reviews
- **Manychat Integration**: Sync contacts, tags, and custom fields
- **Webhook System**: CRM integration with reliable delivery
- **Analytics**: Comprehensive reporting and insights
- **Instagram Verification**: Verify Instagram identity for external websites

## Tech Stack

### Core
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (strict mode)
- **Database**: PostgreSQL + Prisma ORM
- **Styling**: Tailwind CSS + shadcn/ui

### Infrastructure
- **Authentication**: NextAuth.js v5
- **Caching**: Redis (Upstash)
- **Background Jobs**: Bull/BullMQ
- **API Integration**: Apify (social media data)
- **AI**: OpenAI API

### Quality & Testing
- **Testing**: Vitest + Playwright
- **Linting**: ESLint + Prettier
- **Type Safety**: TypeScript strict mode

## Getting Started

### Prerequisites

- Node.js 18+ and npm 9+
- PostgreSQL database
- Redis server (optional for development)

### Installation

1. **Clone the repository**
   ```bash
   cd /Users/kavi/Sharedcodingprojects/Playgram
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Set up the database**
   ```bash
   # Generate Prisma client
   npm run prisma:generate

   # Push schema to database
   npm run prisma:push

   # (Optional) Seed database
   npm run prisma:seed
   ```

5. **Run development server**
   ```bash
   npm run dev
   ```

6. **Open browser**
   ```
   http://localhost:3002
   ```

## Project Structure

```
playgram/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth routes (login, signup)
│   ├── (dashboard)/       # Protected dashboard routes
│   └── api/               # API routes
├── components/            # Shared UI components
│   ├── ui/               # shadcn/ui components
│   ├── layout/           # Layout components
│   └── forms/            # Form components
├── features/              # Feature modules
│   ├── qr-codes/         # QR code feature
│   ├── bookings/         # Booking feature
│   ├── ai-chat/          # AI chat feature
│   ├── social-data/      # Social media data service
│   └── manychat/         # Manychat integration
├── lib/                   # Shared utilities
│   ├── auth/             # Authentication
│   ├── db/               # Database client
│   ├── cache/            # Caching layer
│   └── utils/            # Utilities
├── prisma/               # Database schema & migrations
├── types/                # TypeScript types
└── config/               # Configuration files
```

## Available Scripts

```bash
# Development
npm run dev              # Start dev server (port 3002)
npm run build            # Build for production
npm run start            # Start production server

# Database
npm run prisma:generate  # Generate Prisma client
npm run prisma:push      # Push schema to database
npm run prisma:studio    # Open Prisma Studio
npm run prisma:migrate   # Create migration
npm run prisma:seed      # Seed database

# Testing
npm run test             # Run unit tests
npm run test:ui          # Open test UI
npm run test:e2e         # Run E2E tests

# Code Quality
npm run lint             # Run ESLint
npm run type-check       # TypeScript type checking
```

## Environment Variables

See `.env.example` for all required environment variables.

### Required

- `DATABASE_URL`: PostgreSQL connection string
- `NEXTAUTH_SECRET`: Secret for NextAuth.js (generate with `openssl rand -base64 32`)
- `NEXTAUTH_URL`: Application URL (http://localhost:3002 for development)

### Optional

- `REDIS_URL`: Redis connection string (for caching)
- `APIFY_API_TOKEN`: Apify API token (for social media data)
- `OPENAI_API_KEY`: OpenAI API key (for AI chat)

## Development Roadmap

### ✅ Phase 1: Foundation (Current)
- [x] Project initialization
- [x] Database schema design
- [x] Basic UI framework
- [ ] Authentication setup
- [ ] Initial deployment

### 🔜 Phase 2: Apify Integration (Next)
- [ ] Apify service layer
- [ ] Multi-layer caching
- [ ] Social data API endpoints
- [ ] Cost optimization

### 📋 Phase 3: Core Features
- [ ] QR Code system
- [ ] Booking system
- [ ] AI Chat system
- [ ] Tool management

### 📋 Phase 4: Manychat & CRM
- [ ] Contact synchronization
- [ ] Webhook system
- [ ] Data export

### 📋 Phase 5-8
See [PLAYGRAM_V3_ROADMAP.md](./PLAYGRAM_V3_ROADMAP.md) for complete roadmap

## Documentation

- **[Roadmap](./PLAYGRAM_V3_ROADMAP.md)**: Complete development roadmap
- **[Architecture](./ARCHITECTURE.md)**: Code organization and patterns
- **[UI Organization](./UI_ORGANIZATION.md)**: UX design and navigation

## API Documentation

API documentation will be auto-generated using OpenAPI/Swagger (coming in Phase 8).

## Contributing

This is a private project. For questions or issues, contact the development team.

## License

Proprietary - All rights reserved

---

**Version**: 3.0.0
**Last Updated**: 2025-11-09
**Port**: 3002
# playgram
