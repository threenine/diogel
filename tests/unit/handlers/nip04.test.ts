import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleNip04Encrypt, handleNip04Decrypt } from '../../../src-bex/handlers/nip04';
import { handleVaultGetData, handleVaultIsUnlocked } from '../../../src-bex/handlers/vault-handler';
import { storageService } from '../../../src/services/storage-service';
import { nip04 } from 'nostr-tools';

// Mock dependencies
vi.mock('../../../src-bex/handlers/vault-handler', () => ({
  handleVaultIsUnlocked: vi.fn(),
  handleVaultGetData: vi.fn(),
}));

vi.mock('../../../src/services/storage-service', () => ({
  storageService: {
    get: vi.fn(),
  },
  NOSTR_ACTIVE: 'nostr_active_account',
}));

vi.mock('nostr-tools', () => ({
  nip04: {
    encrypt: vi.fn(),
    decrypt: vi.fn(),
  },
}));

vi.mock('@noble/hashes/utils', () => ({
  hexToBytes: vi.fn((hex) => Buffer.from(hex, 'hex')),
}));

describe('Nip04Handler', () => {
  const mockAccount = {
    alias: 'test-alias',
    account: {
      privkey: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleNip04Encrypt', () => {
    it('should encrypt when vault is unlocked and account exists', async () => {
      vi.mocked(handleVaultIsUnlocked).mockResolvedValue({ success: true, data: true });
      vi.mocked(storageService['get']).mockResolvedValue('test-alias');
      vi.mocked(handleVaultGetData).mockResolvedValue({
        success: true,
        data: {
          vaultData: {
            accounts: [mockAccount],
          },
        },
      });
      vi.mocked(nip04.encrypt).mockReturnValue('ciphertext');

      const result = await handleNip04Encrypt({ pubkey: 'recipient-pubkey', plaintext: 'hello' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('ciphertext');
      }
      expect(nip04.encrypt).toHaveBeenCalled();
    });

    it('should return error when vault is locked', async () => {
      vi.mocked(handleVaultIsUnlocked).mockResolvedValue({ success: true, data: false });

      const result = await handleNip04Encrypt({ pubkey: 'recipient-pubkey', plaintext: 'hello' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Vault is locked');
      }
    });

    it('should return error when no active account', async () => {
      vi.mocked(handleVaultIsUnlocked).mockResolvedValue({ success: true, data: true });
      vi.mocked(storageService['get']).mockResolvedValue(null);

      const result = await handleNip04Encrypt({ pubkey: 'recipient-pubkey', plaintext: 'hello' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('No active account found');
      }
    });
  });

  describe('handleNip04Decrypt', () => {
    it('should decrypt when vault is unlocked and account exists', async () => {
      vi.mocked(handleVaultIsUnlocked).mockResolvedValue({ success: true, data: true });
      vi.mocked(storageService['get']).mockResolvedValue('test-alias');
      vi.mocked(handleVaultGetData).mockResolvedValue({
        success: true,
        data: {
          vaultData: {
            accounts: [mockAccount],
          },
        },
      });
      vi.mocked(nip04.decrypt).mockReturnValue('plaintext');

      const result = await handleNip04Decrypt({ pubkey: 'sender-pubkey', ciphertext: 'ciphertext' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('plaintext');
      }
      expect(nip04.decrypt).toHaveBeenCalled();
    });

    it('should catch and return errors during decryption', async () => {
      vi.mocked(handleVaultIsUnlocked).mockResolvedValue({ success: true, data: true });
      vi.mocked(storageService['get']).mockResolvedValue('test-alias');
      vi.mocked(handleVaultGetData).mockResolvedValue({
        success: true,
        data: {
          vaultData: {
            accounts: [mockAccount],
          },
        },
      });
      vi.mocked(nip04.decrypt).mockImplementation(() => {
        throw new Error('Decryption failed');
      });

      const result = await handleNip04Decrypt({ pubkey: 'sender-pubkey', ciphertext: 'ciphertext' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Decryption failed');
      }
    });
  });
});
