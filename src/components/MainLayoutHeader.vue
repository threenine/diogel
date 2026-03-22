<script lang="ts" setup>
import AccountDropdown from 'components/AccountDropdown/Index.vue';
import MainNavigation from 'components/MainNavigation.vue';
</script>

<template>
  <q-header>
    <q-toolbar>
      <div class="q-pa-lg-lg">
        <main-navigation />
        <q-img
          src="../../src-bex/assets/images/diogel-header.png"
          style="width: 200px; height: 45px"
        />
      </div>
      <q-space />
      <div class="q-pa-lg-lg"><account-dropdown /></div>
    </q-toolbar>
  </q-header>
</template>

<style scoped></style>
