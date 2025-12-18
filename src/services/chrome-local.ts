import type { StoredKey } from 'src/types';

const NOSTR_KEYS = 'nostr:keys' as const;
const NOSTR_ACTIVE = 'nostr:active' as const;

function chromeGetLocal<T = unknown>(keys: string[]): Promise<Record<string, T>> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(keys, (result) => {
      const err = chrome.runtime?.lastError;
      if (err) {
        reject(new Error(err.message || 'chrome.storage.local.get failed'));
        return;
      }
      resolve(result as Record<string, T>);
    });
  });
}

function chromeSetLocal(items: Record<string, unknown>): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(items, () => {
      const err = chrome.runtime?.lastError;
      if (err) {
        reject(new Error(err.message || 'chrome.storage.local.set failed'));
        return;
      }
      resolve();
    });
  });
}

export async function get(): Promise<Record<string, StoredKey>> {
  const result = await chromeGetLocal<Record<string, StoredKey>>([NOSTR_KEYS]);
  return result[NOSTR_KEYS] ?? {};
}
export async function getActive(): Promise<string | undefined> {
  const result = await chromeGetLocal<string>([NOSTR_ACTIVE]);
  return result[NOSTR_ACTIVE];
}
export async function setActive(alias: string): Promise<void> {
  await chromeSetLocal({ [NOSTR_ACTIVE]: alias });
}
export async function save(storedKey: StoredKey): Promise<void> {
  const result = await chromeGetLocal<Record<string, StoredKey>>([NOSTR_KEYS]);
  const all: Record<string, StoredKey> = result[NOSTR_KEYS] ?? {};

  // Check if a key with the same alias or id already exists
  for (const key in all) {
    const existingKey = all[key];
    if (existingKey?.alias === storedKey.alias || existingKey?.id === storedKey.id) {
      throw new Error('Key with the same alias or npub already exists.');
    }
  }

  all[storedKey.alias] = storedKey;

  await chromeSetLocal({
    [NOSTR_KEYS]: all,
    [NOSTR_ACTIVE]: storedKey.alias,
  });
}
