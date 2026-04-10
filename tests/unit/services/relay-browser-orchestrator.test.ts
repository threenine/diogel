import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RelayBrowserOrchestrator } from 'src/services/relay-browser-orchestrator';
import { relayCatalogService, loadSeedRelays } from 'src/services/relay-catalog';
import { relayDiscoveryService } from 'src/services/relay-discovery';
import { fetchRelayMetadata } from 'src/services/relay-metadata';

// Mock dependencies
vi.mock('src/services/relay-catalog', () => ({
  relayCatalogService: {
    getEntries: vi.fn(),
    getDiscoveryState: vi.fn(),
    updateDiscoveryState: vi.fn(),
    isDiscoveryStale: vi.fn(),
    isMetadataStale: vi.fn(),
    upsertEntry: vi.fn(),
  },
  loadSeedRelays: vi.fn(),
}));

vi.mock('src/services/relay-discovery', () => ({
  relayDiscoveryService: {
    discoverFromRelays: vi.fn(),
  },
}));

vi.mock('src/services/relay-metadata', () => ({
  fetchRelayMetadata: vi.fn(),
}));

describe('RelayBrowserOrchestrator', () => {
  let orchestrator: RelayBrowserOrchestrator;

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new RelayBrowserOrchestrator();

    // Default mock behaviors
    /* eslint-disable @typescript-eslint/unbound-method */
    vi.mocked(relayCatalogService.getDiscoveryState).mockResolvedValue({
      id: 'global',
      isDiscoveryInProgress: false,
      updatedAt: Date.now(),
    });
    vi.mocked(relayCatalogService.getEntries).mockResolvedValue([]);
    vi.mocked(relayCatalogService.updateDiscoveryState).mockResolvedValue();
    vi.mocked(loadSeedRelays).mockResolvedValue({ added: 1, updated: 0, skipped: 0 });
    vi.mocked(relayCatalogService.isDiscoveryStale).mockReturnValue(true);
    /* eslint-enable @typescript-eslint/unbound-method */
    /* eslint-disable @typescript-eslint/unbound-method */
    vi.mocked(relayDiscoveryService.discoverFromRelays).mockResolvedValue({
      discoveredUrls: [],
      processedEvents: 0,
      errors: [],
    });
    /* eslint-enable @typescript-eslint/unbound-method */
    vi.mocked(fetchRelayMetadata).mockResolvedValue({
      success: false,
      url: 'wss://seed1.com',
      error: 'Not found',
      timestamp: Date.now(),
    });
  });

  it('should load seeds and trigger discovery on first run (empty catalog)', async () => {
    /* eslint-disable @typescript-eslint/unbound-method */
    vi.mocked(relayCatalogService.getEntries).mockResolvedValueOnce([]).mockResolvedValueOnce([
        { url: 'wss://seed1.com', hostname: 'seed1.com', isSeed: true, isUserAdded: false, status: 'unknown', createdAt: Date.now(), updatedAt: Date.now() } as RelayCatalogEntry
    ]);
    /* eslint-enable @typescript-eslint/unbound-method */

    await orchestrator.refreshCatalog();

    expect(loadSeedRelays).toHaveBeenCalled();
    /* eslint-disable @typescript-eslint/unbound-method */
    expect(relayCatalogService.updateDiscoveryState).toHaveBeenCalledWith(
      expect.objectContaining({ isDiscoveryInProgress: true }),
      'global'
    );
    expect(relayDiscoveryService.discoverFromRelays).toHaveBeenCalledWith(['wss://seed1.com']);
    expect(relayCatalogService.updateDiscoveryState).toHaveBeenCalledWith(
      expect.objectContaining({ isDiscoveryInProgress: false }),
      'global'
    );
    /* eslint-enable @typescript-eslint/unbound-method */
  });

  it('should trigger discovery only when stale', async () => {
    /* eslint-disable @typescript-eslint/unbound-method */
    vi.mocked(relayCatalogService.getEntries).mockResolvedValue([
      { url: 'wss://seed1.com', hostname: 'seed1.com', isSeed: true, isUserAdded: false, status: 'unknown', createdAt: Date.now(), updatedAt: Date.now() } as RelayCatalogEntry
    ]);
    vi.mocked(relayCatalogService.isDiscoveryStale).mockReturnValue(false);
    /* eslint-enable @typescript-eslint/unbound-method */

    await orchestrator.refreshCatalog();

    /* eslint-disable @typescript-eslint/unbound-method */
    expect(relayDiscoveryService.discoverFromRelays).not.toHaveBeenCalled();

    // Forced refresh should trigger discovery even if not stale
    await orchestrator.refreshCatalog(true);
    expect(relayDiscoveryService.discoverFromRelays).toHaveBeenCalled();
    /* eslint-enable @typescript-eslint/unbound-method */
  });

  it('should prevent duplicate runs if already in progress in-memory', async () => {
    // We can't easily test the in-memory flag without making it public or using a delay
    // but we can test the DB flag.
    /* eslint-disable @typescript-eslint/unbound-method */
    vi.mocked(relayCatalogService.getDiscoveryState).mockResolvedValue({
      id: 'global',
      isDiscoveryInProgress: true,
      updatedAt: Date.now(),
    });
    /* eslint-enable @typescript-eslint/unbound-method */

    await orchestrator.refreshCatalog();

    /* eslint-disable @typescript-eslint/unbound-method */
    expect(relayCatalogService.updateDiscoveryState).not.toHaveBeenCalled();
    /* eslint-enable @typescript-eslint/unbound-method */
  });

  it('should trigger metadata refresh for stale entries', async () => {
    const entry1 = { url: 'wss://relay1.com', hostname: 'relay1.com', isSeed: false, isUserAdded: false, status: 'unknown', createdAt: Date.now(), updatedAt: Date.now() } as RelayCatalogEntry;
    const entry2 = { url: 'wss://relay2.com', hostname: 'relay2.com', isSeed: false, isUserAdded: false, status: 'unknown', createdAt: Date.now(), updatedAt: Date.now() } as RelayCatalogEntry;

    /* eslint-disable @typescript-eslint/unbound-method */
    vi.mocked(relayCatalogService.getEntries).mockResolvedValue([entry1, entry2]);
    vi.mocked(relayCatalogService.isDiscoveryStale).mockReturnValue(false);
    vi.mocked(relayCatalogService.isMetadataStale).mockImplementation((e) => e.url === 'wss://relay1.com');
    /* eslint-enable @typescript-eslint/unbound-method */

    vi.mocked(fetchRelayMetadata).mockResolvedValue({
      success: true,
      url: 'wss://relay1.com',
      metadata: { name: 'Relay 1' },
      timestamp: Date.now(),
    });

    await orchestrator.refreshCatalog();

    expect(fetchRelayMetadata).toHaveBeenCalledWith('wss://relay1.com');
    expect(fetchRelayMetadata).not.toHaveBeenCalledWith('wss://relay2.com');
    /* eslint-disable @typescript-eslint/unbound-method */
    expect(relayCatalogService.upsertEntry).toHaveBeenCalledWith(expect.objectContaining({
      url: 'wss://relay1.com',
      metadata: { name: 'Relay 1' },
      status: 'online'
    }));
    /* eslint-enable @typescript-eslint/unbound-method */
  });

  it('should preserve cache and record error on failure', async () => {
    /* eslint-disable @typescript-eslint/unbound-method */
    vi.mocked(relayCatalogService.getEntries).mockRejectedValueOnce(new Error('DB failure')).mockResolvedValueOnce([]);
    /* eslint-enable @typescript-eslint/unbound-method */

    await orchestrator.refreshCatalog();

    /* eslint-disable @typescript-eslint/unbound-method */
    expect(relayCatalogService.updateDiscoveryState).toHaveBeenCalledWith(
      expect.objectContaining({
        isDiscoveryInProgress: false,
        discoveryStats: expect.objectContaining({
           lastError: 'DB failure'
        })
      }),
      'global'
    );
    /* eslint-enable @typescript-eslint/unbound-method */
  });

  it('should call updateDiscoveryState with correct stats on completion', async () => {
    /* eslint-disable @typescript-eslint/unbound-method */
    vi.mocked(relayCatalogService.getEntries).mockResolvedValue([
      { url: 'wss://seed1.com', hostname: 'seed1.com', isSeed: true, isUserAdded: false, status: 'unknown', createdAt: Date.now(), updatedAt: Date.now() } as RelayCatalogEntry
    ]);

    vi.mocked(relayCatalogService.isDiscoveryStale).mockReturnValue(false);
    /* eslint-enable @typescript-eslint/unbound-method */

    await orchestrator.refreshCatalog();

    /* eslint-disable @typescript-eslint/unbound-method */
    expect(relayCatalogService.updateDiscoveryState).toHaveBeenLastCalledWith(
      expect.objectContaining({
        isDiscoveryInProgress: false,
        discoveryStats: {
          totalDiscovered: 1,
          newFound: 0
        }
      }),
      'global'
    );
    /* eslint-enable @typescript-eslint/unbound-method */
  });

  it('should skip discovery but still run metadata refresh when discovery is fresh', async () => {
    /* eslint-disable @typescript-eslint/unbound-method */
    vi.mocked(relayCatalogService.getEntries).mockResolvedValue([
      { url: 'wss://seed1.com', hostname: 'seed1.com', isSeed: true, isUserAdded: false, status: 'unknown', createdAt: Date.now(), updatedAt: Date.now() } as RelayCatalogEntry
    ]);
    vi.mocked(relayCatalogService.isDiscoveryStale).mockReturnValue(false);
    vi.mocked(relayCatalogService.isMetadataStale).mockReturnValue(true);
    /* eslint-enable @typescript-eslint/unbound-method */

    await orchestrator.refreshCatalog();

    /* eslint-disable @typescript-eslint/unbound-method */
    expect(relayDiscoveryService.discoverFromRelays).not.toHaveBeenCalled();
    /* eslint-enable @typescript-eslint/unbound-method */
    expect(fetchRelayMetadata).toHaveBeenCalledWith('wss://seed1.com');
  });
});
