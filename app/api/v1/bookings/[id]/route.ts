import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth/session'
import { apiResponse } from '@/lib/utils/api-response'
import { bookingService } from '@/features/bookings/services/BookingService'

const updateBookingSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'completed', 'cancelled']).optional(),
  scheduledAt: z.string().datetime().optional(),
  duration: z.number().int().positive().optional(),
  notes: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
})

/**
 * GET /api/v1/bookings/:id
 * Get booking details
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params

    const booking = await bookingService.getBooking(id, user.id)

    return apiResponse.success(booking)
  } catch (error) {
    if (error instanceof Error && error.message === 'Booking not found') {
      return apiResponse.notFound('Booking not found')
    }
    return apiResponse.error(error)
  }
}

/**
 * PATCH /api/v1/bookings/:id
 * Update booking
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const body = await request.json()

    // Validate input
    const validated = updateBookingSchema.parse(body)

    // Convert scheduledAt to Date if provided
    const updateData = {
      ...validated,
      scheduledAt: validated.scheduledAt
        ? new Date(validated.scheduledAt)
        : undefined,
    }

    await bookingService.updateBooking(id, user.id, updateData)

    return apiResponse.success({ message: 'Booking updated successfully' })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiResponse.validationError(error.errors[0].message)
    }
    if (error instanceof Error && error.message === 'Booking not found') {
      return apiResponse.notFound('Booking not found')
    }
    if (error instanceof Error && error.message === 'This time slot is not available') {
      return apiResponse.error(error, 400)
    }
    return apiResponse.error(error)
  }
}

/**
 * DELETE /api/v1/bookings/:id
 * Cancel booking
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params

    await bookingService.cancelBooking(id, user.id)

    return apiResponse.success({ message: 'Booking cancelled successfully' })
  } catch (error) {
    if (error instanceof Error && error.message === 'Booking not found') {
      return apiResponse.notFound('Booking not found')
    }
    return apiResponse.error(error)
  }
}
