import { db } from './database';

export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG',
}

type LogContext = Record<string, unknown>;

type PersistedLogAccount = string | null;

type PersistedLogHostname = string | null;

export class LogService {
  private readonly debugMode: boolean;

  constructor() {
    this.debugMode = process.env.DEBUG === 'true' || process.env.NODE_ENV === 'test';
  }

  private normalizeNullableString(value?: string | null): string | null {
    return value ?? null;
  }

  private shouldEmit(level: LogLevel): boolean {
    if (level === LogLevel.DEBUG) {
      return this.debugMode;
    }

    if (level === LogLevel.INFO) {
      return this.debugMode;
    }

    return true;
  }

  private write(level: LogLevel, formattedMessage: string, context?: LogContext): void {
    switch (level) {
      case LogLevel.ERROR:
        console.error(formattedMessage, context);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage, context);
        break;
      case LogLevel.INFO:
        console.info(formattedMessage, context);
        break;
      case LogLevel.DEBUG:
        console.debug(formattedMessage, context);
        break;
    }
  }

  async logException(message: string, account?: string | null, hostname?: string | null): Promise<void> {
    const persistedAccount: PersistedLogAccount = this.normalizeNullableString(account);
    const persistedHostname: PersistedLogHostname = this.normalizeNullableString(hostname);

    try {
      await db.exceptions.add({
        dateTime: new Date().toISOString(),
        message,
        account: persistedAccount,
        hostname: persistedHostname,
      });
      this.log(LogLevel.ERROR, message, {
        account: persistedAccount,
        hostname: persistedHostname,
      });
    } catch (error: unknown) {
      this.log(LogLevel.ERROR, '[LogService] Failed to log exception', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async logApproval(eventKind: number | string, hostname: string, account?: string | null): Promise<void> {
    const persistedAccount: PersistedLogAccount = this.normalizeNullableString(account);

    try {
      await db.approvals.add({
        dateTime: new Date().toISOString(),
        eventKind,
        hostname,
        account: persistedAccount,
      });
      this.log(LogLevel.DEBUG, `Approval granted for kind ${eventKind} on ${hostname}`, {
        account: persistedAccount,
      });
    } catch (error: unknown) {
      this.log(LogLevel.ERROR, '[LogService] Failed to log approval', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  log(level: LogLevel, message: string, context?: LogContext): void {
    if (!this.shouldEmit(level)) {
      return;
    }

    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [${level}] ${message}`;
    this.write(level, formattedMessage, context);
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
