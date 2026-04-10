import { relayCatalogService, loadSeedRelays } from './relay-catalog';
import { relayDiscoveryService } from './relay-discovery';
import { fetchRelayMetadata } from './relay-metadata';

/**
 * Orchestrates the relay browser refresh flow:
 * - ensures seed relays are loaded if catalog is empty
 * - guards against duplicate concurrent refresh runs
 * - triggers discovery based on staleness or force flag
 * - triggers metadata refresh for stale entries
 * - updates discovery state (progress, last run, errors)
 */
export class RelayBrowserOrchestrator {
  private isRefreshing = false;

  /**
   * Main refresh flow entry point.
   * @param force If true, bypasses staleness checks for discovery and metadata.
   */
  async refreshCatalog(force = false): Promise<void> {
    if (this.isRefreshing) {
      console.log('[RelayBrowserOrchestrator] Refresh already in progress, skipping.');
      return;
    }

    const state = await relayCatalogService.getDiscoveryState('global');
    if (state?.isDiscoveryInProgress) {
       console.log('[RelayBrowserOrchestrator] Discovery already marked in progress in DB, skipping.');
       return;
    }

    this.isRefreshing = true;

    try {
      // 1. Initial State Update: Mark in progress
      await relayCatalogService.updateDiscoveryState({
        isDiscoveryInProgress: true,
      }, 'global');

      // 2. Load Seeds if empty
      const entries = await relayCatalogService.getEntries();
      if (entries.length === 0) {
        console.log('[RelayBrowserOrchestrator] Catalog empty, loading seed relays...');
        await loadSeedRelays();
      }

      // 3. Discovery Phase
      const currentState = await relayCatalogService.getDiscoveryState('global');
      if (force || relayCatalogService.isDiscoveryStale(currentState)) {
        console.log('[RelayBrowserOrchestrator] Triggering discovery...');
        const seeds = (await relayCatalogService.getEntries())
          .filter(e => e.isSeed)
          .map(e => e.url);

        const discoveryResult = await relayDiscoveryService.discoverFromRelays(seeds);

        // Upsert discovered relays
        for (const url of discoveryResult.discoveredUrls) {
          try {
             const hostname = new URL(url).hostname;
             await relayCatalogService.upsertEntry({ url, hostname, source: 'discovery' });
          } catch (e) {
             console.warn(`[RelayBrowserOrchestrator] Failed to parse discovered URL ${url}:`, e);
          }
        }

        await relayCatalogService.updateDiscoveryState({
          lastGlobalDiscoveryAt: Date.now(),
        }, 'global');
      } else {
        console.log('[RelayBrowserOrchestrator] Discovery is fresh, skipping.');
      }

      // 4. Metadata Refresh Phase
      console.log('[RelayBrowserOrchestrator] Starting metadata refresh for stale entries...');
      const allEntries = await relayCatalogService.getEntries();
      const staleEntries = allEntries.filter(e => force || relayCatalogService.isMetadataStale(e));

      // Fetch metadata for stale entries (concurrency limited for safety)
      // For Task 12, we can just do them sequentially or in small batches.
      // Keeping it simple for the initial implementation.
      for (const entry of staleEntries) {
        try {
          const result = await fetchRelayMetadata(entry.url);
          if (result.success && result.metadata) {
            await relayCatalogService.upsertEntry({
              url: entry.url,
              hostname: entry.hostname,
              metadata: result.metadata,
              status: 'online',
              lastChecked: Date.now(),
            });
          } else if (!result.success) {
            await relayCatalogService.upsertEntry({
              url: entry.url,
              hostname: entry.hostname,
              status: 'error',
              lastChecked: Date.now(),
            });
          }
        } catch (e) {
          console.error(`[RelayBrowserOrchestrator] Metadata fetch failed for ${entry.url}:`, e);
        }
      }

      // 5. Final State Update: Success
      await relayCatalogService.updateDiscoveryState({
        isDiscoveryInProgress: false,
        discoveryStats: {
           totalDiscovered: allEntries.length,
           newFound: allEntries.length - entries.length,
        }
      }, 'global');

    } catch (error) {
      console.error('[RelayBrowserOrchestrator] Refresh failed:', error);
      // 6. Final State Update: Failure (preserve cache, record error)
      await relayCatalogService.updateDiscoveryState({
        isDiscoveryInProgress: false,
        discoveryStats: {
           totalDiscovered: (await relayCatalogService.getEntries()).length,
           newFound: 0,
           lastError: error instanceof Error ? error.message : String(error),
        }
      }, 'global');
    } finally {
      this.isRefreshing = false;
    }
  }
}

export const relayBrowserOrchestrator = new RelayBrowserOrchestrator();
