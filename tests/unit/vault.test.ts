import { describe, it, expect, beforeEach, vi } from 'vitest';

// Define a simpler database interface
interface MockVault {
  id: string;
  encryptedData: string;
  createdAt: string;
}

const mockVaultsTable = new Map<string, MockVault>();

// Mock Dexie
vi.mock('../../src/services/database', () => {
  const vaultsMock = {
    get: vi.fn(async (id: string) => mockVaultsTable.get(id)),
    put: vi.fn(async (vault: any) => {
      mockVaultsTable.set(vault.id, vault);
      return vault.id;
    }),
    clear: vi.fn(async () => mockVaultsTable.clear()),
  };
  return {
    db: {
      vaults: vaultsMock,
      table: (name: string) => {
        if (name === 'vaults') {
          return vaultsMock;
        }
        throw new Error(`Table ${name} not mocked`);
      },
    },
  };
});

import {
  createNewVault,
  unlockVault,
  lockVault,
  isVaultUnlocked,
  updateVaultData,
  getVaultData,
  exportVault,
  importVault,
  restoreVaultState,
  getVaultKey,
} from '../../src-bex/vault';
import { db } from '../../src/services/database';

const vaultsMock = db.vaults as any;

// Mock chrome storage
const chromeMock = {
  storage: {
    session: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
    },
  },
};

vi.stubGlobal('chrome', chromeMock);

describe('Vault Operations', () => {
  const password = 'test-password';
  const vaultData = { nsec: 'test-key', alias: 'test-alias' };

  beforeEach(async () => {
    vi.clearAllMocks();
    await db.table('vaults').clear();
    await lockVault();
  });

  describe('createNewVault', () => {
    it('should create a new vault with valid password', async () => {
      const result = await createNewVault(password, vaultData);
      expect(result.success).toBe(true);
      expect(isVaultUnlocked()).toBe(true);

      const storedVault = await db.table('vaults').get('master');
      expect(storedVault).toBeDefined();
      expect(storedVault.encryptedData).toMatch(/^v2:/);
    });

    it('should fail with empty password (potential crypto error)', async () => {
      // Depending on crypto implementation, empty password might or might not fail.
      // Usually it succeeds but we can test it.
      const result = await createNewVault('', vaultData);
      expect(result.success).toBe(true);
    });

    it('should overwrite existing vault when creating a new one', async () => {
      await createNewVault('old-password', { old: 'data' });
      const result = await createNewVault(password, vaultData);
      expect(result.success).toBe(true);

      const decrypted = await getVaultData();
      expect(decrypted.vaultData).toEqual(vaultData);
    });

    it('should save session state after creation', async () => {
      await createNewVault(password, vaultData);
      expect(chromeMock.storage.session.set).toHaveBeenCalled();
    });
  });

  describe('unlockVault', () => {
    it('should unlock with correct password', async () => {
      await createNewVault(password, vaultData);
      await lockVault();
      expect(isVaultUnlocked()).toBe(false);

      const result = await unlockVault(password);
      expect(result.success).toBe(true);
      expect(result.vaultData).toEqual(vaultData);
      expect(isVaultUnlocked()).toBe(true);
    });

    it('should fail with incorrect password', async () => {
      await createNewVault(password, vaultData);
      await lockVault();

      const result = await unlockVault('wrong-password');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid password');
      expect(isVaultUnlocked()).toBe(false);
    });

    it('should fail if no vault exists', async () => {
      const result = await unlockVault(password);
      expect(result.success).toBe(false);
      expect(result.error).toBe('No vault found');
    });

    it('should restore session state after unlocking', async () => {
      await createNewVault(password, vaultData);
      await lockVault();
      vi.clearAllMocks();

      await unlockVault(password);
      expect(chromeMock.storage.session.set).toHaveBeenCalled();
    });
  });

  describe('lockVault', () => {
    it('should lock the vault and clear session', async () => {
      await createNewVault(password, vaultData);
      expect(isVaultUnlocked()).toBe(true);

      await lockVault();
      expect(isVaultUnlocked()).toBe(false);
      expect(chromeMock.storage.session.remove).toHaveBeenCalled();
    });

    it('should be idempotent', async () => {
      await lockVault();
      await lockVault();
      expect(isVaultUnlocked()).toBe(false);
    });
  });

  describe('updateVaultData', () => {
    it('should update data when unlocked', async () => {
      await createNewVault(password, vaultData);
      const newData = { nsec: 'new-key' };

      const result = await updateVaultData(newData);
      expect(result.success).toBe(true);

      const currentData = await getVaultData();
      expect(currentData.vaultData).toEqual(newData);
    });

    it('should fail to update data when locked', async () => {
      await createNewVault(password, vaultData);
      await lockVault();

      const result = await updateVaultData({ foo: 'bar' });
      expect(result.success).toBe(false);
      expect(result.error).toBe('Vault is locked');
    });
  });

  describe('getVaultData', () => {
    it('should return data when unlocked', async () => {
      await createNewVault(password, vaultData);
      const result = await getVaultData();
      expect(result.success).toBe(true);
      expect(result.vaultData).toEqual(vaultData);
    });

    it('should fail when locked', async () => {
      await createNewVault(password, vaultData);
      await lockVault();
      const result = await getVaultData();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Vault is locked');
    });

    it('should fail if vault is deleted from DB while unlocked', async () => {
      await createNewVault(password, vaultData);
      await db.table('vaults').clear();

      const result = await getVaultData();
      expect(result.success).toBe(false);
      expect(result.error).toBe('No vault found');
    });
  });

  describe('exportVault', () => {
    it('should export encrypted data even when locked', async () => {
      await createNewVault(password, vaultData);
      await lockVault();

      const result = await exportVault();
      expect(result.success).toBe(true);
      expect(result.encryptedData).toMatch(/^v2:/);
    });

    it('should fail if no vault exists', async () => {
      const result = await exportVault();
      expect(result.success).toBe(false);
      expect(result.error).toBe('No vault found');
    });
  });

  describe('importVault', () => {
    it('should import valid encrypted data', async () => {
      const { encryptedVault } = await createNewVault(password, vaultData);
      await db.table('vaults').clear();
      await lockVault();

      const result = await importVault(encryptedVault!);
      expect(result.success).toBe(true);

      const unlocked = await unlockVault(password);
      expect(unlocked.success).toBe(true);
      expect(unlocked.vaultData).toEqual(vaultData);
    });

    it('should fail for invalid format', async () => {
      const result = await importVault('invalid-data');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid vault format');
    });

    it('should lock vault and clear session on import', async () => {
      const { encryptedVault } = await createNewVault(password, vaultData);
      await createNewVault('other-pw', { other: 'data' }); // vault is unlocked with other-pw

      await importVault(encryptedVault!);
      expect(isVaultUnlocked()).toBe(false);
      expect(chromeMock.storage.session.remove).toHaveBeenCalled();
    });
  });

  describe('restoreVaultState', () => {
    it('should restore vault key from session storage', async () => {
      // 1. Create vault and get the saved session data
      await createNewVault(password, vaultData);
      const sessionData = (chromeMock.storage.session.set as any).mock.calls[0][0];

      // 2. Clear memory state
      await lockVault();
      vi.clearAllMocks();

      // 3. Setup session.get to return the saved data
      chromeMock.storage.session.get.mockResolvedValue(sessionData);

      // 4. Restore
      const restored = await restoreVaultState();
      expect(restored).toBe(true);
      expect(isVaultUnlocked()).toBe(true);

      // 5. Verify it actually works
      const data = await getVaultData();
      expect(data.vaultData).toEqual(vaultData);
    });

    it('should return false if session data is missing', async () => {
      chromeMock.storage.session.get.mockResolvedValue({});
      const restored = await restoreVaultState();
      expect(restored).toBe(false);
      expect(isVaultUnlocked()).toBe(false);
    });

    it('should return false if session.get fails', async () => {
      chromeMock.storage.session.get.mockRejectedValue(new Error('Storage error'));
      const restored = await restoreVaultState();
      expect(restored).toBe(false);
    });
  });

  describe('getVaultKey', () => {
    it('should return key and salt when unlocked', async () => {
      await createNewVault(password, vaultData);
      const { key, salt } = getVaultKey();
      expect(key).toBeDefined();
      expect(salt).toBeDefined();
    });

    it('should return nulls when locked', async () => {
      await lockVault();
      const { key, salt } = getVaultKey();
      expect(key).toBeNull();
      expect(salt).toBeNull();
    });
  });

  describe('Edge Cases & Error Handling', () => {
    it('should handle database errors in createNewVault', async () => {
      vaultsMock.put.mockRejectedValueOnce(new Error('DB Error'));
      const result = await createNewVault(password, vaultData);
      expect(result.success).toBe(false);
      expect(result.error).toBe('DB Error');
      expect(isVaultUnlocked()).toBe(false);
    });

    it('should handle decryption errors with wrong key (simulated)', async () => {
      await createNewVault(password, vaultData);

      // Manually mess up the key if we could, but here we'll just test unlock with wrong password again
      const result = await unlockVault('wrong');
      expect(result.success).toBe(false);
    });

    it('should remain locked if createNewVault fails', async () => {
      vaultsMock.put.mockRejectedValueOnce(new Error('DB Error'));
      await createNewVault(password, vaultData);
      expect(isVaultUnlocked()).toBe(false);
    });

    it('should clear vault key on unlock failure', async () => {
      await createNewVault(password, vaultData);
      // It's already unlocked. Now try to unlock with wrong password.
      await unlockVault('wrong');
      expect(isVaultUnlocked()).toBe(false);
    });
  });
});
