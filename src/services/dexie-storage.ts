import type { StoredKey } from 'src/types';
import { db } from './database';

const NOSTR_ACTIVE = 'nostr:active' as const;

export async function get(): Promise<Record<string, StoredKey>> {
  await migrateIfNeeded();
  const keys = await db.storedKeys.toArray();
  return keys.reduce(
    (acc, key) => {
      acc[key.alias] = key;
      return acc;
    },
    {} as Record<string, StoredKey>,
  );
}

async function migrateIfNeeded(): Promise<void> {
  const NOSTR_KEYS = 'nostr:keys';
  return new Promise((resolve) => {
    chrome.storage.local.get([NOSTR_KEYS], (result) => {
      const oldKeys = result[NOSTR_KEYS] as Record<string, StoredKey> | undefined;
      if (oldKeys && Object.keys(oldKeys).length > 0) {
        console.log('Migrating keys from chrome.storage.local to Dexie...');
        const migrationPromises = Object.values(oldKeys).map(async (key) => {
          if (key) {
            try {
              await db.storedKeys.put(JSON.parse(JSON.stringify(key)));
            } catch (e) {
              console.error(`Failed to migrate key:`, e);
            }
          }
        });

        Promise.all(migrationPromises)
          .then(() => {
            chrome.storage.local.remove([NOSTR_KEYS], () => {
              console.log('Migration complete and old keys removed.');
              resolve();
            });
          })
          .catch((err) => {
            console.error('Migration failed:', err);
            resolve(); // Resolve anyway to not block the app
          });
      } else {
        resolve();
      }
    });
  });
}

export async function getActive(): Promise<string | undefined> {
  // We still use chrome.storage.local for the active key alias for now,
  // as it's a simple string and easy to share across extension components.
  // Alternatively, we could store it in a separate table in Dexie.
  return new Promise((resolve) => {
    chrome.storage.local.get([NOSTR_ACTIVE], (result) => {
      resolve(result[NOSTR_ACTIVE]);
    });
  });
}

export async function setActive(alias: string): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [NOSTR_ACTIVE]: alias }, () => {
      resolve();
    });
  });
}

export async function save(storedKey: StoredKey): Promise<void> {
  // Check if a key with the same alias or id already exists
  const existingAlias = await db.storedKeys.where('alias').equals(storedKey.alias).first();
  if (existingAlias) {
    throw new Error('Key with the same alias already exists.');
  }

  const existingId = await db.storedKeys.get(storedKey.id);
  if (existingId) {
    throw new Error('Key with the same npub already exists.');
  }

  await db.storedKeys.add(JSON.parse(JSON.stringify(storedKey)));
  await setActive(storedKey.alias);
}

export async function remove(id: string): Promise<void> {
  await db.storedKeys.delete(id);
}
