import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth/session'
import { apiResponse } from '@/lib/utils/api-response'
import { bookingService } from '@/features/bookings/services/BookingService'

const createBookingSchema = z.object({
  userId: z.string().optional(),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  serviceType: z.string().min(1, 'Service type is required'),
  scheduledAt: z.string().datetime(),
  duration: z.number().int().positive().default(60),
  notes: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
})

/**
 * GET /api/v1/bookings
 * List bookings for authenticated admin
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = request.nextUrl

    const status = searchParams.get('status') || undefined
    const serviceType = searchParams.get('serviceType') || undefined
    const userId = searchParams.get('userId') || undefined
    const startDate = searchParams.get('startDate')
      ? new Date(searchParams.get('startDate')!)
      : undefined
    const endDate = searchParams.get('endDate')
      ? new Date(searchParams.get('endDate')!)
      : undefined
    const limit = searchParams.get('limit')
      ? parseInt(searchParams.get('limit')!)
      : 50
    const offset = searchParams.get('offset')
      ? parseInt(searchParams.get('offset')!)
      : 0

    const result = await bookingService.listBookings(user.id, {
      status,
      serviceType,
      userId,
      startDate,
      endDate,
      limit,
      offset,
    })

    return apiResponse.success(result)
  } catch (error) {
    return apiResponse.error(error)
  }
}

/**
 * POST /api/v1/bookings
 * Create a new booking
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()

    // Validate input
    const validated = createBookingSchema.parse(body)

    // Create booking
    const booking = await bookingService.createBooking({
      adminId: user.id,
      ...validated,
      scheduledAt: new Date(validated.scheduledAt),
    })

    return apiResponse.success(booking, 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiResponse.validationError(error.errors[0].message)
    }
    if (error instanceof Error && error.message === 'This time slot is not available') {
      return apiResponse.error(error, 400)
    }
    return apiResponse.error(error)
  }
}
