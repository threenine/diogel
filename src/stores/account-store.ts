import { acceptHMRUpdate, defineStore } from 'pinia';
import type { StoredKey } from 'src/types';
import { get, save } from 'src/services/chrome-local';

export const useAccountStore = defineStore('account', {
  state: () => ({
    storedKeys: new Set<StoredKey>(),
    isListening: false,
  }),

  getters: {},

  actions: {
    async saveKey(key: StoredKey): Promise<boolean> {
      const result = await save(key);
      if (result) this.storedKeys.add(key);
      return result;
    },
    async getKeys(): Promise<void> {
      this.storedKeys = new Set(Object.values(await get()));
    },
    listenToStorageChanges() {
      if (this.isListening) return;

      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local' && 'nostr:keys' in changes) {
          void this.getKeys();
        }
      });

      this.isListening = true;
    },
  },
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAccountStore, import.meta.hot));
}
