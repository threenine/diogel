<template>
  <q-layout>
    <extension-window-header />
    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script lang="ts" setup>
import ExtensionWindowHeader from 'components/ExtensionWindowHeader.vue';
</script>
