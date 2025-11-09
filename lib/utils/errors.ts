/**
 * Custom error classes for better error handling
 */

export class NotFoundError extends Error {
  statusCode = 404

  constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class ValidationError extends Error {
  statusCode = 400

  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class UnauthorizedError extends Error {
  statusCode = 401

  constructor(message = 'Unauthorized') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends Error {
  statusCode = 403

  constructor(message = 'Forbidden') {
    super(message)
    this.name = 'ForbiddenError'
  }
}

export class ConflictError extends Error {
  statusCode = 409

  constructor(message: string) {
    super(message)
    this.name = 'ConflictError'
  }
}

export class TooManyRequestsError extends Error {
  statusCode = 429

  constructor(message = 'Too many requests') {
    super(message)
    this.name = 'TooManyRequestsError'
  }
}
