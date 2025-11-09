import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { apiResponse } from '@/lib/utils/api-response'
import { bookingService } from '@/features/bookings/services/BookingService'

/**
 * GET /api/v1/bookings/stats
 * Get booking statistics for authenticated admin
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()

    const stats = await bookingService.getBookingStats(user.id)

    return apiResponse.success(stats)
  } catch (error) {
    return apiResponse.error(error)
  }
}
