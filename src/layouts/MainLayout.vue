<template>
  <q-layout view="lHh Lpr lFf">
    <main-layout-header />
    <q-page-container>
      <div class="page-center-container">
        <div class="page-content-wrapper">
          <router-view />
        </div>
      </div>
    </q-page-container>
    <main-layout-footer />
  </q-layout>
</template>

<script setup lang="ts">
import MainLayoutHeader from 'components/MainLayoutHeader.vue';
import MainLayoutFooter from 'components/MainLayoutFooter.vue';
</script>
