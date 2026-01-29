<template>
  <q-layout>
    <main-layout-header />
    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import MainLayoutHeader from 'components/MainLayoutHeader.vue';
</script>
