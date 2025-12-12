<template>
  <q-toggle v-model="checked" color="primary" size="lg" />
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { useDark } from 'src/composables/useDark';

const { isDark, set } = useDark();

const checked = computed({
  get: () => isDark.value,
  set: (v: boolean) => set(v),
});
</script>

<style scoped></style>
