import { acceptHMRUpdate, defineStore } from 'pinia';
import {
  BLOSSOM_SERVER,
  DARK_MODE,
  storageService,
  VAULT_AUTO_LOCK_MINUTES,
} from 'src/services/storage-service';

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
      const result = await storageService.getMultiple([
        BLOSSOM_SERVER,
        DARK_MODE,
        VAULT_AUTO_LOCK_MINUTES,
      ]);
      if (result[BLOSSOM_SERVER] && typeof result[BLOSSOM_SERVER] === 'string') {
        this.blossomServer = result[BLOSSOM_SERVER];
      }
      if (Object.prototype.hasOwnProperty.call(result, DARK_MODE)) {
        this.darkMode = Boolean(result[DARK_MODE]);
      }
      if (Object.prototype.hasOwnProperty.call(result, VAULT_AUTO_LOCK_MINUTES)) {
        const value = Number(result[VAULT_AUTO_LOCK_MINUTES]);
        this.vaultAutoLockMinutes = Number.isFinite(value)
          ? Math.max(0, Math.floor(value))
          : DEFAULT_VAULT_AUTO_LOCK_MINUTES;
      }
    },

    async setBlossomServer(url: string): Promise<void> {
      this.blossomServer = url;
      await storageService.set(BLOSSOM_SERVER, url);
    },

    async setDarkMode(dark: boolean): Promise<void> {
      this.darkMode = dark;
      await storageService.set(DARK_MODE, dark);
    },

    async setVaultAutoLockMinutes(minutes: number): Promise<void> {
      const normalized = Number.isFinite(minutes) ? Math.max(0, Math.floor(minutes)) : 0;
      this.vaultAutoLockMinutes = normalized;
      await storageService.set(VAULT_AUTO_LOCK_MINUTES, normalized);
    },

    listenToStorageChanges() {
      if (this.isListening) return;

      storageService.onChanged((changes, areaName) => {
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
