import type { StoredKeys } from 'src/types';

const NOSTR_KEYS = 'nostr:keys' as const;
const NOSTR_ACTIVE_ALIAS = 'nostr:activeAlias' as const;

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

export async function getStoredKeysChromeLocalStorage(): Promise<Record<string, StoredKeys>> {
  const result = await chromeGetLocal<Record<string, StoredKeys>>([NOSTR_KEYS]);
  return result[NOSTR_KEYS] ?? {};
}

export async function saveKeyChromeLocalStorage(payload: StoredKeys): Promise<boolean> {
  const result = await chromeGetLocal<Record<string, StoredKeys>>([NOSTR_KEYS]);

  const existing = result[NOSTR_KEYS];
  const all: Record<string, StoredKeys> = existing ?? {};

  all[payload.alias] = payload;

  await chromeSetLocal({
    [NOSTR_KEYS]: all,
    [NOSTR_ACTIVE_ALIAS]: payload.alias,
  });
  return true;
}
