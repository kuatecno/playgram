import { NextResponse } from 'next/server'

export interface ApiResponse<T = unknown> {
  success: boolean
  data: T | null
  error: {
    message: string
    code: number
  } | null
  meta: {
    timestamp: string
  }
}

/**
 * Standardized API response utilities
 * Ensures consistent response format across all API endpoints
 */
export const apiResponse = {
  /**
   * Success response
   */
  success<T>(data: T, statusCode = 200): NextResponse<ApiResponse<T>> {
    return NextResponse.json(
      {
        success: true,
        data,
        error: null,
        meta: {
          timestamp: new Date().toISOString(),
        },
      },
      { status: statusCode }
    )
  },

  /**
   * Error response
   */
  error(error: unknown, statusCode = 500): NextResponse<ApiResponse> {
    const message = error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          message,
          code: statusCode,
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      },
      { status: statusCode }
    )
  },

  /**
   * Not found response (404)
   */
  notFound(message = 'Resource not found'): NextResponse<ApiResponse> {
    return this.error(new Error(message), 404)
  },

  /**
   * Bad request response (400)
   */
  badRequest(message = 'Bad request'): NextResponse<ApiResponse> {
    return this.error(new Error(message), 400)
  },

  /**
   * Unauthorized response (401)
   */
  unauthorized(message = 'Unauthorized'): NextResponse<ApiResponse> {
    return this.error(new Error(message), 401)
  },

  /**
   * Forbidden response (403)
   */
  forbidden(message = 'Forbidden'): NextResponse<ApiResponse> {
    return this.error(new Error(message), 403)
  },

  /**
   * Too many requests response (429)
   */
  tooManyRequests(message = 'Too many requests'): NextResponse<ApiResponse> {
    return this.error(new Error(message), 429)
  },

  /**
   * Validation error response (422)
   */
  validationError(message = 'Validation failed'): NextResponse<ApiResponse> {
    return this.error(new Error(message), 422)
  },
}
