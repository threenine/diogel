<template>
  <q-page class="flex flex-center">
    <div class="text-h6">Home Page</div>
  </q-page>
</template>

<script lang="ts" setup>
import { onMounted } from 'vue';
import useAccountStore from '../stores/account-store';

const accountStore = useAccountStore();

onMounted(async () => {
  await accountStore.getKeys();
});
</script>
