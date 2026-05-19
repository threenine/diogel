import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getActiveKeyCount,
  getConnectedRelayCountForActiveKey,
  getRecentActivityForActiveKey,
  getSignedEventCountForActiveKey,
} from 'src/services/dashboard-service';
import { get, getActive } from 'src/services/dexie-storage';
import { db } from 'src/services/database';

vi.mock('src/services/dexie-storage', () => ({
  get: vi.fn(),
  getActive: vi.fn(),
}));

const { approvalsToArrayMock, exceptionsToArrayMock } = vi.hoisted(() => ({
  approvalsToArrayMock: vi.fn(),
  exceptionsToArrayMock: vi.fn(),
}));

vi.mock('src/services/database', () => ({
  db: {
    approvals: {
      where: vi.fn().mockReturnValue({
        equals: vi.fn().mockReturnValue({
          toArray: approvalsToArrayMock,
        }),
      }),
    },
    exceptions: {
      where: vi.fn().mockReturnValue({
        equals: vi.fn().mockReturnValue({
          toArray: exceptionsToArrayMock,
        }),
      }),
    },
    relayCatalog: {
      toArray: vi.fn(),
    },
  },
}));

describe('dashboard-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    approvalsToArrayMock.mockResolvedValue([]);
    exceptionsToArrayMock.mockResolvedValue([]);
    vi.mocked(get).mockResolvedValue({});
    vi.mocked(getActive).mockResolvedValue(undefined);
  });

  it('getActiveKeyCount returns total stored keys', async () => {
    vi.mocked(get).mockResolvedValue({
      alpha: { id: 'npub1', alias: 'alpha', account: { privkey: 'redacted' }, createdAt: '2026-01-01' },
      beta: { id: 'npub2', alias: 'beta', account: { privkey: 'redacted' }, createdAt: '2026-01-01' },
    });

    await expect(getActiveKeyCount()).resolves.toBe(2);
  });

  it('returns 0 signed events when no active account', async () => {
    vi.mocked(getActive).mockResolvedValue(undefined);

    await expect(getSignedEventCountForActiveKey()).resolves.toBe(0);
  });

  it('counts signed events from approval logs for active account', async () => {
    vi.mocked(getActive).mockResolvedValue('alpha');
    approvalsToArrayMock.mockResolvedValue([
      { id: 1, dateTime: '2026-01-01T00:00:00.000Z', eventKind: 1, hostname: 'a.com', account: 'alpha' },
      { id: 2, dateTime: '2026-01-01T00:01:00.000Z', eventKind: 4, hostname: 'b.com', account: 'alpha' },
    ]);

    // This intentionally reflects the documented approximation: local approval logs only.
    await expect(getSignedEventCountForActiveKey()).resolves.toBe(2);
  });

  it('returns 0 connected relays when no active account', async () => {
    vi.mocked(getActive).mockResolvedValue(undefined);

    await expect(getConnectedRelayCountForActiveKey()).resolves.toBe(0);
  });

  it('counts online relays for connected relay metric', async () => {
    vi.mocked(getActive).mockResolvedValue('alpha');
    vi.mocked(db.relayCatalog.toArray).mockResolvedValue([
      {
        url: 'wss://relay.one',
        hostname: 'relay.one',
        isUserAdded: false,
        isSeed: true,
        status: 'online',
        createdAt: 1,
        updatedAt: 1,
      },
      {
        url: 'wss://relay.two',
        hostname: 'relay.two',
        isUserAdded: true,
        isSeed: false,
        status: 'offline',
        createdAt: 1,
        updatedAt: 1,
      },
    ]);

    await expect(getConnectedRelayCountForActiveKey()).resolves.toBe(1);
  });

  it('returns empty recent activity when no active account', async () => {
    vi.mocked(getActive).mockResolvedValue(undefined);

    await expect(getRecentActivityForActiveKey(5)).resolves.toEqual([]);
  });

  it('returns merged and sorted recent activity for active account with limit', async () => {
    vi.mocked(getActive).mockResolvedValue('alpha');
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

    const result = await getRecentActivityForActiveKey(2);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ type: 'exception', message: 'approval timeout' });
    expect(result[1]).toMatchObject({ type: 'approval', eventKind: 1 });
  });
});
