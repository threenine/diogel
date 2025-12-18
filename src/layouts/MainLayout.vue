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
import type { DropdownItem } from 'src/types';
import AccountDropdown from 'components/AccountDropdown/Index.vue';

import { computed, onMounted } from 'vue';
import { useAccountStore } from 'stores/account-store';

const accountStore = useAccountStore();

onMounted(async () => {
  // Ensure keys are loaded into the store state on boot
  await accountStore.getKeys();
});

const items = computed<DropdownItem[]>(() => {
  // Directly map from the store's state.
  // Since storedKeys is a Set, we use Array.from() or the spread operator.
  return Array.from(accountStore.storedKeys).map((key) => ({
    label: key.alias,
    value: key.alias,
  }));
});
</script>
