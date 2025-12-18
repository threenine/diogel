import { defineStore, acceptHMRUpdate } from 'pinia';
import type { StoredKey } from 'src/types';

export const useAccountStore = defineStore('account', {
  state: () => ({
    storedKeys: new Set<StoredKey>(),
  }),

  getters: {

  },

  actions: {
    saveKey(key: StoredKey) {

    }
  },
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAccountStore, import.meta.hot));
}
