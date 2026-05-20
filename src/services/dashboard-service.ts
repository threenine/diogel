import type { ApprovalLog, ExceptionLog } from './database';
import { db } from './database';
import { get, getActive } from './dexie-storage';
import { parseRelayListEvent, normalizeAndDeduplicateRelays } from './relay-discovery';
import useSettingsStore from 'src/stores/settings-store';
import { SimplePool } from 'nostr-tools';
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
  accountAlias?: string;
  accountNpub?: string;
}

export type DashboardDataState = 'ready' | 'locked' | 'no-account';
export type ConnectedRelaysDataState = 'ready' | 'unavailable';

export interface DashboardSummary {
  state: DashboardDataState;
  signedEvents: number;
  activeKeys: number;
  connectedRelays: number;
  connectedRelaysState: ConnectedRelaysDataState;
  recentActivity: DashboardActivityItem[];
}

const relayMetadataPool = new SimplePool();

async function getKind10002RelayCount(pubkey: string): Promise<number | null> {
  const settingsStore = useSettingsStore();
  if (settingsStore.fallbackRelays.length === 0) {
    await settingsStore.getSettings();
  }

  const relays = settingsStore.fallbackRelays;
  if (relays.length === 0) {
    // Without relay endpoints we cannot fetch kind 10002 relay-list metadata for this account.
    return null;
  }

  try {
    const event = await relayMetadataPool.get(relays, {
      kinds: [10002],
      authors: [pubkey],
    });

    if (!event) {
      return null;
    }

    const relayUrls = parseRelayListEvent(event);
    return normalizeAndDeduplicateRelays(relayUrls).length;
  } catch {
    return null;
  }
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
  const relaySummary = await getConnectedRelaySummaryForActiveKey();
  return relaySummary.count;
}

export async function getConnectedRelaySummaryForActiveKey(): Promise<{
  count: number;
  state: ConnectedRelaysDataState;
}> {
  const state = await getDashboardDataState();
  if (state !== 'ready') {
    return { count: 0, state: 'unavailable' };
  }

  const activeAccount = await getActiveAccountAlias();
  if (!activeAccount) {
    return { count: 0, state: 'unavailable' };
  }

  const keys = await get();
  const activeKey = keys[activeAccount];
  if (!activeKey?.id) {
    return { count: 0, state: 'unavailable' };
  }

  const count = await getKind10002RelayCount(activeKey.id);
  if (count === null) {
    return { count: 0, state: 'unavailable' };
  }

  return { count, state: 'ready' };
}

function toRecentApprovalActivity(
  log: ApprovalLog,
  accountAlias: string,
  accountNpub?: string,
): DashboardActivityItem {
  return {
    type: 'approval',
    status: 'approved',
    dateTime: log.dateTime,
    title: 'Approval request accepted',
    detail: `Event kind ${String(log.eventKind)}`,
    eventKind: log.eventKind,
    hostname: log.hostname,
    accountAlias,
    ...(accountNpub ? { accountNpub } : {}),
  };
}

function toRecentExceptionActivity(
  log: ExceptionLog,
  accountAlias: string,
  accountNpub?: string,
): DashboardActivityItem {
  const hostname = typeof log.hostname === 'undefined' ? null : log.hostname;

  return {
    type: 'exception',
    status: 'exception',
    dateTime: log.dateTime,
    title: 'Extension exception',
    detail: log.message,
    hostname,
    accountAlias,
    ...(accountNpub ? { accountNpub } : {}),
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

  const keys = await get();
  const activeKey = keys[activeAccount];

  const [approvals, exceptions] = await Promise.all([
    db.approvals.where('account').equals(activeAccount).toArray(),
    db.exceptions.where('account').equals(activeAccount).toArray(),
  ]);

  return [
    ...approvals.map((log) => toRecentApprovalActivity(log, activeAccount, activeKey?.id)),
    ...exceptions.map((log) => toRecentExceptionActivity(log, activeAccount, activeKey?.id)),
  ]
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
      connectedRelaysState: 'unavailable',
      recentActivity: [],
    };
  }

  const [signedEvents, connectedRelaysSummary, recentActivity] = await Promise.all([
    getSignedEventCountForActiveKey(),
    getConnectedRelaySummaryForActiveKey(),
    getRecentActivityForActiveKey(activityLimit),
  ]);

  return {
    state,
    signedEvents,
    activeKeys,
    connectedRelays: connectedRelaysSummary.count,
    connectedRelaysState: connectedRelaysSummary.state,
    recentActivity,
  };
}
