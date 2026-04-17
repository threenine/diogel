import { db } from './database';

export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG',
}

export class LogService {
  private readonly debugMode: boolean;

  constructor() {
    this.debugMode = process.env.DEBUG === 'true' || process.env.NODE_ENV === 'test';
  }

  async logException(message: string, account?: string | null, hostname?: string | null) {
    try {
      await db.exceptions.add({
        dateTime: new Date().toISOString(),
        message,
        account: account || null,
        hostname: hostname || null,
      });
      console.error(`[${LogLevel.ERROR}] ${message}`, { account, hostname });
    } catch (e) {
      console.error('[LogService] Failed to log exception:', e);
    }
  }

  async logApproval(eventKind: number | string, hostname: string, account?: string | null) {
    try {
      await db.approvals.add({
        dateTime: new Date().toISOString(),
        eventKind,
        hostname,
        account: account || null,
      });
      console.log(`[${LogLevel.INFO}] Approval granted for kind ${eventKind} on ${hostname}`, { account });
    } catch (e) {
      console.error('[LogService] Failed to log approval:', e);
    }
  }

  /**
   * General purpose logging (currently to console, could be extended to DB)
   */
  log(level: LogLevel, message: string, context?: Record<string, unknown>) {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [${level}] ${message}`;

    switch (level) {
      case LogLevel.ERROR:
        console.error(formattedMessage, context);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage, context);
        break;
      case LogLevel.DEBUG:
        if (this.debugMode) {
          console.debug(formattedMessage, context);
        }
        break;
      case LogLevel.INFO:
        if (this.debugMode) {
          console.log(formattedMessage, context);
        }
        break;
      default:
        if (this.debugMode) {
          console.log(formattedMessage, context);
        }
    }
  }

  async getExceptions(account?: string | null) {
    if (account) {
      return await db.exceptions.where('account').equals(account).reverse().sortBy('dateTime');
    }
    return await db.exceptions.orderBy('dateTime').reverse().toArray();
  }

  async getApprovals(account?: string | null) {
    if (account) {
      return await db.approvals.where('account').equals(account).reverse().sortBy('dateTime');
    }
    return await db.approvals.orderBy('dateTime').reverse().toArray();
  }

  /**
   * Higher-order function to wrap an async call with logging
   */
  /* eslint-disable @typescript-eslint/no-explicit-any */
  wrapWithLogging<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    serviceName: string,
    methodName: string
  ): T {
    return (async (...args: any[]) => {
      /* eslint-enable @typescript-eslint/no-explicit-any */
      this.log(LogLevel.DEBUG, `Calling ${serviceName}.${methodName}`, { args });
      try {
        const result = await fn(...args);
        this.log(LogLevel.DEBUG, `${serviceName}.${methodName} completed successfully`, {
          result: typeof result === 'object' ? '{...}' : result,
        });
        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.log(LogLevel.ERROR, `${serviceName}.${methodName} failed: ${message}`, { error });
        // We also log it as an exception in the DB if it's an error
        void this.logException(`${serviceName}.${methodName} error: ${message}`);
        throw error;
      }
    }) as T;
  }
}

export const logService = new LogService();
