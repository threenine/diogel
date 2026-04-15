<template>
  <q-footer class="bg-transparent text-orange-7 q-pa-sm">
    <div class="text-center text-caption">{{ $t('footer.version') }}: {{ version }} &nbsp;&nbsp;Made with ❤️ by <a href="https://threenine.io" target="_blank" class="text-orange-7">threenine.io</a></div>
  </q-footer>
</template>

<script setup lang="ts">
const version = process.env.APP_VERSION;
</script>

<style scoped>

</style>
