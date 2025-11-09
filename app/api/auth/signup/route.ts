import { NextRequest } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { apiResponse } from '@/lib/utils/api-response'
import { ConflictError } from '@/lib/utils/errors'

// Signup validation schema
const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    const validated = signupSchema.parse(body)

    // Check if admin already exists
    const existingAdmin = await db.admin.findUnique({
      where: { email: validated.email.toLowerCase() },
    })

    if (existingAdmin) {
      throw new ConflictError('An account with this email already exists')
    }

    // Hash password
    const passwordHash = await bcrypt.hash(validated.password, 12)

    // Create admin
    const admin = await db.admin.create({
      data: {
        email: validated.email.toLowerCase(),
        passwordHash,
        name: validated.name || null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    })

    return apiResponse.success(
      {
        message: 'Account created successfully',
        admin,
      },
      201
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiResponse.validationError(error.errors[0].message)
    }

    if (error instanceof ConflictError) {
      return apiResponse.error(error, 409)
    }

    console.error('Signup error:', error)
    return apiResponse.error(error)
  }
}
