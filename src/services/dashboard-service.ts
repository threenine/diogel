import type { ApprovalLog, ExceptionLog } from './database';
import { db } from './database';
import { get, getActive } from './dexie-storage';

export type DashboardActivityType = 'approval' | 'exception';

export interface DashboardActivityItem {
  type: DashboardActivityType;
  dateTime: string;
  message: string;
  eventKind?: number | string;
  hostname?: string | null;
}

async function resolveActiveKeyAlias(): Promise<string | undefined> {
  return await getActive();
}

async function getActiveAccountAlias(): Promise<string | undefined> {
  const alias = await resolveActiveKeyAlias();
  return alias || undefined;
}

export async function getActiveKeyCount(): Promise<number> {
  const keys = await get();
  return Object.keys(keys).length;
}

/**
 * Returns an approximation of signed events count using approval logs for the active account.
 *
 * Limitation: this is not a canonical signed-event total. It only reflects approvals recorded
 * locally by this app and can miss activity from other clients or historical events from before
 * logging was enabled.
 */
export async function getSignedEventCountForActiveKey(): Promise<number> {
  const activeAccount = await getActiveAccountAlias();
  if (!activeAccount) {
    return 0;
  }

  const approvals = await db.approvals.where('account').equals(activeAccount).toArray();
  return approvals.length;
}

export async function getConnectedRelayCountForActiveKey(): Promise<number> {
  const activeAccount = await getActiveAccountAlias();
  if (!activeAccount) {
    return 0;
  }

  const relayEntries = await db.relayCatalog.toArray();
  return relayEntries.filter((entry) => entry.status === 'online').length;
}

function toRecentApprovalActivity(log: ApprovalLog): DashboardActivityItem {
  return {
    type: 'approval',
    dateTime: log.dateTime,
    message: `Approved event kind ${String(log.eventKind)}`,
    eventKind: log.eventKind,
    hostname: log.hostname,
  };
}

function toRecentExceptionActivity(log: ExceptionLog): DashboardActivityItem {
  return {
    type: 'exception',
    dateTime: log.dateTime,
    message: log.message,
    hostname: log.hostname,
  };
}

export async function getRecentActivityForActiveKey(limit = 10): Promise<DashboardActivityItem[]> {
  if (limit <= 0) {
    return [];
  }

  const activeAccount = await getActiveAccountAlias();
  if (!activeAccount) {
    return [];
  }

  const [approvals, exceptions] = await Promise.all([
    db.approvals.where('account').equals(activeAccount).toArray(),
    db.exceptions.where('account').equals(activeAccount).toArray(),
  ]);

  return [...approvals.map(toRecentApprovalActivity), ...exceptions.map(toRecentExceptionActivity)]
    .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime())
    .slice(0, limit);
}
