<script lang="ts" setup>
import { ref } from 'vue';

const text = ref('test')
</script>

<template>
  <q-page>
    <p>Create Account</p>
    <q-btn label="Create Account" />
    <div class="settings-container">
      <q-input v-model="text" borderless label="Borderless" />
    </div>
  </q-page>
</template>

<style scoped></style>
