import { db } from 'src/services/database';
import { normalizeRelayUrl } from 'src/services/relay-url';
import type { RelayCatalogEntry } from 'src/types/relay';
import { RELAY_SEEDS } from 'src/data/relay-seeds';

/**
 * Loads seed relays into the catalog if they are missing or if we need to mark them as seeds.
 * Skips invalid seeds.
 * Preserves existing richer metadata if the entry already exists.
 */
export async function loadSeedRelays(): Promise<{ added: number; updated: number; skipped: number }> {
  let added = 0;
  let updated = 0;
  let skipped = 0;

  for (const seedUrl of RELAY_SEEDS) {
    const result = normalizeRelayUrl(seedUrl);

    if (!result.valid || !result.url || !result.hostname) {
      skipped++;
      continue;
    }

    const { url, hostname } = result;

    try {
      await db.transaction('rw', db.relayCatalog, async () => {
        const existing = await db.relayCatalog.get(url);

        if (existing) {
          // If it already exists, only update if it wasn't already marked as seed
          if (!existing.isSeed) {
            await db.relayCatalog.update(url, {
              isSeed: true,
              updatedAt: Date.now(),
            });
            updated++;
          }
        } else {
          // New seed entry
          const now = Date.now();
          const entry: RelayCatalogEntry = {
            url,
            hostname,
            isUserAdded: false,
            isSeed: true,
            status: 'unknown',
            createdAt: now,
            updatedAt: now,
            source: 'seed',
          };
          await db.relayCatalog.add(entry);
          added++;
        }
      });
    } catch (e) {
      console.error(`[RelayCatalog] Failed to upsert seed ${url}:`, e);
      skipped++;
    }
  }

  return { added, updated, skipped };
}
