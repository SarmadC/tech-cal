// src/utils/logger.ts

/**
 * Simple logging utility for the application
 * - DEBUG level only shows in development
 * - INFO, WARN, ERROR always show
 */

const isDev = process.env.NODE_ENV === 'development';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

class Logger {
  private minLevel: LogLevel;

  constructor() {
    // In production, suppress DEBUG logs entirely
    this.minLevel = isDev ? LogLevel.DEBUG : LogLevel.INFO;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.minLevel;
  }

  private formatMessage(level: string, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] ${message}`;
  }

  /**
   * Debug-level logging (development only)
   * Use for detailed debugging information
   */
  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(this.formatMessage('DEBUG', message), ...args);
    }
  }

  /**
   * Info-level logging (always shown)
   * Use for important operational information
   */
  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(this.formatMessage('INFO', message), ...args);
    }
  }

  /**
   * Warning-level logging (always shown)
   * Use for non-critical issues
   */
  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage('WARN', message), ...args);
    }
  }

  /**
   * Error-level logging (always shown)
   * Use for errors that need attention
   */
  error(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(this.formatMessage('ERROR', message), ...args);
    }
  }
}

// Create a singleton logger instance
export const logger = new Logger();

// Export individual methods for convenience
export const { debug, info, warn, error } = logger;

// Check if we're in development mode
export const isDevMode = isDev;
