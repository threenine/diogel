import { acceptHMRUpdate, defineStore } from 'pinia';
import type { StoredKey } from 'src/types';
import { get, getActive, save, setActive } from 'src/services/dexie-storage';

const useAccountStore = defineStore('account', {
  state: () => ({
    storedKeys: new Set<StoredKey>(),
    isListening: false,
    activeKey: undefined as string | undefined,
  }),

  getters: {},

  actions: {
    async saveKey(storedKey: StoredKey): Promise<void> {
      try {
        await save(storedKey);
        this.storedKeys.add(storedKey);
      } catch (error) {
        console.error('Failed to save key:', error);
        throw error;
      }
    },
    async getKeys(): Promise<void> {
      this.storedKeys = new Set(Object.values(await get()));
      this.activeKey = await getActive();
    },
    async setActiveKey(alias: string) {
      this.activeKey = alias;
      await setActive(alias);
    },
    listenToStorageChanges() {
      if (this.isListening) return;

      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local' && 'nostr:active' in changes) {
          void this.getKeys();
        }
      });

      this.isListening = true;
    },
  },
});
export default useAccountStore;

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAccountStore, import.meta.hot));
}
