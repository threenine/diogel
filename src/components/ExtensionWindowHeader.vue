<script lang="ts" setup>
import AccountDropdown from 'components/AccountDropdown/Index.vue';
import MainNavigation from 'components/MainNavigation.vue';
import useVaultStore from 'src/stores/vault-store';

const vaultStore = useVaultStore();

</script>

<template>
  <q-header>
    <q-toolbar>
      <div class="q-pa-lg-lg">
        <main-navigation />
        <q-img src="/images/diogel.svg" style="width: 35px; height: 35px" />
      </div>
      <q-space />
      <div v-if="vaultStore.isUnlocked" class="q-pa-lg-lg"><account-dropdown /></div>
    </q-toolbar>
  </q-header>
</template>

<style scoped></style>
