<template>
  <router-view />
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import useAccountStore from './stores/account-store';
import useSettingsStore from './stores/settings-store';

const accountStore = useAccountStore();
const settingsStore = useSettingsStore();

onMounted(async () => {
  accountStore.listenToStorageChanges();
  await settingsStore.getSettings();
  settingsStore.listenToStorageChanges();
});
</script>
