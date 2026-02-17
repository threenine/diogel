<template>
  <q-layout class="extension-window-layout" view="hHh Lpr lFf">
    <extension-window-header />
    <q-page-container>
      <div class="page-center-container">
        <div class="page-content-wrapper">
          <router-view />
        </div>
      </div>
    </q-page-container>
  </q-layout>
</template>

<script lang="ts" setup>
import ExtensionWindowHeader from 'components/ExtensionWindowHeader.vue';
</script>

<style>
/* Using global style to affect html/body when this layout is used */
html.extension-popup,
html.extension-popup body {
  width: 550px;
  height: 600px;
  overflow-y: auto;
}

/* Also handle login and other pages if they are opened in the popup */
/* We use the .extension-popup class added in App.vue */
</style>

<style scoped>
.extension-window-layout {
  width: 100%;
  height: 100%;
}
</style>
