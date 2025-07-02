/**
 * Garden DX - Production-Ready Logging Utility
 * DEPLOYMENT_ERROR_PREVENTION_RULES.md準拠
 * Created by: Claude Code (ESLint Error Fix)
 * Date: 2025-07-02
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: Date;
  context?: string;
}

class Logger {
  private isDevelopment = import.meta.env.DEV;
  
  private log(level: LogLevel, message: string, data?: any, context?: string): void {
    const entry: LogEntry = {
      level,
      message,
      data,
      timestamp: new Date(),
      context
    };

    // In development, still use console for debugging
    if (this.isDevelopment) {
      const consoleMethod = level === LogLevel.ERROR ? 'error' : 
                           level === LogLevel.WARN ? 'warn' : 
                           'log';
      console[consoleMethod](`[${context || 'App'}]`, message, data);
    }

    // Send to monitoring service in production
    if (level === LogLevel.ERROR || level === LogLevel.WARN) {
      this.sendToMonitoring(entry);
    }
  }

  private sendToMonitoring(entry: LogEntry): void {
    // In production, integrate with error tracking service
    // Example: Sentry.captureException(entry.data);
    if (!this.isDevelopment && typeof window !== 'undefined') {
      // Store critical errors for later reporting
      try {
        const existingLogs = localStorage.getItem('garden_error_logs');
        const logs = existingLogs ? JSON.parse(existingLogs) : [];
        logs.push(entry);
        
        // Keep only last 50 errors
        if (logs.length > 50) {
          logs.splice(0, logs.length - 50);
        }
        
        localStorage.setItem('garden_error_logs', JSON.stringify(logs));
      } catch (storageError) {
        // Ignore storage errors to prevent infinite loops
      }
    }
  }

  debug(message: string, data?: any, context?: string): void {
    this.log(LogLevel.DEBUG, message, data, context);
  }

  info(message: string, data?: any, context?: string): void {
    this.log(LogLevel.INFO, message, data, context);
  }

  warn(message: string, data?: any, context?: string): void {
    this.log(LogLevel.WARN, message, data, context);
  }

  error(message: string, error?: any, context?: string): void {
    this.log(LogLevel.ERROR, message, error, context);
  }
}

export const logger = new Logger();
export default logger;