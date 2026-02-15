<script lang="ts" setup>
import PopupHeader from 'components/PopupHeader.vue';
</script>

<template>
  <q-layout class="popup-root" view="hHh Lpr lFf">
    <div class="popup-header-slot">
      <PopupHeader />
    </div>

    <q-page-container class="popup-container">
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<style>
/* Using global style to affect html/body when this layout is used */
html.extension-popup,
html.extension-popup body {
  width: 500px;
  height: 600px;
  overflow: hidden;
}
</style>

<style scoped>
.popup-root {
  position: relative;
  width: 500px;
  height: 600px;
  max-width: 100vw;
  max-height: 100vh;
  overflow: hidden !important; /* hide outer scrollbars */
  display: flex;
  flex-direction: column;
}

.popup-header-slot {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 10;
}

.popup-container {
  overflow: hidden;
  height: 100%;
  max-height: 100%;
}

.popup-container :deep(.q-page) {
  min-height: 100% !important;
  max-height: 100% !important;
  width: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
</style>
