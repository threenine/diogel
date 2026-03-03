import { db } from './database';

export class LogService {
  async logException(message: string, account?: string | null) {
    try {
      await db.exceptions.add({
        dateTime: new Date().toISOString(),
        message,
        account: account || null,
      });
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
    } catch (e) {
      console.error('[LogService] Failed to log approval:', e);
    }
  }

  async getExceptions(account?: string | null) {
    if (account) {
      return await db.exceptions
        .where('account')
        .equals(account)
        .reverse()
        .sortBy('dateTime');
    }
    return await db.exceptions.orderBy('dateTime').reverse().toArray();
  }

  async getApprovals(account?: string | null) {
    if (account) {
      return await db.approvals
        .where('account')
        .equals(account)
        .reverse()
        .sortBy('dateTime');
    }
    return await db.approvals.orderBy('dateTime').reverse().toArray();
  }
}

export const logService = new LogService();
