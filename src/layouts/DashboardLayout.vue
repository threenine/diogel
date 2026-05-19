<template>
  <q-layout view="lHh Lpr lFf" class="dashboard-layout">
    <main-layout-header />

    <q-drawer
      v-model="leftDrawerOpen"
      show-if-above
      side="left"
      bordered
      :width="260"
      :breakpoint="1024"
      class="dashboard-layout__drawer"
    >
      <div class="dashboard-layout__drawer-content" />
    </q-drawer>

    <q-page-container>
      <div class="dashboard-page-shell">
        <div class="dashboard-page-shell__toolbar" v-if="$q.screen.lt.lg">
          <q-btn
            flat
            round
            dense
            icon="menu"
            aria-label="Toggle dashboard navigation"
            @click="leftDrawerOpen = !leftDrawerOpen"
          />
        </div>
        <router-view />
      </div>
    </q-page-container>

    <main-layout-footer />
  </q-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useQuasar } from 'quasar';
import MainLayoutHeader from 'components/MainLayoutHeader.vue';
import MainLayoutFooter from 'components/MainLayoutFooter.vue';

const $q = useQuasar();
const leftDrawerOpen = ref($q.screen.gt.md);
</script>
