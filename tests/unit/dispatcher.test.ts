import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dispatchMessage } from 'app/src-bex/dispatcher';
import { handleRelayBrowserList, handleRelayBrowserGetStatus } from 'app/src-bex/handlers/relay-browser-handler';
import { handleVaultUnlock } from 'app/src-bex/handlers/vault-handler';
import type { RelayCatalogEntry, RelayDiscoveryState } from 'src/types/relay';
import { createBridgeRequest } from 'src/types/bridge';
import type { VaultData } from 'src/types/bridge';

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

const autoLockMocks = vi.hoisted(() => ({
  resetAutoLockTimer: vi.fn(),
  startAutoLockTimer: vi.fn(),
  stopAutoLockTimer: vi.fn(),
}));

vi.mock('app/src-bex/services/auto-lock', () => autoLockMocks);

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
    const result = await dispatchMessage('ping', createBridgeRequest('ping', {}));
    expect(result).toBe('pong');
  });

  it('should route relay.browser.list correctly', async () => {
    const mockEntries: RelayCatalogEntry[] = [{
      url: 'wss://relay.com',
      hostname: 'relay.com',
      isUserAdded: false,
      isSeed: true,
      status: 'online',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }];
    vi.mocked(handleRelayBrowserList).mockResolvedValue({ success: true, data: mockEntries });

    const result = await dispatchMessage('relay.browser.list', createBridgeRequest('relay.browser.list', {}));

    expect(result).toEqual(mockEntries);
    expect(handleRelayBrowserList).toHaveBeenCalled();
  });

  it('should return empty array for relay.browser.list when handler fails', async () => {
    vi.mocked(handleRelayBrowserList).mockResolvedValue({ success: false, error: 'Fail' });

    const result = await dispatchMessage('relay.browser.list', createBridgeRequest('relay.browser.list', {}));

    expect(result).toEqual([]);
    expect(handleRelayBrowserList).toHaveBeenCalled();
  });

  it('should route relay.browser.getStatus correctly', async () => {
    const mockStatus: RelayDiscoveryState = {
      id: 'global',
      isDiscoveryInProgress: false,
      updatedAt: Date.now(),
    };
    vi.mocked(handleRelayBrowserGetStatus).mockResolvedValue({ success: true, data: mockStatus });

    const result = await dispatchMessage('relay.browser.getStatus', createBridgeRequest('relay.browser.getStatus', {}));

    expect(result).toEqual(mockStatus);
    expect(handleRelayBrowserGetStatus).toHaveBeenCalled();
  });

  it('should return null for relay.browser.getStatus when handler fails', async () => {
    vi.mocked(handleRelayBrowserGetStatus).mockResolvedValue({ success: false, error: 'Fail' });

    const result = await dispatchMessage('relay.browser.getStatus', createBridgeRequest('relay.browser.getStatus', {}));

    expect(result).toBeNull();
    expect(handleRelayBrowserGetStatus).toHaveBeenCalled();
  });

  it('should await activity.mark auto-lock persistence', async () => {
    autoLockMocks.resetAutoLockTimer.mockResolvedValue(undefined);

    const result = await dispatchMessage('activity.mark', createBridgeRequest('activity.mark', {}));

    expect(result).toBe(true);
    expect(autoLockMocks.resetAutoLockTimer).toHaveBeenCalled();
  });

  it('should await resetAutoLockTimer before starting timer on vault unlock', async () => {
    autoLockMocks.resetAutoLockTimer.mockResolvedValue(undefined);
    autoLockMocks.startAutoLockTimer.mockReturnValue(undefined);
    const mockVaultData: { vaultData: VaultData } = { vaultData: { accounts: [] } };
    vi.mocked(handleVaultUnlock).mockResolvedValue({ success: true, data: mockVaultData });

    const result = await dispatchMessage('vault.unlock', createBridgeRequest('vault.unlock', { password: 'test-password' }));

    expect(result).toEqual({ success: true, vaultData: { accounts: [] } });
    expect(autoLockMocks.resetAutoLockTimer).toHaveBeenCalled();
    expect(autoLockMocks.startAutoLockTimer).toHaveBeenCalled();
    expect(
      autoLockMocks.resetAutoLockTimer.mock.invocationCallOrder[0]!,
    ).toBeLessThan(autoLockMocks.startAutoLockTimer.mock.invocationCallOrder[0]!);
  });

  it('should return null for unknown message type', async () => {
    const result = await dispatchMessage('unknown.action' as never, { id: 'test', action: 'unknown.action' } as never);
    expect(result).toBeNull();
  });
});
