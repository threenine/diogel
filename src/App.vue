<template>
  <router-view />
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import useAccountStore from 'stores/account-store';

const accountStore = useAccountStore();

onMounted(() => {
  accountStore.listenToStorageChanges();
});
</script>
