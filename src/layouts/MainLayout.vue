<template>
  <q-layout view="hHh lpR fFf">
    <q-header elevated>
      <q-toolbar>
        <q-btn dense flat icon="menu" round @click="toggleLeftDrawer" />

        <q-toolbar-title>
          <q-avatar>
            <img alt="Profile Photo" src="../assets/privacy.svg" />
          </q-avatar>
          Title
        </q-toolbar-title>

        <q-space />
        <div class="row items-center no-wrap q-gutter-sm">
          <account-dropdown />
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

    <q-drawer v-model="leftDrawerOpen" elevated overlay side="left">
      <!-- drawer content -->
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import AccountDropdown from 'components/AccountDropdown.vue';
import { useDark } from 'src/composables/useDark';

const leftDrawerOpen = ref(false);
const { isDark, toggle: toggleDark } = useDark();

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value;
}
</script>
