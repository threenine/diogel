import { acceptHMRUpdate, defineStore } from 'pinia';

const BLOSSOM_SERVER = 'nostr:blossom-server' as const;
const DEFAULT_BLOSSOM_SERVER = 'https://blossom.threenine.dn';

const useSettingsStore = defineStore('settings', {
  state: () => ({
    blossomServer: DEFAULT_BLOSSOM_SERVER,
    isListening: false,
  }),

  actions: {
    async getSettings(): Promise<void> {
      return new Promise((resolve) => {
        chrome.storage.local.get([BLOSSOM_SERVER], (result) => {
          if (result[BLOSSOM_SERVER]) {
            this.blossomServer = result[BLOSSOM_SERVER];
          }
          resolve();
        });
      });
    },

    async setBlossomServer(url: string): Promise<void> {
      this.blossomServer = url;
      return new Promise((resolve) => {
        chrome.storage.local.set({ [BLOSSOM_SERVER]: url }, () => {
          resolve();
        });
      });
    },

    listenToStorageChanges() {
      if (this.isListening) return;

      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local' && BLOSSOM_SERVER in changes) {
          const newValue = changes[BLOSSOM_SERVER].newValue;
          if (newValue) {
            this.blossomServer = newValue;
          }
        }
      });

      this.isListening = true;
    },
  },
});

export default useSettingsStore;

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useSettingsStore, import.meta.hot));
}
