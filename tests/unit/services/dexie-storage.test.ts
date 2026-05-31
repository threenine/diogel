import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { StoredKey } from 'src/types';

const mockIsVaultUnlocked = vi.fn();
const mockGetVaultData = vi.fn();
const mockUpdateVaultData = vi.fn();
const mockStorageGet = vi.fn();
const mockStorageSet = vi.fn();
const mockApprovalModify = vi.fn();
const mockExceptionModify = vi.fn();

vi.mock('src/services/vault-service', () => ({
  isVaultUnlocked: mockIsVaultUnlocked,
  getVaultData: mockGetVaultData,
  updateVaultData: mockUpdateVaultData,
}));

vi.mock('src/services/storage-service', () => ({
  NOSTR_ACTIVE: 'NOSTR_ACTIVE',
  storageService: {
    get: mockStorageGet,
    set: mockStorageSet,
  },
}));

vi.mock('src/services/database', () => ({
  db: {
    approvals: {
      where: vi.fn().mockReturnThis(),
      equals: vi.fn().mockReturnThis(),
      modify: mockApprovalModify,
    },
    exceptions: {
      where: vi.fn().mockReturnThis(),
      equals: vi.fn().mockReturnThis(),
      modify: mockExceptionModify,
    },
  },
}));

describe('dexie-storage renameAlias', () => {
  const baseKey: StoredKey = {
    id: 'pubkey-hex',
    alias: 'alpha',
    account: { privkey: 'secret' },
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsVaultUnlocked.mockResolvedValue(true);
    mockStorageGet.mockResolvedValue('alpha');
    mockApprovalModify.mockResolvedValue(1);
    mockExceptionModify.mockResolvedValue(1);
    mockGetVaultData.mockResolvedValue({
      success: true,
      vaultData: {
        accounts: [structuredClone(baseKey)],
      },
    });
  });

  it('renames alias, keeps key material unchanged, updates active alias, and migrates logs', async () => {
    const { renameAlias } = await import('src/services/dexie-storage');

    await renameAlias('alpha', '  beta  ');

    expect(mockUpdateVaultData).toHaveBeenCalledTimes(1);
    expect(mockUpdateVaultData).toHaveBeenCalledWith({
      accounts: [
        {
          id: 'pubkey-hex',
          alias: 'beta',
          account: { privkey: 'secret' },
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    });
    expect(mockStorageSet).toHaveBeenCalledWith('NOSTR_ACTIVE', 'beta');
    expect(mockApprovalModify).toHaveBeenCalledWith({ account: 'beta' });
    expect(mockExceptionModify).toHaveBeenCalledWith({ account: 'beta' });
  });

  it('rejects empty aliases after trimming', async () => {
    const { renameAlias } = await import('src/services/dexie-storage');

    await expect(renameAlias('alpha', '   ')).rejects.toThrow('Alias is required.');
    expect(mockUpdateVaultData).not.toHaveBeenCalled();
  });

  it('rejects reserved alias', async () => {
    const { renameAlias } = await import('src/services/dexie-storage');

    await expect(renameAlias('alpha', 'Main Account')).rejects.toThrow('Alias "Main Account" is reserved.');
    expect(mockUpdateVaultData).not.toHaveBeenCalled();
  });

  it('rejects duplicate alias', async () => {
    mockGetVaultData.mockResolvedValue({
      success: true,
      vaultData: {
        accounts: [
          structuredClone(baseKey),
          {
            id: 'other-id',
            alias: 'beta',
            account: { privkey: 'other-secret' },
            createdAt: '2026-02-01T00:00:00.000Z',
          },
        ],
      },
    });

    const { renameAlias } = await import('src/services/dexie-storage');

    await expect(renameAlias('alpha', 'beta')).rejects.toThrow('Key with the same alias already exists.');
    expect(mockUpdateVaultData).not.toHaveBeenCalled();
  });
});
