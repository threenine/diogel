import { SimplePool, type Event } from 'nostr-tools';
import { normalizeRelayUrl } from './relay-url';

/**
 * Normalizes and deduplicates a list of relay URLs.
 * @param urls Array of raw relay URL strings
 * @returns Array of unique, normalized, and valid relay URL strings
 */
export function normalizeAndDeduplicateRelays(urls: string[]): string[] {
  const uniqueUrls = new Set<string>();
  for (const url of urls) {
    const result = normalizeRelayUrl(url);
    if (result.valid && result.url) {
      uniqueUrls.add(result.url);
    }
  }
  return Array.from(uniqueUrls);
}

/**
 * Parses a kind 10002 event and extracts relay URLs from its 'r' tags.
 * Kind 10002 tags are formatted as ['r', 'wss://relay.url', 'read|write' (optional)]
 * @param event The Nostr event object (expected kind 10002)
 * @returns Array of raw relay URL strings extracted from the event
 */
export function parseRelayListEvent(event: Event): string[] {
  if (!event || typeof event !== 'object') return [];
  if (event.kind !== 10002) return [];
  if (!Array.isArray(event.tags)) return [];

  const urls: string[] = [];
  for (const tag of event.tags) {
    if (Array.isArray(tag) && tag[0] === 'r' && typeof tag[1] === 'string') {
      urls.push(tag[1]);
    }
  }
  return urls;
}

export interface DiscoveryResult {
  discoveredUrls: string[];
  processedEvents: number;
  errors: string[];
}

const pool = new SimplePool();

/**
 * Bounded relay discovery service that extracts relay candidates from kind 10002 events.
 */
export class RelayDiscoveryService {
  /**
   * Discovers relay candidates by querying a bounded set of relays for kind 10002 events.
   * @param seedRelays Bounded set of relays to query
   * @param limit Maximum number of events to fetch (optional)
   * @returns Structured discovery result
   */
  async discoverFromRelays(seedRelays: string[], limit = 50): Promise<DiscoveryResult> {
    const allUrls: string[] = [];
    const errors: string[] = [];
    let processedCount = 0;

    try {
      // Query for recent kind 10002 events from the seed relays
      const events = await pool.querySync(seedRelays, {
        kinds: [10002],
        limit,
      });

      for (const event of events) {
        try {
          const urls = parseRelayListEvent(event);
          if (urls.length > 0) {
            allUrls.push(...urls);
            processedCount++;
          }
        } catch (err) {
          errors.push(`Error parsing event ${event.id}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    } catch (err) {
      errors.push(`Discovery query failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    return {
      discoveredUrls: normalizeAndDeduplicateRelays(allUrls),
      processedEvents: processedCount,
      errors,
    };
  }

  /**
   * Processes a set of kind 10002 events and returns a list of unique, normalized relay URLs.
   * @param events Array of Nostr events (should be kind 10002)
   * @returns Structured discovery result
   */
  processEvents(events: Event[]): DiscoveryResult {
    const allUrls: string[] = [];
    const errors: string[] = [];
    let processedCount = 0;

    for (const event of events) {
      if (!event) continue;
      try {
        const urls = parseRelayListEvent(event);
        if (urls.length > 0) {
          allUrls.push(...urls);
          processedCount++;
        }
      } catch (err) {
        errors.push(err instanceof Error ? err.message : String(err));
      }
    }

    return {
      discoveredUrls: normalizeAndDeduplicateRelays(allUrls),
      processedEvents: processedCount,
      errors,
    };
  }
}

export const relayDiscoveryService = new RelayDiscoveryService();
