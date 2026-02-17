<template>
  <q-page class="q-pa-md flex flex-center">
    <div class="full-width q-pa-sm" style="max-width: 450px">
      <q-card bordered class="vault-card shadow-2" flat>
        <q-card-section class="flex flex-center q-pt-lg q-pb-none">
          <q-img
            src="../../src-bex/assets/images/login-banner.png"
            style="max-width: 100%; width: 180px; border-radius: 8px"
          />
        </q-card-section>

        <q-card-section>
          <div class="text-h6 text-center">{{ vaultStore.vaultExists ? 'Unlock Vault' : 'Create Vault' }}</div>
        </q-card-section>

      <q-card-section v-if="!vaultStore.vaultExists">
        <p>Set a password for your new vault.</p>

        <q-input
          v-model="password"
          :rules="[(val) => val.length >= 8 || 'Minimum 8 characters']"
          class="q-mb-md"
          filled
          label="Password"
          type="password"
        />
        <q-input
          v-model="confirmPassword"
          :rules="[(val) => val === password || 'Passwords must match']"
          filled
          label="Confirm Password"
          type="password"
        />
      </q-card-section>

      <q-card-section v-else>
        <q-input
          v-model="password"
          filled
          label="Password"
          type="password"
          @keyup.enter="handleUnlock"
        />
      </q-card-section>

      <q-card-actions align="right">
        <q-btn
          v-if="!vaultStore.vaultExists"
          :loading="loading"
          color="primary"
          label="Create"
          @click="handleCreate"
        />
        <q-btn v-else :loading="loading" color="primary" label="Unlock" @click="handleUnlock" />
      </q-card-actions>
      </q-card>
    </div>
  </q-page>
</template>

<script lang="ts" setup>
import { onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import useVaultStore from 'src/stores/vault-store';
// Note: generating mnemonic should ideally be done using a reliable library
import * as nip06 from 'nostr-tools/nip06';
import { getPublicKey } from 'nostr-tools';
import { bytesToHex } from '@noble/hashes/utils';

const vaultStore = useVaultStore();
const router = useRouter();
const route = useRoute();
const $q = useQuasar();

const password = ref('');
const confirmPassword = ref('');
const mnemonic = ref('Generating...'); // In a real app, use a real mnemonic generator
const passphrase = ref('');
const loading = ref(false);

onMounted(async () => {
  console.log('[VaultLogin] Mounted');
  if (vaultStore.isLoading) {
    console.log('[VaultLogin] App is still loading, waiting...');
    return; // App.vue will handle initial check and redirection
  }
  await vaultStore.checkVaultStatus();
  console.log(
    '[VaultLogin] vaultExists:',
    vaultStore.vaultExists,
    'isUnlocked:',
    vaultStore.isUnlocked,
  );

  // Redirection is now primarily handled by App.vue's watchers to prevent loops
  if (vaultStore.isUnlocked && (route.path === '/login' || route.name === 'login')) {
    console.log('[VaultLogin] Already unlocked, redirecting to home');
    await router.push({ name: 'home' });
  }
});

watch(
  () => route.path,
  (newPath) => {
    console.log(`[VaultLogin] Path changed to: ${newPath}`);
  },
);

watch(
  () => vaultStore.isUnlocked,
  (unlocked) => {
    console.log(`[VaultLogin] isUnlocked changed to: ${unlocked}`);
    if (unlocked && (route.path === '/login' || route.name === 'login')) {
      console.log('[VaultLogin] Vault unlocked while on login page, redirecting to home');
      void router.push({ name: 'home' });
    }
  },
);



async function handleCreate() {
  if (password.value.length < 8 || password.value !== confirmPassword.value) {
    return;
  }
  loading.value = true;

  // Generate an initial account from the mnemonic
  let initialAccount = null;
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
    console.error('[VaultLogin] Failed to generate initial account:', e);
  }

  const result = await vaultStore.create(
    password.value,
    mnemonic.value,
    passphrase.value,
    initialAccount,
  );
  loading.value = false;
  if (result.success) {
    console.log('[VaultLogin] Vault created successfully, redirecting to home');
    $q.notify({ type: 'positive', message: 'Vault created successfully' });
    await router.push({ name: 'home' });
  } else {
    console.error('[VaultLogin] Failed to create vault:', result.error);
    $q.notify({ type: 'negative', message: result.error || 'Failed to create vault' });
  }
}

async function handleUnlock() {
  console.log('[VaultLogin] Attempting to unlock vault...');
  loading.value = true;
  const result = await vaultStore.unlock(password.value);
  loading.value = false;
  if (result.success) {
    console.log('[VaultLogin] Vault unlocked successfully, redirecting to home');
    await router.push({ name: 'home' });
  } else {
    console.error('[VaultLogin] Failed to unlock vault:', result.error);
    $q.notify({ type: 'negative', message: result.error || 'Invalid password' });
  }
}
</script>

<style scoped>
.vault-card {
  width: 100%;
}
</style>
