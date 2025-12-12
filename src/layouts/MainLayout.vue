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
        <index :items="items" />
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import type { DropdownItem } from 'src/types';
import Index from 'components/AccountDropdown/Index.vue';

const items: DropdownItem[] = [
  { label: 'Home', value: '/' },
  { label: 'Profile', value: 'profile' },
  { label: 'Settings', value: 'settings' },
];
</script>
