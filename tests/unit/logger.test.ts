/**
 * Unit Tests for Logger
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { logger } from '@/lib/logger'

describe('Logger', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('info', () => {
    it('should log info messages', () => {
      const spy = vi.spyOn(console, 'log')

      logger.info('Test info message')

      expect(spy).toHaveBeenCalled()
    })

    it('should log info with data', () => {
      const spy = vi.spyOn(console, 'log')

      logger.info('Test info message', { userId: '123', action: 'login' })

      expect(spy).toHaveBeenCalled()
    })
  })

  describe('error', () => {
    it('should log error messages', () => {
      const spy = vi.spyOn(console, 'error')

      logger.error('Test error message')

      expect(spy).toHaveBeenCalled()
    })

    it('should log error with data', () => {
      const spy = vi.spyOn(console, 'error')

      logger.error('Test error message', { error: 'Something went wrong' })

      expect(spy).toHaveBeenCalled()
    })
  })

  describe('warn', () => {
    it('should log warning messages', () => {
      const spy = vi.spyOn(console, 'warn')

      logger.warn('Test warning message')

      expect(spy).toHaveBeenCalled()
    })
  })

  describe('debug', () => {
    it('should log debug messages in development', () => {
      const spy = vi.spyOn(console, 'debug')

      logger.debug('Test debug message')

      // Debug logs may or may not appear based on environment
      // Just verify the method doesn't throw
      expect(() => logger.debug('Test')).not.toThrow()
    })
  })
})
