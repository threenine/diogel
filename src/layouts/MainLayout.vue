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
              <q-item v-ripple clickable to="settings">
                <q-item-section avatar>Extension Settings</q-item-section>
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
import type { DropdownItem, StoredKeys } from 'src/types';
import AccountDropdown from 'components/AccountDropdown/Index.vue';
import { getStoredKeysChromeLocalStorage } from 'src/services/ChromeLocal';
import { computed, onMounted, ref } from 'vue';

const storedKeys = ref<StoredKeys[]>([]);

onMounted(async () => {
  const storedKeysMap = await getStoredKeysChromeLocalStorage();
  storedKeys.value = Object.values(storedKeysMap);
});

const items = computed<DropdownItem[]>(() => {
  return storedKeys.value.map((key) => ({
    label: key.alias,
    value: key.alias,
  }));
});
</script>
