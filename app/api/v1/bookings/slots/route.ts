import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { apiResponse } from '@/lib/utils/api-response'
import { bookingService } from '@/features/bookings/services/BookingService'

/**
 * GET /api/v1/bookings/slots
 * Get available time slots for a specific date
 *
 * Query params:
 * - date (required): ISO date string
 * - duration (optional): Duration in minutes (default: 60)
 * - startHour (optional): Start hour (default: 9)
 * - endHour (optional): End hour (default: 17)
 * - slotInterval (optional): Slot interval in minutes (default: 30)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = request.nextUrl

    const dateParam = searchParams.get('date')
    if (!dateParam) {
      return apiResponse.validationError('Date parameter is required')
    }

    const date = new Date(dateParam)
    const duration = searchParams.get('duration')
      ? parseInt(searchParams.get('duration')!)
      : 60
    const startHour = searchParams.get('startHour')
      ? parseInt(searchParams.get('startHour')!)
      : undefined
    const endHour = searchParams.get('endHour')
      ? parseInt(searchParams.get('endHour')!)
      : undefined
    const slotInterval = searchParams.get('slotInterval')
      ? parseInt(searchParams.get('slotInterval')!)
      : undefined

    const slots = await bookingService.getAvailableSlots(user.id, date, duration, {
      startHour,
      endHour,
      slotInterval,
    })

    return apiResponse.success({ date: dateParam, slots })
  } catch (error) {
    return apiResponse.error(error)
  }
}
