
export const NOSTR_ACTIVE = 'nostr:active' as const;
export const BLOSSOM_SERVER = 'nostr:blossom-server' as const;
export const DARK_MODE = 'nostr:dark-mode' as const;
export const VAULT_AUTO_LOCK_MINUTES = 'vault:auto-lock-minutes' as const;
export const VAULT_LAST_ACTIVITY = 'vault:last-activity' as const;
export const BLOSSOM_UPLOAD_STATUS = 'blossom:upload-status' as const;
export const PERMISSIONS_KEY = 'nostr:permissions' as const;
export const VAULT_UNLOCKED = 'vault:unlocked' as const;

export type StorageArea = 'local' | 'session' | 'sync';

export interface StorageService {
  get<T>(key: string, area?: StorageArea): Promise<T | undefined>;
  getMultiple(keys: string[], area?: StorageArea): Promise<Record<string, unknown>>;
  set(key: string, value: unknown, area?: StorageArea): Promise<void>;
  setMultiple(items: Record<string, unknown>, area?: StorageArea): Promise<void>;
  remove(key: string | string[], area?: StorageArea): Promise<void>;
  clear(area?: StorageArea): Promise<void>;
  onChanged(
    callback: (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => void,
  ): void;
  removeOnChanged(
    callback: (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => void,
  ): void;
}

class StorageServiceImpl implements StorageService {
  private getArea(area: StorageArea = 'local'): chrome.storage.StorageArea {
    if (typeof chrome === 'undefined' || !chrome.storage) {
      throw new Error('Chrome storage API is not available');
    }
    return chrome.storage[area];
  }

  async get<T>(key: string, area: StorageArea = 'local'): Promise<T | undefined> {
    const result = await this.getArea(area).get([key]);
    return result[key] as T | undefined;
  }

  async getMultiple(keys: string[], area: StorageArea = 'local'): Promise<Record<string, unknown>> {
    return (await this.getArea(area).get(keys)) as Record<string, unknown>;
  }

  async set(key: string, value: unknown, area: StorageArea = 'local'): Promise<void> {
    await this.getArea(area).set({ [key]: value });
  }

  async setMultiple(items: Record<string, unknown>, area: StorageArea = 'local'): Promise<void> {
    await this.getArea(area).set(items);
  }

  async remove(key: string | string[], area: StorageArea = 'local'): Promise<void> {
    await this.getArea(area).remove(key);
  }

  async clear(area: StorageArea = 'local'): Promise<void> {
    await this.getArea(area).clear();
  }

  onChanged(
    callback: (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => void,
  ): void {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.onChanged.addListener(callback);
    }
  }

  removeOnChanged(
    callback: (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => void,
  ): void {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.onChanged.removeListener(callback);
    }
  }
}

export const storageService: StorageService = new StorageServiceImpl();
