<script lang="ts" setup>
import AccountDropdown from 'components/AccountDropdown/Index.vue';
import MainNavigation from 'components/MainNavigation.vue';
</script>

<template>
  <q-header elevated style="background-color: var(--q-dark-page)">
    <q-toolbar>
      <div class="q-pa-lg-lg">
        <main-navigation />
        <q-img src="/images/diogel.svg" style="width: 35px; height: 35px" />
      </div>
      <q-space />
      <div class="q-pa-lg-lg"><account-dropdown /></div>
    </q-toolbar>
  </q-header>
</template>

<style scoped></style>
