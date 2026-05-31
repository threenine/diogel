import { get, getActive } from './dexie-storage';
import {
  parseRelayListEvent,
  normalizeAndDeduplicateRelays,
  fetchAccountRelayListEvent,
} from './relay-discovery';
import useSettingsStore from 'src/stores/settings-store';
import type { Event } from 'nostr-tools';
import { isVaultUnlocked } from './vault-service';
import { useEventService } from 'src/composables/useEventService';
import type { DashboardSummary } from 'src/types';

export type DashboardActivityType = 'approval' | 'exception' | 'event';

export type DashboardActivityStatus = 'approved' | 'exception' | 'rejected' | 'signed';

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


async function getKind10002RelayCount(pubkey: string): Promise<number | null> {
  const event = await fetchAccountRelayListEvent(pubkey);

  if (!event) {
    return null;
  }

  const relayUrls = parseRelayListEvent(event);
  return normalizeAndDeduplicateRelays(relayUrls).length;
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

  const activeAccount = await getActiveAccountAlias();
  if (!activeAccount) {
    return 0;
  }

  const keys = await get();
  const activeKey = keys[activeAccount];
  if (!activeKey?.id) {
    return 0;
  }

  const settingsStore = useSettingsStore();
  const relays = await settingsStore.getFallbackRelays();

  if (relays.length === 0) {
    return 0;
  }

  const filter = {
    authors: [activeKey.id],
  };
  const { getEvents, close } = useEventService(relays);
  try {
    const events = await getEvents(filter);
    return events.length;
  } finally {
    close();
  }
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

function fromNostrEventToActivityItem(
  event: Event,
  accountAlias: string,
  accountNpub?: string,
): DashboardActivityItem {
  return {
    type: 'event',
    status: 'signed',
    dateTime: new Date(event.created_at * 1000).toISOString(),
    title: 'Signed event',
    detail: `Event kind ${String(event.kind)}`,
    eventKind: event.kind,
    accountAlias,
    ...(accountNpub ? { accountNpub } : {}),
  };
}

export async function getRecentEventsFromRelays(limit = 10): Promise<DashboardActivityItem[]> {
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
  if (!activeKey?.id) {
    return [];
  }

  const settingsStore = useSettingsStore();
  const relays = await settingsStore.getFallbackRelays();

  if (relays.length === 0) {
    return [];
  }

  const filter = {
    authors: [activeKey.id],
    limit,
  };

  const { getEvents, close } = useEventService(relays);
  try {
    const events = await getEvents(filter);
    return events
      .sort((a, b) => b.created_at - a.created_at)
      .slice(0, limit)
      .map((event) => fromNostrEventToActivityItem(event, activeAccount, activeKey.id));
  } finally {
    close();
  }
}

export async function getDashboardSummary(activityLimit = 50): Promise<DashboardSummary> {
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
    getRecentEventsFromRelays(activityLimit),
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
