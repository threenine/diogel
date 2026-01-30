<template>
  <q-layout class="extension-window" view="hHh Lpr lFf">
    <extension-window-header />
    <q-page-container class="page-center">
      <div>
        <router-view />
      </div>
    </q-page-container>
  </q-layout>
</template>

<script lang="ts" setup>
import ExtensionWindowHeader from 'components/ExtensionWindowHeader.vue';
</script>

<style scoped>
.extension-window {
  width: 500px;
  height: 600px;
}
.page-center {
  display: flex;
  justify-content: center; /* horizontal center */
}
</style>
