<template>
  <q-layout view="hHh lpR fFf">
    <q-header elevated>
      <q-toolbar>
        <q-btn dense flat icon="menu" round>
          <q-menu anchor="bottom left" self="top left">
            <q-list style="min-width: 160px">
              <q-item v-ripple clickable to="/">
                <q-item-section>Home</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>

        <q-space />
        <div class="row items-center no-wrap q-gutter-sm">
          <account-dropdown :items="items" />
          <q-btn
            :icon="isDark ? 'light_mode' : 'dark_mode'"
            aria-label="Toggle Dark Mode"
            dense
            flat
            round
            @click="toggleDark"
          />
        </div>
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import type { DropdownItem } from 'src/types';
import AccountDropdown from 'components/AccountDropdown.vue';
import { useDark } from 'src/composables/useDark';

const { isDark, toggle: toggleDark } = useDark();

const items: DropdownItem[] = [
  { label: 'Home', value: '/' },
  { label: 'Profile', value: 'profile' },
  { label: 'Settings', value: 'settings' },
];
</script>
