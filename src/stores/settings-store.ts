import { acceptHMRUpdate, defineStore } from 'pinia';

const BLOSSOM_SERVER = 'nostr:blossom-server' as const;
const DARK_MODE = 'nostr:dark-mode' as const;
const DEFAULT_BLOSSOM_SERVER = 'https://blossom.primal.net/';

const useSettingsStore = defineStore('settings', {
  state: () => ({
    blossomServer: DEFAULT_BLOSSOM_SERVER,
    darkMode: true, // Default to dark mode as per current observed behavior
    isListening: false,
  }),

  actions: {
    async getSettings(): Promise<void> {
      return new Promise((resolve) => {
        chrome.storage.local.get([BLOSSOM_SERVER, DARK_MODE], (result) => {
          if (result[BLOSSOM_SERVER]) {
            this.blossomServer = result[BLOSSOM_SERVER];
          }
          if (Object.prototype.hasOwnProperty.call(result, DARK_MODE)) {
            this.darkMode = result[DARK_MODE];
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

    async setDarkMode(dark: boolean): Promise<void> {
      this.darkMode = dark;
      return new Promise((resolve) => {
        chrome.storage.local.set({ [DARK_MODE]: dark }, () => {
          resolve();
        });
      });
    },

    listenToStorageChanges() {
      if (this.isListening) return;

      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local') {
          if (BLOSSOM_SERVER in changes) {
            const newValue = changes[BLOSSOM_SERVER].newValue;
            if (newValue) {
              this.blossomServer = newValue;
            }
          }
          if (DARK_MODE in changes) {
            this.darkMode = changes[DARK_MODE].newValue;
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
