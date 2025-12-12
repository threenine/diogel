<template>
  <q-toggle v-model="checked" color="primary" size="lg" />
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { useQuasar } from 'quasar';
const $q = useQuasar();

const checked = computed({
  get: () => $q.dark.isActive,
  set: (v: boolean) => $q.dark.set(v),
});
</script>

<style scoped></style>
