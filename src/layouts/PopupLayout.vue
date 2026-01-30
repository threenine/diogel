<script lang="ts" setup>
import PopupHeader from 'components/PopupHeader.vue';
</script>

<template>
  <q-layout class="popup-root" view="hHh Lpr lFf">
    <div class="absolute-top-right q-mr-sm q-mt-sm">
      <popup-header />
    </div>

    <q-page-container class="popup-container">
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<style scoped>
.popup-root {
  height: 300px; /* <-- set your desired max popup height */
  overflow: hidden; /* hide outer scrollbars */
}
.popup-container :deep(.q-page) {
  min-height: 0;
  width: 100%;
}
</style>
