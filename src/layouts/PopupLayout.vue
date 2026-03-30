<script lang="ts" setup>
import PopupHeader from 'components/PopupHeader.vue';
</script>

<template>
  <q-layout class="popup-root" view="hHh Lpr lFf">
    <!-- Header -->
    <div class="popup-header">
      <div class="app-brand">
        <img src="/images/diogel.svg" alt="Diogel" class="app-logo" />
        <span class="app-name">Diogel</span>
      </div>
      <div class="header-actions">
        <PopupHeader />
      </div>
    </div>

    <!-- Content -->
    <q-page-container class="popup-container">
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<style>
html.extension-popup,
html.extension-popup body {
  width: 400px;
  height: 600px;
  overflow: hidden;
}
</style>

<style scoped>
.popup-root {
  display: flex;
  flex-direction: column;
  width: 400px;
  height: 600px;
  background: var(--page-bg);
}

.popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--header-bg);
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.app-brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.app-logo {
  width: 28px;
  height: 28px;
}

.app-name {
  font-weight: 600;
  font-size: 1rem;
  color: var(--text-color);
  letter-spacing: -0.0125em;
}

.header-actions {
  display: flex;
  align-items: center;
}

.popup-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: var(--border-color) transparent;
}

.popup-container::-webkit-scrollbar {
  width: 6px;
}

.popup-container::-webkit-scrollbar-track {
  background: transparent;
}

.popup-container::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 3px;
}
</style>
