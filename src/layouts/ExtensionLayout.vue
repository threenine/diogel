<template>
  <q-layout class="extension-window" view="hHh Lpr lFf">
    <extension-window-header />
    <q-separator />
    <q-page-container class="page-container">
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script lang="ts" setup>
import ExtensionWindowHeader from 'components/ExtensionWindowHeader.vue';
</script>

<style scoped>
.extension-window {
  width: 550px;
  height: 600px;
}
.page-container {
  width: 100%;
  height: 100%;
}
</style>
