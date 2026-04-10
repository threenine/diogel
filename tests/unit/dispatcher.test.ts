import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dispatchMessage } from 'app/src-bex/dispatcher';
import { handleRelayBrowserList, handleRelayBrowserGetStatus } from 'app/src-bex/handlers/relay-browser-handler';

// Mock handlers
vi.mock('app/src-bex/handlers/vault-handler', () => ({
  handleVaultUnlock: vi.fn(),
  handleVaultLock: vi.fn(),
  handleVaultIsUnlocked: vi.fn(),
  handleVaultCreate: vi.fn(),
  handleVaultGetData: vi.fn(),
  handleVaultUpdateData: vi.fn(),
  handleVaultExport: vi.fn(),
  handleVaultImport: vi.fn(),
}));

vi.mock('app/src-bex/services/auto-lock', () => ({
  resetAutoLockTimer: vi.fn(),
  startAutoLockTimer: vi.fn(),
  stopAutoLockTimer: vi.fn(),
}));

vi.mock('app/src-bex/handlers/nip07', () => ({
  handleGetPublicKey: vi.fn(),
  handleSignEvent: vi.fn(),
}));

vi.mock('app/src-bex/handlers/blossom-handler', () => ({
  handleBlossomUpload: vi.fn(),
}));

vi.mock('app/src-bex/handlers/nip04', () => ({
  handleNip04Encrypt: vi.fn(),
  handleNip04Decrypt: vi.fn(),
}));

vi.mock('app/src-bex/handlers/relay-browser-handler', () => ({
  handleRelayBrowserList: vi.fn(),
  handleRelayBrowserGetStatus: vi.fn(),
}));

describe('Dispatcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should route ping action correctly', async () => {
    const result = await dispatchMessage('ping', {});
    expect(result).toBe('pong');
  });

  it('should route relay.browser.list correctly', async () => {
    const mockEntries = [{ url: 'wss://relay.com' }];
    vi.mocked(handleRelayBrowserList).mockResolvedValue({ success: true, data: mockEntries as any });

    const result = await dispatchMessage('relay.browser.list', {});

    expect(result).toEqual(mockEntries);
    expect(handleRelayBrowserList).toHaveBeenCalled();
  });

  it('should return empty array for relay.browser.list when handler fails', async () => {
    vi.mocked(handleRelayBrowserList).mockResolvedValue({ success: false, error: 'Fail' });

    const result = await dispatchMessage('relay.browser.list', {});

    expect(result).toEqual([]);
    expect(handleRelayBrowserList).toHaveBeenCalled();
  });

  it('should route relay.browser.getStatus correctly', async () => {
    const mockStatus = { id: 'global', isDiscoveryInProgress: false };
    vi.mocked(handleRelayBrowserGetStatus).mockResolvedValue({ success: true, data: mockStatus as any });

    const result = await dispatchMessage('relay.browser.getStatus', {});

    expect(result).toEqual(mockStatus);
    expect(handleRelayBrowserGetStatus).toHaveBeenCalled();
  });

  it('should return null for relay.browser.getStatus when handler fails', async () => {
    vi.mocked(handleRelayBrowserGetStatus).mockResolvedValue({ success: false, error: 'Fail' });

    const result = await dispatchMessage('relay.browser.getStatus', {});

    expect(result).toBeNull();
    expect(handleRelayBrowserGetStatus).toHaveBeenCalled();
  });

  it('should return null for unknown message type', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await dispatchMessage('unknown.action' as any, {});
    expect(result).toBeNull();
  });
});
