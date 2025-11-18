/**
 * Logging System
 * Provides structured logging with different levels
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogData {
  [key: string]: any
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'

  private formatMessage(level: LogLevel, message: string, data?: LogData): string {
    const timestamp = new Date().toISOString()
    const logData = data ? ` ${JSON.stringify(data, null, 2)}` : ''

    return `[${timestamp}] [${level.toUpperCase()}] ${message}${logData}`
  }

  private log(level: LogLevel, message: string, data?: LogData): void {
    const formattedMessage = this.formatMessage(level, message, data)

    // In production, you would send this to a logging service
    // For now, we'll use console with appropriate methods
    switch (level) {
      case 'error':
        console.error(formattedMessage)
        break
      case 'warn':
        console.warn(formattedMessage)
        break
      case 'debug':
        if (this.isDevelopment) {
          console.debug(formattedMessage)
        }
        break
      case 'info':
      default:
        console.log(formattedMessage)
    }

    // TODO: In production, send to logging service (e.g., Datadog, LogDNA, CloudWatch)
    // if (!this.isDevelopment) {
    //   await sendToLoggingService(level, message, data)
    // }
  }

  info(message: string, data?: LogData): void {
    this.log('info', message, data)
  }

  warn(message: string, data?: LogData): void {
    this.log('warn', message, data)
  }

  error(message: string, data?: LogData): void {
    this.log('error', message, data)
  }

  debug(message: string, data?: LogData): void {
    this.log('debug', message, data)
  }
}

// Export singleton instance
export const logger = new Logger()

export default logger
