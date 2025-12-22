<script lang="ts" setup>
import PopupHeader from 'components/PopupHeader.vue';
</script>

<template>
  <q-layout view="hHh Lpr lFf">
    <popup-header />
    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<style scoped></style>
