<script lang="ts" setup>
import { computed } from 'vue';
import { useQuasar } from 'quasar';
import AccountDropdown from 'components/AccountDropdown/Index.vue';
import MainNavigation from 'components/MainNavigation.vue';

const $q = useQuasar();

const headerLogo = computed(() => {
  return $q.dark.isActive
    ? '../../src-bex/assets/images/diogel-header-dark.png'
    : '../../src-bex/assets/images/diogel-header-light.png';
});
</script>

<template>
  <q-header>
    <q-toolbar>
      <div class="q-pa-lg-lg">
        <main-navigation />
        <q-img :src="headerLogo" style="width: 200px; height: 45px" />
      </div>
      <q-space />
      <div class="q-pa-lg-lg"><account-dropdown /></div>
    </q-toolbar>
  </q-header>
</template>

<style scoped></style>
