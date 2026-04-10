import type { RelayCatalogEntry } from 'src/types/relay';
import { sendBexMessage } from './vault-service';

/**
 * Fetch cached relay catalog entries from the background.
 */
export async function listRelayCatalog(): Promise<RelayCatalogEntry[]> {
  try {
    const data = await sendBexMessage('relay.browser.list');
    return data || [];
  } catch (error) {
    console.error('[RelayService] Failed to fetch relay catalog:', error);
    return [];
  }
}
