<template>
  <q-page class="flex justify-center"> </q-page>
</template>

<script lang="ts" setup>
import { onMounted } from 'vue';
import useAccountStore from '../stores/account-store';

const accountStore = useAccountStore();

onMounted(async () => {
  await accountStore.getKeys();
});
</script>
