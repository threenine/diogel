<script setup lang="ts">
import { useAccounts } from 'src/composables/useAccounts';

const { model, items } = useAccounts();
</script>

<template>
  <div class="q-mr-sm q-pa-sm">
    <q-select
      v-model="model"
      :options="items"
      behavior="menu"
      filled
      style="width: 200px"
      emit-value
      map-options
      option-label="label"
      option-value="value"
    >
    </q-select>
  </div>
</template>

<style scoped></style>
