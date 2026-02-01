import { acceptHMRUpdate, defineStore } from 'pinia';
import {
  createVault as createVaultBex,
  hasVault as hasVaultBex,
  isVaultUnlocked as isVaultUnlockedBex,
  lockVault as lockVaultBex,
  unlockVault as unlockVaultBex,
} from 'src/services/vault-service';

const useVaultStore = defineStore('vault', {
  state: () => ({
    isUnlocked: false,
    vaultExists: false,
    isLoading: false,
  }),

  actions: {
    listenToLockChanges() {
      // @ts-expect-error bex is not typed on window
      const bridge = window.bridge || window.$q?.bex;
      if (bridge) {
        bridge.on(
          'vault.lock-status-changed',
          ({ payload }: { payload: { unlocked: boolean } }) => {
            console.log('[VaultStore] Lock status changed from background:', payload.unlocked);
            this.isUnlocked = payload.unlocked;
          },
        );
      }
    },

    async checkVaultStatus() {
      console.log('[VaultStore] checkVaultStatus starting...');
      // Note: we don't set this.isLoading = true here anymore because App.vue handles the initial loading state
      // to avoid race conditions.
      try {
        console.log('[VaultStore] checkVaultStatus calling hasVaultBex...');
        this.vaultExists = await hasVaultBex();
        console.log('[VaultStore] checkVaultStatus vaultExists:', this.vaultExists);
        if (this.vaultExists) {
          console.log('[VaultStore] checkVaultStatus calling isVaultUnlockedBex...');
          this.isUnlocked = await isVaultUnlockedBex();
          console.log('[VaultStore] checkVaultStatus isUnlocked:', this.isUnlocked);
        } else {
          this.isUnlocked = false;
        }
      } catch (e) {
        console.error('[VaultStore] Failed to check vault status', e);
      } finally {
        console.log('[VaultStore] checkVaultStatus finished');
      }
    },

    async unlock(password: string) {
      const result = await unlockVaultBex(password);
      if (result.success) {
        this.isUnlocked = true;
        return { success: true };
      }
      return { success: false, error: result.error };
    },

    async lock() {
      await lockVaultBex();
      this.isUnlocked = false;
    },

    async create(
      password: string,
      mnemonic: string,
      passphrase?: string,
      initialAccount?: unknown,
    ) {
      const vaultData = {
        mnemonic,
        passphrase: passphrase || '',
        createdAt: new Date().toISOString(),
        accounts: initialAccount ? [initialAccount] : [],
      };
      const result = await createVaultBex(password, vaultData);
      if (result.success) {
        this.vaultExists = true;
        this.isUnlocked = true;
        return { success: true };
      }
      return { success: false, error: result.error };
    },
  },
});

export default useVaultStore;

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useVaultStore, import.meta.hot));
}
