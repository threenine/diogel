import { acceptHMRUpdate, defineStore } from 'pinia';

const BLOSSOM_SERVER = 'nostr:blossom-server' as const;
const DARK_MODE = 'nostr:dark-mode' as const;
const VAULT_AUTO_LOCK_MINUTES = 'vault:auto-lock-minutes' as const;
const DEFAULT_BLOSSOM_SERVER = 'https://blossom.primal.net/';
const DEFAULT_VAULT_AUTO_LOCK_MINUTES = 15;

const useSettingsStore = defineStore('settings', {
  state: () => ({
    blossomServer: DEFAULT_BLOSSOM_SERVER,
    darkMode: true, // Default to dark mode as per current observed behavior
    vaultAutoLockMinutes: DEFAULT_VAULT_AUTO_LOCK_MINUTES,
    isListening: false,
  }),

  actions: {
    async getSettings(): Promise<void> {
      return new Promise((resolve) => {
        chrome.storage.local.get(
          [BLOSSOM_SERVER, DARK_MODE, VAULT_AUTO_LOCK_MINUTES],
          (result) => {
            if (result[BLOSSOM_SERVER]) {
              this.blossomServer = result[BLOSSOM_SERVER];
            }
            if (Object.prototype.hasOwnProperty.call(result, DARK_MODE)) {
              this.darkMode = result[DARK_MODE];
            }
            if (Object.prototype.hasOwnProperty.call(result, VAULT_AUTO_LOCK_MINUTES)) {
              const value = Number(result[VAULT_AUTO_LOCK_MINUTES]);
              this.vaultAutoLockMinutes = Number.isFinite(value)
                ? Math.max(0, Math.floor(value))
                : DEFAULT_VAULT_AUTO_LOCK_MINUTES;
            }
            resolve();
          },
        );
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

    async setVaultAutoLockMinutes(minutes: number): Promise<void> {
      const normalized = Number.isFinite(minutes) ? Math.max(0, Math.floor(minutes)) : 0;
      this.vaultAutoLockMinutes = normalized;
      return new Promise((resolve) => {
        chrome.storage.local.set({ [VAULT_AUTO_LOCK_MINUTES]: normalized }, () => {
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
          if (VAULT_AUTO_LOCK_MINUTES in changes) {
            const newValue = Number(changes[VAULT_AUTO_LOCK_MINUTES].newValue);
            this.vaultAutoLockMinutes = Number.isFinite(newValue)
              ? Math.max(0, Math.floor(newValue))
              : DEFAULT_VAULT_AUTO_LOCK_MINUTES;
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
