import { acceptHMRUpdate, defineStore } from 'pinia';
import {
  BLOSSOM_SERVER,
  DARK_MODE,
  FALLBACK_RELAYS,
  storageService,
  VAULT_AUTO_LOCK_MINUTES,
} from 'src/services/storage-service';
import { RELAY_SEEDS } from 'src/data/relay-seeds';

const DEFAULT_BLOSSOM_SERVER = 'https://blossom.primal.net/';
const DEFAULT_VAULT_AUTO_LOCK_MINUTES = 15;
const DEFAULT_FALLBACK_RELAYS = RELAY_SEEDS;

const useSettingsStore = defineStore('settings', {
  state: () => ({
    blossomServer: DEFAULT_BLOSSOM_SERVER,
    darkMode: true, // Default to dark mode as per current observed behavior
    vaultAutoLockMinutes: DEFAULT_VAULT_AUTO_LOCK_MINUTES,
    fallbackRelays: DEFAULT_FALLBACK_RELAYS,
    isListening: false,
  }),

  actions: {
    async getSettings(): Promise<void> {
      const result = await storageService.getMultiple([
        BLOSSOM_SERVER,
        DARK_MODE,
        VAULT_AUTO_LOCK_MINUTES,
        FALLBACK_RELAYS,
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
      if (Array.isArray(result[FALLBACK_RELAYS]) && (result[FALLBACK_RELAYS] as unknown[]).length > 0) {
        this.fallbackRelays = result[FALLBACK_RELAYS] as string[];
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

    async setFallbackRelays(relays: string[]): Promise<void> {
      const filtered = Array.isArray(relays) ? relays.filter(r => typeof r === 'string' && r.length > 0) : [];
      if (filtered.length === 0) {
        this.fallbackRelays = DEFAULT_FALLBACK_RELAYS;
      } else {
        this.fallbackRelays = filtered;
      }
      await storageService.set(FALLBACK_RELAYS, this.fallbackRelays);
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
          if (FALLBACK_RELAYS in changes) {
            const newValue = changes[FALLBACK_RELAYS].newValue;
            if (Array.isArray(newValue) && newValue.length > 0) {
              this.fallbackRelays = newValue as string[];
            } else {
              this.fallbackRelays = DEFAULT_FALLBACK_RELAYS;
            }
          }
        }
      });

      this.isListening = true;
    },
  },
});

export default useSettingsStore;

if (import.meta.hot) {
  import.meta.hot.accept((newModule) => {
    if (newModule) {
      acceptHMRUpdate(useSettingsStore, import.meta.hot)(newModule);
    }
  });
}
