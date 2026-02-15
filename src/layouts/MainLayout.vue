<template>
  <q-layout>
    <main-layout-header />
    <q-page-container>
      <div class="page-center-container">
        <div class="page-content-wrapper">
          <router-view />
        </div>
      </div>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import MainLayoutHeader from 'components/MainLayoutHeader.vue';
</script>
