import { PrismaClient } from '@prisma/client'

const resolveDatabaseUrl = () => {
  const buildConnectionStringFromParts = () => {
    const host =
      process.env.POSTGRES_HOST ??
      process.env.SUPABASE_DB_HOST ??
      null
    const database =
      process.env.POSTGRES_DATABASE ??
      process.env.SUPABASE_DB_NAME ??
      null
    const user =
      process.env.POSTGRES_USER ??
      process.env.SUPABASE_DB_USER ??
      null
    const password =
      process.env.POSTGRES_PASSWORD ??
      process.env.SUPABASE_DB_PASSWORD ??
      null
    if (!host || !database || !user || !password) {
      return null
    }

    const port = process.env.POSTGRES_PORT ?? process.env.SUPABASE_DB_PORT ?? '5432'
    const searchParams = new URLSearchParams()
    searchParams.set('schema', process.env.POSTGRES_SCHEMA ?? 'public')
    searchParams.set('sslmode', process.env.POSTGRES_SSLMODE ?? 'require')

    return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}?${searchParams.toString()}`
  }

  const candidate =
    process.env.POSTGRES_PRISMA_URL ??
    process.env.POSTGRES_URL ??
    process.env.POSTGRES_URL_NON_POOLING ??
    buildConnectionStringFromParts()

  if (!candidate) {
    throw new Error(
      'DATABASE_URL is not set. Please configure DATABASE_URL or Supabase Postgres variables (POSTGRES_PRISMA_URL / POSTGRES_URL / POSTGRES_URL_NON_POOLING, or provide host/user/password components).'
    )
  }

  if (!process.env.DIRECT_URL) {
    const directUrl =
      process.env.POSTGRES_URL_NON_POOLING ??
      process.env.POSTGRES_PRISMA_URL ??
      buildConnectionStringFromParts()

    if (directUrl) {
      process.env.DIRECT_URL = directUrl
    }
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
