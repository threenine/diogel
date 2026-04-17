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

  async logException(message: string, account?: string | null, hostname?: string | null): Promise<void> {
    try {
      await db.exceptions.add({
        dateTime: new Date().toISOString(),
        message,
        account: account || null,
        hostname: hostname || null,
      });
      this.log(LogLevel.ERROR, message, { account, hostname });
    } catch (error: unknown) {
      this.log(LogLevel.ERROR, '[LogService] Failed to log exception', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async logApproval(eventKind: number | string, hostname: string, account?: string | null): Promise<void> {
    try {
      await db.approvals.add({
        dateTime: new Date().toISOString(),
        eventKind,
        hostname,
        account: account || null,
      });
      this.log(LogLevel.DEBUG, `Approval granted for kind ${eventKind} on ${hostname}`, { account });
    } catch (error: unknown) {
      this.log(LogLevel.ERROR, '[LogService] Failed to log approval', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [${level}] ${message}`;

    switch (level) {
      case LogLevel.ERROR:
        console.error(formattedMessage, context);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage, context);
        break;
      case LogLevel.INFO:
      case LogLevel.DEBUG:
        if (this.debugMode) {
          console.debug(formattedMessage, context);
        }
        break;
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

  wrapWithLogging<TArgs extends unknown[], TResult>(
    fn: (...args: TArgs) => Promise<TResult>,
    serviceName: string,
    methodName: string,
  ): (...args: TArgs) => Promise<TResult> {
    return async (...args: TArgs): Promise<TResult> => {
      this.log(LogLevel.DEBUG, `Calling ${serviceName}.${methodName}`, {
        argCount: args.length,
      });
      try {
        const result = await fn(...args);
        this.log(LogLevel.DEBUG, `${serviceName}.${methodName} completed successfully`, {
          resultType: typeof result,
        });
        return result;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        this.log(LogLevel.ERROR, `${serviceName}.${methodName} failed: ${message}`);
        void this.logException(`${serviceName}.${methodName} error: ${message}`);
        throw error;
      }
    };
  }
}

export const logService = new LogService();
