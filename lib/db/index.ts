import { PrismaClient } from '@prisma/client'

const resolveDatabaseUrl = () => {
  const candidate =
    process.env.DATABASE_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    process.env.POSTGRES_URL ??
    process.env.POSTGRES_URL_NON_POOLING ??
    null

  if (!candidate) {
    throw new Error(
      'DATABASE_URL is not set. Please configure DATABASE_URL or Supabase Postgres variables (POSTGRES_PRISMA_URL / POSTGRES_URL / POSTGRES_URL_NON_POOLING).'
    )
  }

  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = candidate
  }

  if (!process.env.DIRECT_URL && process.env.POSTGRES_URL_NON_POOLING) {
    process.env.DIRECT_URL = process.env.POSTGRES_URL_NON_POOLING
  }
}

resolveDatabaseUrl()

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
