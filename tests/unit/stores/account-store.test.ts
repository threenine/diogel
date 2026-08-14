import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import useAccountStore from 'src/stores/account-store';
import type { StoredKey } from 'src/types';

const { mockSave, mockGet, mockGetActive, mockSetActive, mockRenameAlias, mockOnChanged } = vi.hoisted(() => ({
  mockSave: vi.fn(),
  mockGet: vi.fn(),
  mockGetActive: vi.fn(),
  mockSetActive: vi.fn(),
  mockRenameAlias: vi.fn(),
  mockOnChanged: vi.fn(),
}));

vi.mock('src/services/dexie-storage', () => ({
  save: mockSave,
  get: mockGet,
  getActive: mockGetActive,
  setActive: mockSetActive,
  renameAlias: mockRenameAlias,
}));

vi.mock('src/services/storage-service', () => ({
  NOSTR_ACTIVE: 'NOSTR_ACTIVE',
  storageService: { onChanged: mockOnChanged },
}));

function buildKey(overrides: Partial<StoredKey> = {}): StoredKey {
  return {
    id: 'pubkey-hex',
    alias: 'alpha',
    account: { privkey: 'secret' },
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('account-store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('starts with no stored keys and no active alias', () => {
    const store = useAccountStore();
    expect(store.storedKeys.size).toBe(0);
    expect(store.activeKey).toBeUndefined();
  });

  describe('saveKey', () => {
    it('persists the key and adds it to the in-memory set', async () => {
      mockSave.mockResolvedValue(undefined);
      const store = useAccountStore();
      const key = buildKey();

      await store.saveKey(key);

      expect(mockSave).toHaveBeenCalledWith(key);
      expect(store.storedKeys.has(key)).toBe(true);
    });

    it('propagates a save failure without adding the key', async () => {
      mockSave.mockRejectedValue(new Error('duplicate alias'));
      const store = useAccountStore();
      const key = buildKey();

      await expect(store.saveKey(key)).rejects.toThrow('duplicate alias');
      expect(store.storedKeys.size).toBe(0);
    });
  });

  describe('getKeys', () => {
    it('loads stored keys and the active alias from the vault', async () => {
      const alpha = buildKey({ alias: 'alpha' });
      const beta = buildKey({ id: 'pubkey-hex-2', alias: 'beta' });
      mockGet.mockResolvedValue({ alpha, beta });
      mockGetActive.mockResolvedValue('alpha');

      const store = useAccountStore();
      await store.getKeys();

      expect(store.storedKeys).toEqual(new Set([alpha, beta]));
      expect(store.activeKey).toBe('alpha');
    });
  });

  describe('setActiveKey', () => {
    it('updates the active alias locally and persists it', async () => {
      mockSetActive.mockResolvedValue(undefined);
      const store = useAccountStore();

      await store.setActiveKey('beta');

      expect(store.activeKey).toBe('beta');
      expect(mockSetActive).toHaveBeenCalledWith('beta');
    });
  });

  describe('renameKeyAlias', () => {
    it('renames the alias, reloads keys, and updates the active alias if it was renamed', async () => {
      mockRenameAlias.mockResolvedValue(undefined);
      const renamed = buildKey({ alias: 'beta' });
      mockGet.mockResolvedValue({ beta: renamed });
      mockGetActive.mockResolvedValue('beta');

      const store = useAccountStore();
      store.activeKey = 'alpha';

      await store.renameKeyAlias('alpha', 'beta');

      expect(mockRenameAlias).toHaveBeenCalledWith('alpha', 'beta');
      expect(store.storedKeys).toEqual(new Set([renamed]));
      expect(store.activeKey).toBe('beta');
    });

    it('does not touch the active alias when a different key was renamed', async () => {
      mockRenameAlias.mockResolvedValue(undefined);
      mockGet.mockResolvedValue({});
      mockGetActive.mockResolvedValue('gamma');

      const store = useAccountStore();
      store.activeKey = 'gamma';

      await store.renameKeyAlias('alpha', 'beta');

      expect(store.activeKey).toBe('gamma');
    });
  });

  describe('listenToStorageChanges', () => {
    it('registers a storage listener only once', () => {
      const store = useAccountStore();

      store.listenToStorageChanges();
      store.listenToStorageChanges();

      expect(mockOnChanged).toHaveBeenCalledTimes(1);
    });

    it('reloads keys when NOSTR_ACTIVE changes in local storage', () => {
      mockGet.mockResolvedValue({});
      mockGetActive.mockResolvedValue(undefined);
      const store = useAccountStore();

      store.listenToStorageChanges();
      const listener = mockOnChanged.mock.calls[0]?.[0] as (
        changes: Record<string, unknown>,
        areaName: string,
      ) => void;
      listener({ NOSTR_ACTIVE: { newValue: 'alpha' } }, 'local');

      expect(mockGet).toHaveBeenCalled();
    });

    it('ignores changes in other storage areas', () => {
      const store = useAccountStore();

      store.listenToStorageChanges();
      const listener = mockOnChanged.mock.calls[0]?.[0] as (
        changes: Record<string, unknown>,
        areaName: string,
      ) => void;
      listener({ NOSTR_ACTIVE: { newValue: 'alpha' } }, 'session');

      expect(mockGet).not.toHaveBeenCalled();
    });
  });
});
