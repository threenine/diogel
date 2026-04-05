import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleGetPublicKey, handleSignEvent } from '../../../src-bex/handlers/nip07';
import { isVaultUnlocked, getVaultData } from '../../../src-bex/vault';
import { storageService, NOSTR_ACTIVE } from '../../../src/services/storage-service';
import { checkPermission } from '../../../src-bex/handlers/permission-handler';
import { resetAutoLockTimer } from '../../../src-bex/services/auto-lock';
import { finalizeEvent } from 'nostr-tools';
import { ErrorCode } from '../../../src/types/error-codes';

// Mock dependencies
vi.mock('../../../src-bex/vault', () => ({
  isVaultUnlocked: vi.fn(),
  getVaultData: vi.fn(),
}));

vi.mock('../../../src/services/storage-service', () => ({
  storageService: {
    get: vi.fn(),
  },
  NOSTR_ACTIVE: 'nostr_active_account',
}));

vi.mock('../../../src-bex/handlers/permission-handler', () => ({
  checkPermission: vi.fn(),
}));

vi.mock('../../../src-bex/services/auto-lock', () => ({
  resetAutoLockTimer: vi.fn(),
}));

vi.mock('nostr-tools', () => ({
  finalizeEvent: vi.fn(),
}));

vi.mock('@noble/hashes/utils', () => ({
  hexToBytes: vi.fn((hex) => Buffer.from(hex, 'hex')),
}));

// Mock logService to avoid issues with wrapWithLogging
vi.mock('../../../src/services/log-service', () => ({
  logService: {
    wrapWithLogging: vi.fn((fn) => fn),
  },
}));

describe('Nip07Handler', () => {
  const mockAccount = {
    id: 'test-pubkey',
    alias: 'test-alias',
    account: {
      privkey: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    },
  };

  const mockOrigin = 'https://example.com';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleGetPublicKey', () => {
    it('should return public key when vault is unlocked and active account exists', async () => {
      vi.mocked(isVaultUnlocked).mockReturnValue(true);
      vi.mocked(storageService.get).mockResolvedValue('test-alias');
      vi.mocked(getVaultData).mockResolvedValue({
        success: true,
        vaultData: {
          accounts: [mockAccount],
        },
      });

      const result = await handleGetPublicKey({}, mockOrigin);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('test-pubkey');
      }
      expect(resetAutoLockTimer).toHaveBeenCalled();
    });

    it('should return error when vault is locked', async () => {
      vi.mocked(isVaultUnlocked).mockReturnValue(false);

      const result = await handleGetPublicKey({}, mockOrigin);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe(ErrorCode.VLT_LOCKED);
        expect(result.error).toBe('Vault is locked');
      }
    });

    it('should return error when no active account is set', async () => {
      vi.mocked(isVaultUnlocked).mockReturnValue(true);
      vi.mocked(storageService.get).mockResolvedValue(null);

      const result = await handleGetPublicKey({}, mockOrigin);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe(ErrorCode.SIG_NO_ACTIVE_KEY);
        expect(result.error).toBe('No active account');
      }
    });

    it('should return error when active account is not found in vault data', async () => {
      vi.mocked(isVaultUnlocked).mockReturnValue(true);
      vi.mocked(storageService.get).mockResolvedValue('other-alias');
      vi.mocked(getVaultData).mockResolvedValue({
        success: true,
        vaultData: {
          accounts: [mockAccount],
        },
      });

      const result = await handleGetPublicKey({}, mockOrigin);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe(ErrorCode.SIG_NO_ACTIVE_KEY);
      }
    });
  });

  describe('handleSignEvent', () => {
    const mockEvent = {
      kind: 1,
      content: 'hello',
      tags: [],
      created_at: Math.floor(Date.now() / 1000),
    };

    it('should sign event when all conditions are met', async () => {
      vi.mocked(isVaultUnlocked).mockReturnValue(true);
      vi.mocked(checkPermission).mockResolvedValue({ granted: true });
      vi.mocked(storageService.get).mockResolvedValue('test-alias');
      vi.mocked(getVaultData).mockResolvedValue({
        success: true,
        vaultData: {
          accounts: [mockAccount],
        },
      });
      const signedEvent = { ...mockEvent, id: 'event-id', sig: 'event-sig', pubkey: 'test-pubkey' };
      vi.mocked(finalizeEvent).mockReturnValue(signedEvent as any);

      const result = await handleSignEvent({ event: { ...mockEvent } as any }, mockOrigin);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(signedEvent);
      }
      expect(finalizeEvent).toHaveBeenCalled();
      expect(resetAutoLockTimer).toHaveBeenCalled();
    });

    it('should return error when vault is locked', async () => {
      vi.mocked(isVaultUnlocked).mockReturnValue(false);

      const result = await handleSignEvent({ event: mockEvent as any }, mockOrigin);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe(ErrorCode.VLT_LOCKED);
      }
    });

    it('should return error when permission is denied', async () => {
      vi.mocked(isVaultUnlocked).mockReturnValue(true);
      vi.mocked(checkPermission).mockResolvedValue({ granted: false });

      const result = await handleSignEvent({ event: mockEvent as any }, mockOrigin);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe(ErrorCode.PER_DENIED);
        expect(result.error).toBe('Permission denied');
      }
    });

    it('should return error when signing fails', async () => {
      vi.mocked(isVaultUnlocked).mockReturnValue(true);
      vi.mocked(checkPermission).mockResolvedValue({ granted: true });
      vi.mocked(storageService.get).mockResolvedValue('test-alias');
      vi.mocked(getVaultData).mockResolvedValue({
        success: true,
        vaultData: {
          accounts: [mockAccount],
        },
      });
      vi.mocked(finalizeEvent).mockImplementation(() => {
        throw new Error('Signing failed');
      });

      const result = await handleSignEvent({ event: { ...mockEvent } as any }, mockOrigin);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe(ErrorCode.SIG_FAILED);
        expect(result.error).toBe('Signing failed');
      }
    });
  });
});
