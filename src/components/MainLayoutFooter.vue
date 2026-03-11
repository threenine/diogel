<template>
  <q-footer class="bg-transparent text-orange-7 q-pa-sm">
    <div class="text-center text-caption">
      {{ $t('footer.version') }}: {{ version }}
    </div>
  </q-footer>
</template>

<script setup lang="ts">
const version = process.env.APP_VERSION;
</script>

<style scoped>
.q-footer {
  border-top: 1px solid var(--border-color);
}
</style>
