<template>
  <div
    v-if="vaultStore.isLoading"
    class="flex flex-center fixed-full z-max bg-white text-black"
    style="min-height: 100vh"
  >
    <div class="text-center" style="max-width: 90vw">
      <q-spinner color="primary" size="3em" />
      <div class="q-mt-md text-h6 text-primary">Diogel</div>
      <div class="q-mt-sm text-body2 text-grey-8">Initializing secure environment...</div>

      <div
        class="q-mt-lg p-sm bg-grey-2 rounded-borders text-left"
        style="max-height: 200px; overflow-y: auto; font-family: monospace; font-size: 10px"
      >
        <div v-for="(log, index) in logs" :key="index" class="q-mb-xs">
          {{ log }}
        </div>
      </div>

      <div class="q-mt-xl">
        <q-btn
          color="primary"
          label="Emergency Skip"
          unelevated
          @click="vaultStore.isLoading = false"
        />
      </div>
    </div>
  </div>
  <router-view v-else />
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useQuasar } from 'quasar';
import useAccountStore from './stores/account-store';
import useSettingsStore from './stores/settings-store';
import useVaultStore from './stores/vault-store';
import { useRoute, useRouter } from 'vue-router';

const accountStore = useAccountStore();
const settingsStore = useSettingsStore();
const vaultStore = useVaultStore();
const router = useRouter();
const route = useRoute();
const $q = useQuasar();

const logs = ref<string[]>([]);
const addLog = (msg: string) => {
  const timestamp = new Date().toLocaleTimeString();
  logs.value.push(`[${timestamp}] ${msg}`);
  console.log(`[App] ${msg}`);
};

vaultStore.isLoading = true;

onMounted(async () => {
  addLog('Mounting App.vue...');
  vaultStore.listenToLockChanges();

  // Force show UI after 8 seconds regardless of what happens
  const emergencyTimeout = setTimeout(() => {
    if (vaultStore.isLoading) {
      addLog('EMERGENCY: Forcing isLoading to false after timeout');
      vaultStore.isLoading = false;
    }
  }, 8000);

  window.addEventListener('error', (event) => {
    if (event.error && typeof event.error === 'object' && 'message' in event.error) {
      addLog(`Global Error: ${String(event.error.message)}`);
    } else {
      addLog(`Global Error: ${event.message}`);
    }
  });
  window.addEventListener('unhandledrejection', (event) => {
    addLog(`Unhandled Rejection: ${String(event.reason)}`);
  });
  try {
    accountStore.listenToStorageChanges();
    addLog('Loading settings...');
    // We don't await settings if they take too long, they'll update via listener anyway
    try {
      await Promise.race([
        settingsStore.getSettings(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Settings load timeout')), 1500),
        ),
      ]);
      addLog('Settings loaded');
      // Apply theme after loading settings
      $q.dark.set(settingsStore.darkMode);
      addLog(`Theme set to: ${settingsStore.darkMode ? 'dark' : 'light'}`);
    } catch (e) {
      addLog(`Settings load failed/timed out: ${String(e)}`);
    }
    settingsStore.listenToStorageChanges();

    addLog('Checking vault status...');
    // We attempt checkVaultStatus which handles bridge discovery internally.
    // We'll give it a slightly longer timeout in the log for user awareness
    addLog('Waiting for secure bridge (up to 10s)...');
    await vaultStore.checkVaultStatus();
    addLog(
      `Vault status check complete. exists: ${String(vaultStore.vaultExists)}, unlocked: ${String(vaultStore.isUnlocked)}`,
    );

    // Only redirect if we ARE on home but SHOULD be on login, or vice versa
    const isAtLogin = route.path === '/login' || route.name === 'login';
    if (!vaultStore.isUnlocked && !isAtLogin) {
      addLog(
        `Redirecting to login (current path: ${String(route.path)}, name: ${String(route.name)})`,
      );
      try {
        await router.push({ path: '/login' }); // Use path to be explicit
        addLog(
          `Redirection call finished. New path: ${String(route.path)}, name: ${String(route.name)}`,
        );
      } catch (err) {
        addLog(`Redirection failed: ${String(err)}`);
      }
    } else if (vaultStore.isUnlocked && isAtLogin) {
      addLog('Vault is unlocked but on login page, redirecting to home');
      void router.push({ path: '/' });
    } else {
      addLog('On correct page or no redirect needed');
    }
  } catch (error) {
    addLog(`Initialization error: ${String(error)}`);
  } finally {
    clearTimeout(emergencyTimeout);
    addLog('Initialization complete');
    vaultStore.isLoading = false;
  }
});

watch(
  () => route.path,
  (newPath) => {
    addLog(`Path changed to: ${String(newPath)}`);
    if (vaultStore.isLoading) return;

    if (newPath === '/' && !vaultStore.isUnlocked) {
      addLog('WARNING: At home page while locked. Redirecting to login...');
      void router.push({ path: '/login' });
    } else if (newPath === '/login' && vaultStore.isUnlocked) {
      addLog('WARNING: At login page while unlocked. Redirecting to home...');
      void router.push({ path: '/' });
    }
  },
  { immediate: false },
);

watch(
  () => route.name,
  (newName) => {
    addLog(`Route name changed to: ${String(newName)}`);
    if (vaultStore.isLoading) return;

    if (newName === 'home' && !vaultStore.isUnlocked) {
      addLog('WARNING: At home route while locked. Redirecting to login...');
      void router.push({ path: '/login' });
    } else if (newName === 'login' && vaultStore.isUnlocked) {
      addLog('WARNING: At login route while unlocked. Redirecting to home...');
      void router.push({ path: '/' });
    }
  },
  { immediate: false },
);

watch(
  () => settingsStore.darkMode,
  (isDark) => {
    addLog(`Settings darkMode changed to: ${String(isDark)}`);
    $q.dark.set(isDark);
  },
);

// Watch for vault status changes to handle locking/unlocking globally
watch(
  () => vaultStore.isUnlocked,
  (isUnlocked) => {
    addLog(`isUnlocked changed to: ${String(isUnlocked)}`);
    if (vaultStore.isLoading) return;

    if (!isUnlocked && route.path !== '/login' && route.name !== 'login') {
      addLog('Redirecting to login via watcher');
      void router.push({ path: '/login' });
    } else if (isUnlocked && (route.path === '/login' || route.name === 'login')) {
      addLog('Redirecting to home via watcher');
      void router.push({ path: '/' });
    }
  },
);
</script>
