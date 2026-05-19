import type { ApprovalLog, ExceptionLog } from './database';
import { db } from './database';
import { get, getActive } from './dexie-storage';
import { isVaultUnlocked } from './vault-service';

export type DashboardActivityType = 'approval' | 'exception';

export type DashboardActivityStatus = 'approved' | 'exception';

export interface DashboardActivityItem {
  type: DashboardActivityType;
  status: DashboardActivityStatus;
  dateTime: string;
  title: string;
  detail?: string;
  eventKind?: number | string;
  hostname?: string | null;
}

export type DashboardDataState = 'ready' | 'locked' | 'no-account';

export interface DashboardSummary {
  state: DashboardDataState;
  signedEvents: number;
  activeKeys: number;
  connectedRelays: number;
  recentActivity: DashboardActivityItem[];
}

async function getDashboardDataState(): Promise<DashboardDataState> {
  const unlocked = await isVaultUnlocked();
  if (!unlocked) {
    return 'locked';
  }

  const activeAccount = await getActiveAccountAlias();
  if (!activeAccount) {
    return 'no-account';
  }

  const keys = await get();
  if (!keys[activeAccount]) {
    return 'no-account';
  }

  return 'ready';
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
  const state = await getDashboardDataState();
  if (state !== 'ready') {
    return 0;
  }

  const activeAccount = await getActiveAccountAlias();
  if (!activeAccount) {
    return 0;
  }

  const approvals = await db.approvals.where('account').equals(activeAccount).toArray();
  return approvals.length;
}

export async function getConnectedRelayCountForActiveKey(): Promise<number> {
  const state = await getDashboardDataState();
  if (state !== 'ready') {
    return 0;
  }

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
    status: 'approved',
    dateTime: log.dateTime,
    title: 'Approval request accepted',
    detail: `Event kind ${String(log.eventKind)}`,
    eventKind: log.eventKind,
    hostname: log.hostname,
  };
}

function toRecentExceptionActivity(log: ExceptionLog): DashboardActivityItem {
  const hostname = typeof log.hostname === 'undefined' ? null : log.hostname;

  return {
    type: 'exception',
    status: 'exception',
    dateTime: log.dateTime,
    title: 'Extension exception',
    detail: log.message,
    hostname,
  };
}

export async function getRecentActivityForActiveKey(limit = 10): Promise<DashboardActivityItem[]> {
  if (limit <= 0) {
    return [];
  }

  const state = await getDashboardDataState();
  if (state !== 'ready') {
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

export async function getDashboardSummary(activityLimit = 5): Promise<DashboardSummary> {
  const state = await getDashboardDataState();
  const activeKeys = await getActiveKeyCount();

  if (state !== 'ready') {
    return {
      state,
      signedEvents: 0,
      activeKeys,
      connectedRelays: 0,
      recentActivity: [],
    };
  }

  const [signedEvents, connectedRelays, recentActivity] = await Promise.all([
    getSignedEventCountForActiveKey(),
    getConnectedRelayCountForActiveKey(),
    getRecentActivityForActiveKey(activityLimit),
  ]);

  return {
    state,
    signedEvents,
    activeKeys,
    connectedRelays,
    recentActivity,
  };
}
