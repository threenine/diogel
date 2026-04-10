import { relayCatalogService } from 'src/services/relay-catalog';
import { db } from 'src/services/database';
import type { RelayCatalogEntry, RelayDiscoveryState } from 'src/types/relay';
import type { HandlerResult } from '../types/background';

/**
 * Handles the 'relay.browser.list' action.
 * Returns the cached relay catalog entries.
 */
export async function handleRelayBrowserList(): Promise<HandlerResult<RelayCatalogEntry[]>> {
  try {
    const entries = await relayCatalogService.getEntries();
    return {
      success: true,
      data: entries,
    };
  } catch (error) {
    console.error('[RelayBrowserHandler] Failed to list relays:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error fetching relay list',
    };
  }
}

/**
 * Handles the 'relay.browser.getStatus' action.
 * Returns the current relay discovery status from the database.
 */
export async function handleRelayBrowserGetStatus(): Promise<HandlerResult<RelayDiscoveryState | null>> {
  try {
    const status = await relayCatalogService.getDiscoveryState('global');
    return {
      success: true,
      data: status,
    };
  } catch (error) {
    console.error('[RelayBrowserHandler] Failed to get discovery status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error fetching discovery status',
    };
  }
}
