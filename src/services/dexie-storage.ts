import type { StoredKey } from '../types';
import { db } from './database';

const NOSTR_ACTIVE = 'nostr:active' as const;

export async function get(): Promise<Record<string, StoredKey>> {
  const keys = await db.storedKeys.toArray();
  return keys.reduce(
    (acc, key) => {
      acc[key.alias] = key;
      return acc;
    },
    {} as Record<string, StoredKey>,
  );
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
