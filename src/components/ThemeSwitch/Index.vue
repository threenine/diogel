<template>
  <q-toggle v-model="checked" color="primary" :size="size" />
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { useQuasar } from 'quasar';

const $q = useQuasar();

defineOptions({ name: 'ThemeSwitch' });

withDefaults(
  defineProps<{
    size?: string;
  }>(),
  {
    size: 'xl',
  },
);
const checked = computed({
  get: () => $q.dark.isActive,
  set: (v: boolean) => $q.dark.set(v),
});
</script>

<style scoped></style>
