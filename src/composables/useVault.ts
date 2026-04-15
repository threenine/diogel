import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import useVaultStore from 'src/stores/vault-store';
import type { StoredKey } from 'src/types/bridge';
import * as nip06 from 'nostr-tools/nip06';
import { getPublicKey } from 'nostr-tools';
import { bytesToHex } from '@noble/hashes/utils';
import { type ErrorCode, formatErrorForUser } from 'src/types/error-codes';

export function useVault() {
  const vaultStore = useVaultStore();
  const router = useRouter();
  const route = useRoute();
  const $q = useQuasar();

  const password = ref('');
  const confirmPassword = ref('');
  const mnemonic = ref('Generating...');
  const passphrase = ref('');
  const loading = ref(false);
  const loginError = ref('');

  async function handleCreate() {
    if (password.value.length < 8 || password.value !== confirmPassword.value) {
      return;
    }
    loading.value = true;
    loginError.value = '';

    let initialAccount: StoredKey | undefined = undefined;
    try {
      const sk = nip06.privateKeyFromSeedWords(mnemonic.value, passphrase.value, 0);
      const pk = getPublicKey(sk);
      initialAccount = {
        id: pk,
        alias: 'Main Account',
        createdAt: new Date().toISOString(),
        account: {
          privkey: bytesToHex(sk),
        },
      };
    } catch (e) {
      console.error('[useVault] Failed to generate initial account:', e);
    }

    const result = await vaultStore.create(
      password.value,
      mnemonic.value,
      passphrase.value,
      initialAccount,
    );
    loading.value = false;
    if (result.success) {
      console.log('[useVault] Vault created successfully, redirecting to home');
      $q.notify({ type: 'positive', message: 'Vault created successfully' });
      await router.push({ name: 'home' });
    } else {
      console.error('[useVault] Failed to create vault:', result.error);
      loginError.value = formatErrorForUser(result.error, result.errorCode as ErrorCode);
      $q.notify({
        type: 'negative',
        message: loginError.value,
      });
    }
  }

  async function handleUnlock() {
    console.log('[useVault] Attempting to unlock vault...');
    loading.value = true;
    loginError.value = '';
    const result = await vaultStore.unlock(password.value);
    loading.value = false;
    if (result.success) {
      console.log('[useVault] Vault unlocked successfully');
      const redirect = route.query.redirect as string;
      if (redirect) {
        console.log(`[useVault] Redirecting to: ${redirect}`);
        await router.push({ path: redirect, query: route.query });
      } else {
        console.log('[useVault] Redirecting to home');
        await router.push({ name: 'home' });
      }
    } else {
      console.error('[useVault] Failed to unlock vault:', result.error);
      loginError.value = formatErrorForUser(result.error, result.errorCode as ErrorCode);
      $q.notify({
        type: 'negative',
        message: loginError.value,
      });
    }
  }

  async function handleLock() {
    await vaultStore.lock();
    void router.push({ name: 'login' });
  }

  return {
    vaultStore,
    password,
    confirmPassword,
    mnemonic,
    passphrase,
    loading,
    loginError,
    handleCreate,
    handleUnlock,
    handleLock,
  };
}
