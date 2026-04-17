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
          <div class="text-h6 text-center">
            {{ vaultStore.vaultExists ? 'Unlock Vault' : 'Create Vault' }}
          </div>
          <div
            v-if="vaultStore.vaultExists && vaultStore.lastLockReason === 'inactivity'"
            class="q-mt-sm text-center text-orange-8 text-weight-medium"
          >
            Vault locked due to inactivity.
          </div>
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

          <div v-if="loginError" class="q-mt-sm text-negative text-center text-weight-medium">
            {{ loginError }}
          </div>
        </q-card-section>

        <q-card-section v-else>
          <q-input
            v-model="password"
            filled
            label="Password"
            type="password"
            @keyup.enter="handleUnlock"
          />

          <div v-if="loginError" class="q-mt-sm text-negative text-center text-weight-medium">
            {{ loginError }}
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn
            v-if="!vaultStore.vaultExists"
            :loading="loading"
            class="diogel-btn-primary"
            label="Create"
            @click="handleCreate"
          />
          <q-btn v-else :loading="loading" class="diogel-btn-primary" label="Unlock" @click="handleUnlock" />
        </q-card-actions>
      </q-card>
    </div>
  </q-page>
</template>

<script lang="ts" setup>
import { onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useVault } from 'src/composables/useVault';

const {
  vaultStore,
  password,
  confirmPassword,
  loading,
  loginError,
  handleCreate,
  handleUnlock,
} = useVault();

const router = useRouter();
const route = useRoute();

onMounted(async () => {
  if (vaultStore.isLoading) {
    return; // App.vue will handle initial check and redirection
  }
  await vaultStore.checkVaultStatus();

  if (vaultStore.isUnlocked && (route.path === '/login' || route.name === 'login')) {
    await router.push({ name: 'home' });
  }
});

watch(
  () => vaultStore.isUnlocked,
  (unlocked) => {
    if (unlocked && (route.path === '/login' || route.name === 'login')) {
      const redirect = route.query.redirect as string;
      if (redirect) {
        void router.push({ path: redirect, query: route.query });
      } else {
        void router.push({ name: 'home' });
      }
    }
  },
);
</script>

<style scoped>
.vault-card {
  width: 100%;
}
</style>
