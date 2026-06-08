import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleNip44Encrypt, handleNip44Decrypt } from 'app/src-bex/handlers/nip44';
import { handleVaultGetData, handleVaultIsUnlocked } from 'app/src-bex/handlers/vault-handler';
import { storageService } from 'src/services/storage-service';
import { nip44 } from 'nostr-tools';
import { resetAutoLockTimer } from 'app/src-bex/services/auto-lock';

vi.mock('app/src-bex/handlers/vault-handler', () => ({
  handleVaultIsUnlocked: vi.fn(),
  handleVaultGetData: vi.fn(),
}));

vi.mock('src/services/storage-service', () => ({
  storageService: {
    get: vi.fn(),
  },
  NOSTR_ACTIVE: 'nostr_active_account',
}));

vi.mock('nostr-tools', () => ({
  nip44: {
    getConversationKey: vi.fn(),
    encrypt: vi.fn(),
    decrypt: vi.fn(),
  },
}));

vi.mock('@noble/hashes/utils', () => ({
  hexToBytes: vi.fn((hex: string) => Buffer.from(hex, 'hex')),
}));

vi.mock('app/src-bex/services/auto-lock', () => ({
  resetAutoLockTimer: vi.fn(),
}));

describe('Nip44Handler', () => {
  const mockAccount = {
    id: 'test-pubkey',
    alias: 'test-alias',
    createdAt: String(Date.now()),
    account: {
      privkey: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockUnlockedActiveAccount(): void {
    vi.mocked(handleVaultIsUnlocked).mockResolvedValue({ success: true, data: true });
    vi.mocked(storageService.get).mockResolvedValue('test-alias');
    vi.mocked(handleVaultGetData).mockResolvedValue({
      success: true,
      data: {
        vaultData: {
          accounts: [mockAccount],
        },
      },
    });
  }

  it('encrypts when vault is unlocked and active account exists', async () => {
    mockUnlockedActiveAccount();
    vi.mocked(nip44.getConversationKey).mockReturnValue(Uint8Array.from([1, 2, 3]));
    vi.mocked(nip44.encrypt).mockReturnValue('nip44-ciphertext');

    const result = await handleNip44Encrypt({ pubkey: 'recipient-pubkey', plaintext: 'hello' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('nip44-ciphertext');
    }
    expect(nip44.getConversationKey).toHaveBeenCalledWith(expect.any(Buffer), 'recipient-pubkey');
    expect(nip44.encrypt).toHaveBeenCalledWith('hello', Uint8Array.from([1, 2, 3]));
    expect(resetAutoLockTimer).toHaveBeenCalled();
  });

  it('decrypts when vault is unlocked and active account exists', async () => {
    mockUnlockedActiveAccount();
    vi.mocked(nip44.getConversationKey).mockReturnValue(Uint8Array.from([4, 5, 6]));
    vi.mocked(nip44.decrypt).mockReturnValue('hello');

    const result = await handleNip44Decrypt({ pubkey: 'sender-pubkey', ciphertext: 'nip44-ciphertext' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('hello');
    }
    expect(nip44.getConversationKey).toHaveBeenCalledWith(expect.any(Buffer), 'sender-pubkey');
    expect(nip44.decrypt).toHaveBeenCalledWith('nip44-ciphertext', Uint8Array.from([4, 5, 6]));
    expect(resetAutoLockTimer).toHaveBeenCalled();
  });

  it('returns error when vault is locked', async () => {
    vi.mocked(handleVaultIsUnlocked).mockResolvedValue({ success: true, data: false });

    const result = await handleNip44Encrypt({ pubkey: 'recipient-pubkey', plaintext: 'hello' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Vault is locked');
    }
  });

  it('returns error when no active account exists', async () => {
    vi.mocked(handleVaultIsUnlocked).mockResolvedValue({ success: true, data: true });
    vi.mocked(storageService.get).mockResolvedValue(null);

    const result = await handleNip44Decrypt({ pubkey: 'sender-pubkey', ciphertext: 'nip44-ciphertext' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('No active account found');
    }
  });

  it('returns crypto errors from invalid ciphertext', async () => {
    mockUnlockedActiveAccount();
    vi.mocked(nip44.getConversationKey).mockReturnValue(Uint8Array.from([4, 5, 6]));
    vi.mocked(nip44.decrypt).mockImplementation(() => {
      throw new Error('invalid MAC');
    });

    const result = await handleNip44Decrypt({ pubkey: 'sender-pubkey', ciphertext: 'bad-ciphertext' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('invalid MAC');
    }
  });
});
