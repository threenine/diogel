<template>
  <q-layout class="popup-root" view="hHh Lpr lFf">
    <extension-window-header />
    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script lang="ts" setup>
import ExtensionWindowHeader from 'components/ExtensionWindowHeader.vue';
</script>

<style scoped></style>
