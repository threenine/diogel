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
    vi.mocked(relayCatalogService.getDiscoveryState).mockResolvedValue({
      id: 'global',
      isDiscoveryInProgress: false,
      updatedAt: Date.now(),
    });
    vi.mocked(relayCatalogService.getEntries).mockResolvedValue([]);
    vi.mocked(relayCatalogService.updateDiscoveryState).mockResolvedValue();
    vi.mocked(loadSeedRelays).mockResolvedValue({ added: 1, updated: 0, skipped: 0 });
    vi.mocked(relayCatalogService.isDiscoveryStale).mockReturnValue(true);
    vi.mocked(relayDiscoveryService.discoverFromRelays).mockResolvedValue({
      discoveredUrls: [],
      processedEvents: 0,
      errors: [],
    });
    vi.mocked(fetchRelayMetadata).mockResolvedValue({
      success: false,
      url: 'wss://seed1.com',
      error: 'Not found',
      timestamp: Date.now(),
    });
  });

  it('should load seeds and trigger discovery on first run (empty catalog)', async () => {
    vi.mocked(relayCatalogService.getEntries).mockResolvedValueOnce([]).mockResolvedValueOnce([
        { url: 'wss://seed1.com', hostname: 'seed1.com', isSeed: true } as any
    ]);

    await orchestrator.refreshCatalog();

    expect(loadSeedRelays).toHaveBeenCalled();
    expect(relayCatalogService.updateDiscoveryState).toHaveBeenCalledWith(
      expect.objectContaining({ isDiscoveryInProgress: true }),
      'global'
    );
    expect(relayDiscoveryService.discoverFromRelays).toHaveBeenCalledWith(['wss://seed1.com']);
    expect(relayCatalogService.updateDiscoveryState).toHaveBeenCalledWith(
      expect.objectContaining({ isDiscoveryInProgress: false }),
      'global'
    );
  });

  it('should trigger discovery only when stale', async () => {
    vi.mocked(relayCatalogService.getEntries).mockResolvedValue([
      { url: 'wss://seed1.com', hostname: 'seed1.com', isSeed: true } as any
    ]);
    vi.mocked(relayCatalogService.isDiscoveryStale).mockReturnValue(false);

    await orchestrator.refreshCatalog();

    expect(relayDiscoveryService.discoverFromRelays).not.toHaveBeenCalled();

    // Forced refresh should trigger discovery even if not stale
    await orchestrator.refreshCatalog(true);
    expect(relayDiscoveryService.discoverFromRelays).toHaveBeenCalled();
  });

  it('should prevent duplicate runs if already in progress in-memory', async () => {
    // We can't easily test the in-memory flag without making it public or using a delay
    // but we can test the DB flag.
    vi.mocked(relayCatalogService.getDiscoveryState).mockResolvedValue({
      id: 'global',
      isDiscoveryInProgress: true,
      updatedAt: Date.now(),
    });

    await orchestrator.refreshCatalog();

    expect(relayCatalogService.updateDiscoveryState).not.toHaveBeenCalled();
  });

  it('should trigger metadata refresh for stale entries', async () => {
    const entry1 = { url: 'wss://relay1.com', hostname: 'relay1.com' } as any;
    const entry2 = { url: 'wss://relay2.com', hostname: 'relay2.com' } as any;

    vi.mocked(relayCatalogService.getEntries).mockResolvedValue([entry1, entry2]);
    vi.mocked(relayCatalogService.isDiscoveryStale).mockReturnValue(false);
    vi.mocked(relayCatalogService.isMetadataStale).mockImplementation((e) => e.url === 'wss://relay1.com');

    vi.mocked(fetchRelayMetadata).mockResolvedValue({
      success: true,
      url: 'wss://relay1.com',
      metadata: { name: 'Relay 1' },
      timestamp: Date.now(),
    });

    await orchestrator.refreshCatalog();

    expect(fetchRelayMetadata).toHaveBeenCalledWith('wss://relay1.com');
    expect(fetchRelayMetadata).not.toHaveBeenCalledWith('wss://relay2.com');
    expect(relayCatalogService.upsertEntry).toHaveBeenCalledWith(expect.objectContaining({
      url: 'wss://relay1.com',
      metadata: { name: 'Relay 1' },
      status: 'online'
    }));
  });

  it('should preserve cache and record error on failure', async () => {
    vi.mocked(relayCatalogService.getEntries).mockRejectedValueOnce(new Error('DB failure')).mockResolvedValueOnce([]);

    await orchestrator.refreshCatalog();

    expect(relayCatalogService.updateDiscoveryState).toHaveBeenCalledWith(
      expect.objectContaining({
        isDiscoveryInProgress: false,
        discoveryStats: expect.objectContaining({
           lastError: 'DB failure'
        })
      }),
      'global'
    );
  });
});
