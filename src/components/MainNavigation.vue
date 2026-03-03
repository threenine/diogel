<script setup lang="ts">
import useVaultStore from 'src/stores/vault-store';
import { useRouter } from 'vue-router';

const vaultStore = useVaultStore();
const router = useRouter();

function openInTab(name: string) {
  const resolved = router.resolve({ name });
  const url = chrome.runtime.getURL(`www/index.html${resolved.href}`);
  void chrome.tabs.create({ url });
}
async function handleLogout() {
  await vaultStore.lock();
  void router.push({ name: 'login' });
}
</script>

<template>
  <q-btn dense flat icon="menu" round>
    <q-menu anchor="bottom left" self="top left">
      <q-list style="max-width: 300px">
        <q-item v-ripple clickable @click="openInTab('profile')">
          <q-item-section avatar>
            <q-icon name="person" size="sm" />
          </q-item-section>
          <q-item-section>Profile</q-item-section>
        </q-item>
        <q-item v-ripple clickable @click="openInTab('settings')">
          <q-item-section avatar>
            <q-icon name="settings" size="sm" />
          </q-item-section>
          <q-item-section> Extension Settings </q-item-section>
        </q-item>
        <q-item v-ripple clickable @click="openInTab('logs')">
          <q-item-section avatar>
            <q-icon name="flaky" size="sm" />
          </q-item-section>
          <q-item-section>Logs</q-item-section>
        </q-item>
        <q-separator />
        <q-item v-ripple clickable @click="handleLogout">
          <q-item-section avatar>
            <q-icon name="lock" size="sm" />
          </q-item-section>
          <q-item-section> Lock </q-item-section>
        </q-item>
      </q-list>
    </q-menu>
  </q-btn>
</template>

<style scoped></style>
