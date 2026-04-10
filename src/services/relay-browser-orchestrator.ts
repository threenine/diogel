import { relayCatalogService, loadSeedRelays } from './relay-catalog';
import { relayDiscoveryService } from './relay-discovery';
import { fetchRelayMetadata } from './relay-metadata';
import type { RelayCatalogEntry } from 'src/types/relay';

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
      const initialEntries = await relayCatalogService.getEntries();
      await this.ensureSeedCatalog(initialEntries);

      // 3. Discovery Phase
      await this.runDiscoveryPhase(force);

      // 4. Metadata Refresh Phase
      await this.runMetadataPhase(force);

      // 5. Final State Update: Success
      await this.updateCompletionState(initialEntries.length);

    } catch (error) {
      await this.handleFailure(error);
    } finally {
      this.isRefreshing = false;
    }
  }

  private async ensureSeedCatalog(entries: RelayCatalogEntry[]): Promise<void> {
    if (entries.length === 0) {
      console.log('[RelayBrowserOrchestrator] Catalog empty, loading seed relays...');
      await loadSeedRelays();
    }
  }

  private async runDiscoveryPhase(force: boolean): Promise<void> {
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
  }

  private async runMetadataPhase(force: boolean): Promise<void> {
    console.log('[RelayBrowserOrchestrator] Starting metadata refresh for stale entries...');
    const allEntries = await relayCatalogService.getEntries();
    const staleEntries = allEntries.filter(e => force || relayCatalogService.isMetadataStale(e));

    const CONCURRENCY_LIMIT = 5;
    const activePromises = new Set<Promise<void>>();

    for (const entry of staleEntries) {
      const p = (async () => {
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
      })();

      activePromises.add(p);
      void p.finally(() => activePromises.delete(p));

      if (activePromises.size >= CONCURRENCY_LIMIT) {
        await Promise.race(activePromises);
      }
    }
    await Promise.all(activePromises);
  }

  private async updateCompletionState(initialCount: number): Promise<void> {
    const finalEntries = await relayCatalogService.getEntries();
    await relayCatalogService.updateDiscoveryState({
      isDiscoveryInProgress: false,
      discoveryStats: {
         totalDiscovered: finalEntries.length,
         newFound: finalEntries.length - initialCount,
      }
    }, 'global');
  }

  private async handleFailure(error: unknown): Promise<void> {
    console.error('[RelayBrowserOrchestrator] Refresh failed:', error);
    try {
      const currentEntries = await relayCatalogService.getEntries();
      await relayCatalogService.updateDiscoveryState({
        isDiscoveryInProgress: false,
        discoveryStats: {
           totalDiscovered: currentEntries.length,
           newFound: 0,
           lastError: error instanceof Error ? error.message : String(error),
        }
      }, 'global');
    } catch (innerError) {
      console.error('[RelayBrowserOrchestrator] Failed to update discovery state after error:', innerError);
    }
  }
}

export const relayBrowserOrchestrator = new RelayBrowserOrchestrator();
