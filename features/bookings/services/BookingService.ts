import { db } from '@/lib/db'
import { BOOKING_STATUS } from '@/config/constants'

export interface CreateBookingParams {
  adminId: string
  userId?: string
  name: string
  email?: string
  phone?: string
  serviceType: string
  scheduledAt: Date
  duration: number // in minutes
  notes?: string
  metadata?: Record<string, unknown>
}

export interface UpdateBookingParams {
  status?: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  scheduledAt?: Date
  duration?: number
  notes?: string
  metadata?: Record<string, unknown>
}

export interface BookingSlot {
  start: Date
  end: Date
  available: boolean
}

export class BookingService {
  /**
   * Create a new booking
   */
  async createBooking(params: CreateBookingParams) {
    const {
      adminId,
      userId,
      name,
      email,
      phone,
      serviceType,
      scheduledAt,
      duration,
      notes,
      metadata,
    } = params

    // Check if slot is available
    const isAvailable = await this.isSlotAvailable(
      adminId,
      scheduledAt,
      duration
    )

    if (!isAvailable) {
      throw new Error('This time slot is not available')
    }

    // Create booking
    const booking = await db.booking.create({
      data: {
        adminId,
        userId,
        name,
        email,
        phone,
        serviceType,
        scheduledAt,
        duration,
        status: BOOKING_STATUS.PENDING,
        notes,
        metadata,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
      },
    })

    return booking
  }

  /**
   * Update booking
   */
  async updateBooking(
    bookingId: string,
    adminId: string,
    params: UpdateBookingParams
  ) {
    // If updating scheduled time, check availability
    if (params.scheduledAt) {
      const booking = await db.booking.findFirst({
        where: { id: bookingId, adminId },
        select: { duration: true },
      })

      if (!booking) {
        throw new Error('Booking not found')
      }

      const duration = params.duration || booking.duration
      const isAvailable = await this.isSlotAvailable(
        adminId,
        params.scheduledAt,
        duration,
        bookingId // Exclude current booking from availability check
      )

      if (!isAvailable) {
        throw new Error('This time slot is not available')
      }
    }

    // Update booking
    const updated = await db.booking.updateMany({
      where: {
        id: bookingId,
        adminId,
      },
      data: params,
    })

    if (updated.count === 0) {
      throw new Error('Booking not found')
    }

    return { success: true }
  }

  /**
   * Cancel booking
   */
  async cancelBooking(bookingId: string, adminId: string) {
    const updated = await db.booking.updateMany({
      where: {
        id: bookingId,
        adminId,
      },
      data: {
        status: BOOKING_STATUS.CANCELLED,
        cancelledAt: new Date(),
      },
    })

    if (updated.count === 0) {
      throw new Error('Booking not found')
    }

    return { success: true }
  }

  /**
   * Get booking details
   */
  async getBooking(bookingId: string, adminId: string) {
    const booking = await db.booking.findFirst({
      where: {
        id: bookingId,
        adminId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
      },
    })

    if (!booking) {
      throw new Error('Booking not found')
    }

    return booking
  }

  /**
   * List bookings with filters
   */
  async listBookings(
    adminId: string,
    options?: {
      status?: string
      serviceType?: string
      startDate?: Date
      endDate?: Date
      userId?: string
      limit?: number
      offset?: number
    }
  ) {
    const where: any = { adminId }

    if (options?.status) {
      where.status = options.status
    }

    if (options?.serviceType) {
      where.serviceType = options.serviceType
    }

    if (options?.userId) {
      where.userId = options.userId
    }

    if (options?.startDate || options?.endDate) {
      where.scheduledAt = {}
      if (options.startDate) {
        where.scheduledAt.gte = options.startDate
      }
      if (options.endDate) {
        where.scheduledAt.lte = options.endDate
      }
    }

    const [bookings, total] = await Promise.all([
      db.booking.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
            },
          },
        },
        orderBy: { scheduledAt: 'asc' },
        take: options?.limit || 50,
        skip: options?.offset || 0,
      }),
      db.booking.count({ where }),
    ])

    return {
      bookings,
      total,
      limit: options?.limit || 50,
      offset: options?.offset || 0,
    }
  }

  /**
   * Get booking statistics
   */
  async getBookingStats(adminId: string) {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    const [total, thisMonth, byStatus, byServiceType] = await Promise.all([
      // Total bookings
      db.booking.count({ where: { adminId } }),

      // This month
      db.booking.count({
        where: {
          adminId,
          scheduledAt: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
      }),

      // By status
      db.booking.groupBy({
        by: ['status'],
        where: { adminId },
        _count: true,
      }),

      // By service type
      db.booking.groupBy({
        by: ['serviceType'],
        where: { adminId },
        _count: true,
      }),
    ])

    return {
      total,
      thisMonth,
      byStatus: byStatus.map((stat) => ({
        status: stat.status,
        count: stat._count,
      })),
      byServiceType: byServiceType.map((stat) => ({
        serviceType: stat.serviceType,
        count: stat._count,
      })),
    }
  }

  /**
   * Get available time slots for a specific date
   */
  async getAvailableSlots(
    adminId: string,
    date: Date,
    duration: number = 60,
    options?: {
      startHour?: number // Default 9
      endHour?: number // Default 17
      slotInterval?: number // Default 30 minutes
    }
  ): Promise<BookingSlot[]> {
    const startHour = options?.startHour || 9
    const endHour = options?.endHour || 17
    const slotInterval = options?.slotInterval || 30

    // Get all bookings for this date
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)

    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    const bookings = await db.booking.findMany({
      where: {
        adminId,
        scheduledAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          in: [BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED],
        },
      },
      select: {
        scheduledAt: true,
        duration: true,
      },
    })

    // Generate time slots
    const slots: BookingSlot[] = []
    const targetDate = new Date(date)

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += slotInterval) {
        const slotStart = new Date(targetDate)
        slotStart.setHours(hour, minute, 0, 0)

        const slotEnd = new Date(slotStart)
        slotEnd.setMinutes(slotEnd.getMinutes() + duration)

        // Check if this slot conflicts with any existing booking
        const hasConflict = bookings.some((booking) => {
          const bookingStart = new Date(booking.scheduledAt)
          const bookingEnd = new Date(bookingStart)
          bookingEnd.setMinutes(bookingEnd.getMinutes() + booking.duration)

          // Check overlap
          return (
            (slotStart >= bookingStart && slotStart < bookingEnd) ||
            (slotEnd > bookingStart && slotEnd <= bookingEnd) ||
            (slotStart <= bookingStart && slotEnd >= bookingEnd)
          )
        })

        slots.push({
          start: slotStart,
          end: slotEnd,
          available: !hasConflict,
        })
      }
    }

    return slots
  }

  /**
   * Check if a specific time slot is available
   */
  private async isSlotAvailable(
    adminId: string,
    scheduledAt: Date,
    duration: number,
    excludeBookingId?: string
  ): Promise<boolean> {
    const slotEnd = new Date(scheduledAt)
    slotEnd.setMinutes(slotEnd.getMinutes() + duration)

    const where: any = {
      adminId,
      status: {
        in: [BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED],
      },
    }

    if (excludeBookingId) {
      where.id = { not: excludeBookingId }
    }

    // Find any conflicting bookings
    const conflicts = await db.booking.findMany({
      where,
      select: {
        scheduledAt: true,
        duration: true,
      },
    })

    // Check for overlaps
    const hasConflict = conflicts.some((booking) => {
      const bookingStart = new Date(booking.scheduledAt)
      const bookingEnd = new Date(bookingStart)
      bookingEnd.setMinutes(bookingEnd.getMinutes() + booking.duration)

      // Check overlap
      return (
        (scheduledAt >= bookingStart && scheduledAt < bookingEnd) ||
        (slotEnd > bookingStart && slotEnd <= bookingEnd) ||
        (scheduledAt <= bookingStart && slotEnd >= bookingEnd)
      )
    })

    return !hasConflict
  }

  /**
   * Get upcoming bookings
   */
  async getUpcomingBookings(adminId: string, limit: number = 10) {
    const now = new Date()

    const bookings = await db.booking.findMany({
      where: {
        adminId,
        scheduledAt: { gte: now },
        status: {
          in: [BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED],
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
      },
      orderBy: { scheduledAt: 'asc' },
      take: limit,
    })

    return bookings
  }
}

export const bookingService = new BookingService()
