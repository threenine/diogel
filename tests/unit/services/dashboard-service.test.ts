import { beforeEach, describe, expect, it, vi } from 'vitest';

import type * as DashboardService from 'src/services/dashboard-service';
import type * as DexieStorage from 'src/services/dexie-storage';
import type * as VaultService from 'src/services/vault-service';
import { useEventService } from 'src/composables/useEventService';

vi.mock('src/services/dexie-storage', () => ({
  get: vi.fn(),
  getActive: vi.fn(),
}));

vi.mock('src/services/vault-service', () => ({
  isVaultUnlocked: vi.fn(),
}));

const { approvalsToArrayMock, exceptionsToArrayMock } = vi.hoisted(() => ({
  approvalsToArrayMock: vi.fn(),
  exceptionsToArrayMock: vi.fn(),
}));

const {
  relayMetadataGetMock,
  relayMetadataSubscribeManyMock,
  fallbackRelays,
  getSettingsMock,
  parseRelayListEventMock,
  normalizeAndDeduplicateRelaysMock,
} = vi.hoisted(() => ({
  relayMetadataGetMock: vi.fn(),
  relayMetadataSubscribeManyMock: vi.fn(),
  fallbackRelays: [] as string[],
  getSettingsMock: vi.fn(async () => undefined),
  parseRelayListEventMock: vi.fn(),
  normalizeAndDeduplicateRelaysMock: vi.fn(),
}));

vi.mock('src/services/database', () => ({
  db: {
    approvals: {
      where: () => ({
        equals: () => ({
          toArray: approvalsToArrayMock,
        }),
      }),
    },
    exceptions: {
      where: () => ({
        equals: () => ({
          toArray: exceptionsToArrayMock,
        }),
      }),
    },
  },
}));

vi.mock('src/stores/settings-store', () => ({
  default: () => ({
    fallbackRelays,
    getSettings: getSettingsMock,
  }),
}));

vi.mock('nostr-tools', () => ({
  SimplePool: class {
    get = relayMetadataGetMock;
    subscribeMany = relayMetadataSubscribeManyMock;
    close = vi.fn();
  },
}));

vi.mock('src/services/relay-discovery', () => ({
  parseRelayListEvent: parseRelayListEventMock,
  normalizeAndDeduplicateRelays: normalizeAndDeduplicateRelaysMock,
}));

vi.mock('src/composables/useEventService', () => ({
  useEventService: vi.fn(),
}));

describe('dashboard-service', () => {
  let dashboardService: typeof DashboardService;
  let dexieStorage: typeof DexieStorage;
  let vaultService: typeof VaultService;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    approvalsToArrayMock.mockResolvedValue([]);
    exceptionsToArrayMock.mockResolvedValue([]);
    relayMetadataGetMock.mockReset();
    relayMetadataGetMock.mockResolvedValue(undefined);
    relayMetadataSubscribeManyMock.mockReset();
    relayMetadataSubscribeManyMock.mockImplementation((relays, filters, handlers) => {
      handlers.oneose?.();
      return { close: vi.fn() };
    });
    parseRelayListEventMock.mockReset();
    parseRelayListEventMock.mockReturnValue([]);
    normalizeAndDeduplicateRelaysMock.mockReset();
    normalizeAndDeduplicateRelaysMock.mockImplementation((urls: string[]) => urls);
    fallbackRelays.splice(0, fallbackRelays.length, 'wss://relay.default');
    getSettingsMock.mockClear();
  });

  beforeEach(async () => {
    dashboardService = await import('src/services/dashboard-service');
    dexieStorage = await import('src/services/dexie-storage');
    vaultService = await import('src/services/vault-service');

    vi.mocked(vaultService.isVaultUnlocked).mockResolvedValue(true);
    vi.mocked(dexieStorage.get).mockResolvedValue({});
    vi.mocked(dexieStorage.getActive).mockResolvedValue(undefined);
  });

  it('getActiveKeyCount returns total stored keys', async () => {
    vi.mocked(dexieStorage.get).mockResolvedValue({
      alpha: { id: 'npub1', alias: 'alpha', account: { privkey: 'redacted' }, createdAt: '2026-01-01' },
      beta: { id: 'npub2', alias: 'beta', account: { privkey: 'redacted' }, createdAt: '2026-01-01' },
    });

    await expect(dashboardService.getActiveKeyCount()).resolves.toBe(2);
  });

  it('returns 0 signed events when no active account', async () => {
    vi.mocked(dexieStorage.getActive).mockResolvedValue(undefined);

    await expect(dashboardService.getSignedEventCountForActiveKey()).resolves.toBe(0);
  });

  it('counts signed events from relays for active account', async () => {
    vi.mocked(dexieStorage.getActive).mockResolvedValue('alpha');
    vi.mocked(dexieStorage.get).mockResolvedValue({
      alpha: { id: 'pubkey-alpha', alias: 'alpha', account: { privkey: 'redacted' }, createdAt: '2026-01-01' },
    });

    const getEventsMock = vi.fn();
    const closeMock = vi.fn();
    vi.mocked(useEventService).mockReturnValue({
      getEvents: getEventsMock,
      close: closeMock,
      relayUrls: ['wss://relay.default'],
    });

    getEventsMock.mockResolvedValue([{ id: 'evt-1' }, { id: 'evt-2' }]);

    await expect(dashboardService.getSignedEventCountForActiveKey()).resolves.toBe(2);
    expect(getEventsMock).toHaveBeenCalledWith({ authors: ['pubkey-alpha'] });
    expect(closeMock).toHaveBeenCalled();
  });

  it('returns 0 connected relays when no active account', async () => {
    vi.mocked(dexieStorage.getActive).mockResolvedValue(undefined);

    await expect(dashboardService.getConnectedRelayCountForActiveKey()).resolves.toBe(0);
  });

  it('counts relays from active account kind 10002 metadata', async () => {
    vi.mocked(dexieStorage.getActive).mockResolvedValue('alpha');
    vi.mocked(dexieStorage.get).mockResolvedValue({
      alpha: { id: 'pubkey-alpha', alias: 'alpha', account: { privkey: 'redacted' }, createdAt: '2026-01-01' },
    });
    const event = { id: 'evt-1', tags: [] };
    relayMetadataGetMock.mockResolvedValue(event);
    parseRelayListEventMock.mockReturnValue(['wss://relay.one', 'wss://relay.two']);
    normalizeAndDeduplicateRelaysMock.mockReturnValue(['wss://relay.one', 'wss://relay.two']);

    await expect(dashboardService.getConnectedRelayCountForActiveKey()).resolves.toBe(2);
  });

  it('deduplicates relay urls for connected relay metric', async () => {
    vi.mocked(dexieStorage.getActive).mockResolvedValue('alpha');
    vi.mocked(dexieStorage.get).mockResolvedValue({
      alpha: { id: 'pubkey-alpha', alias: 'alpha', account: { privkey: 'redacted' }, createdAt: '2026-01-01' },
    });
    const event = { id: 'evt-2', tags: [] };
    relayMetadataGetMock.mockResolvedValue(event);
    parseRelayListEventMock.mockReturnValue([
      'wss://relay.one',
      'wss://relay.one',
      'wss://relay.two',
      'wss://relay.two',
    ]);
    normalizeAndDeduplicateRelaysMock.mockReturnValue(['wss://relay.one', 'wss://relay.two']);

    await expect(dashboardService.getConnectedRelayCountForActiveKey()).resolves.toBe(2);
  });

  it('ignores malformed relay urls through normalization', async () => {
    vi.mocked(dexieStorage.getActive).mockResolvedValue('alpha');
    vi.mocked(dexieStorage.get).mockResolvedValue({
      alpha: { id: 'pubkey-alpha', alias: 'alpha', account: { privkey: 'redacted' }, createdAt: '2026-01-01' },
    });
    const event = { id: 'evt-3', tags: [] };
    relayMetadataGetMock.mockResolvedValue(event);
    parseRelayListEventMock.mockReturnValue(['wss://relay.good', 'bad-url']);
    normalizeAndDeduplicateRelaysMock.mockReturnValue(['wss://relay.good']);

    await expect(dashboardService.getConnectedRelayCountForActiveKey()).resolves.toBe(1);
  });

  it('returns unavailable when no kind 10002 metadata exists', async () => {
    vi.mocked(dexieStorage.getActive).mockResolvedValue('alpha');
    vi.mocked(dexieStorage.get).mockResolvedValue({
      alpha: { id: 'pubkey-alpha', alias: 'alpha', account: { privkey: 'redacted' }, createdAt: '2026-01-01' },
    });
    relayMetadataGetMock.mockResolvedValue(undefined);

    await expect(dashboardService.getConnectedRelaySummaryForActiveKey()).resolves.toEqual({
      count: 0,
      state: 'unavailable',
    });
  });

  it('returns unavailable when vault is locked', async () => {
    vi.mocked(vaultService.isVaultUnlocked).mockResolvedValue(false);

    await expect(dashboardService.getConnectedRelaySummaryForActiveKey()).resolves.toEqual({
      count: 0,
      state: 'unavailable',
    });
  });

  it('returns unavailable when no active account', async () => {
    vi.mocked(dexieStorage.getActive).mockResolvedValue(undefined);

    await expect(dashboardService.getConnectedRelaySummaryForActiveKey()).resolves.toEqual({
      count: 0,
      state: 'unavailable',
    });
  });

  it('returns unavailable when fallback relays are missing', async () => {
    vi.mocked(dexieStorage.getActive).mockResolvedValue('alpha');
    vi.mocked(dexieStorage.get).mockResolvedValue({
      alpha: { id: 'pubkey-alpha', alias: 'alpha', account: { privkey: 'redacted' }, createdAt: '2026-01-01' },
    });
    fallbackRelays.splice(0, fallbackRelays.length);

    await expect(dashboardService.getConnectedRelaySummaryForActiveKey()).resolves.toEqual({
      count: 0,
      state: 'unavailable',
    });
    expect(getSettingsMock).toHaveBeenCalledTimes(1);
  });

  it('returns empty recent activity when no active account', async () => {
    vi.mocked(dexieStorage.getActive).mockResolvedValue(undefined);

    await expect(dashboardService.getRecentActivityForActiveKey(5)).resolves.toEqual([]);
  });

  it('returns empty recent activity when vault is locked', async () => {
    vi.mocked(vaultService.isVaultUnlocked).mockResolvedValue(false);

    await expect(dashboardService.getRecentActivityForActiveKey(5)).resolves.toEqual([]);
  });

  it('returns merged and sorted recent activity for active account with limit', async () => {
    vi.mocked(dexieStorage.getActive).mockResolvedValue('alpha');
    vi.mocked(dexieStorage.get).mockResolvedValue({
      alpha: { id: 'pubkey-alpha', alias: 'alpha', account: { privkey: 'redacted' }, createdAt: '2026-01-01' },
    });
    approvalsToArrayMock.mockResolvedValue([
      { id: 1, dateTime: '2026-01-01T10:00:00.000Z', eventKind: 1, hostname: 'a.com', account: 'alpha' },
      { id: 2, dateTime: '2026-01-01T09:00:00.000Z', eventKind: 4, hostname: 'b.com', account: 'alpha' },
    ]);
    exceptionsToArrayMock.mockResolvedValue([
      {
        id: 3,
        dateTime: '2026-01-01T11:00:00.000Z',
        message: 'approval timeout',
        account: 'alpha',
        hostname: 'c.com',
      },
    ]);

    const result = await dashboardService.getRecentActivityForActiveKey(2);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      type: 'exception',
      status: 'exception',
      title: 'Extension exception',
      detail: 'approval timeout',
      accountAlias: 'alpha',
      accountNpub: 'pubkey-alpha',
    });
    expect(result[0]).not.toHaveProperty('eventKind');
    expect(result[1]).toMatchObject({
      type: 'approval',
      status: 'approved',
      title: 'Approval request accepted',
      eventKind: 1,
      accountAlias: 'alpha',
      accountNpub: 'pubkey-alpha',
    });

    expect(result.map((item) => item.dateTime)).toEqual([
      '2026-01-01T11:00:00.000Z',
      '2026-01-01T10:00:00.000Z',
    ]);
  });
});
