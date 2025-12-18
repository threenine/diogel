<template>
  <q-layout>
    <q-header elevated>
      <q-toolbar>
        <q-btn dense flat icon="menu" round>
          <q-menu anchor="bottom left" self="top left">
            <q-list style="min-width: 160px">
              <q-item v-ripple clickable to="/">
                <q-item-section>Home</q-item-section>
              </q-item>
              <q-item v-ripple :to="{ name: 'settings' }" clickable>
                <q-item-section avatar>
                  <q-icon name="settings" size="sm" />
                </q-item-section>
                <q-item-section> Extension Settings </q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
        <q-space />
        <account-dropdown :items="items" />
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import type { Account, DropdownItem } from 'src/types';
import AccountDropdown from 'components/AccountDropdown/Index.vue';
import { get } from 'src/services/chrome-local';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

const storedKeys = ref<Account[]>([]);

async function loadStoredKeys() {
  const storedKeysMap = await get();
  storedKeys.value = Object.values(storedKeysMap);
}

onMounted(async () => {
  await loadStoredKeys();

  // Refresh dropdown items whenever chrome local storage updates our keys
  const handleStorageChange = (
    changes: Record<string, chrome.storage.StorageChange>,
    areaName: string,
  ) => {
    if (areaName !== 'local') return;
    if ('nostr:keys' in changes) {
      // Re-read full keys map so computed items update
      void loadStoredKeys();
    }
  };

  chrome.storage.onChanged.addListener(handleStorageChange);

  onBeforeUnmount(() => {
    chrome.storage.onChanged.removeListener(handleStorageChange);
  });
});

const items = computed<DropdownItem[]>(() => {
  return storedKeys.value.map((key) => ({
    label: key.alias,
    value: key.alias,
  }));
});
</script>
