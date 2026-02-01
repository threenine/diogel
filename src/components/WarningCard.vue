<script lang="ts" setup>
defineProps<{ message: string; headline?: string }>();
</script>

<template>
  <q-card bordered class="bg-orange-5">
    <q-card-section class="row items-center">
      <q-icon color="text-white" name="info" size="md" />
      <span class="q-ml-sm text-weight-bold text-white">Important</span>
    </q-card-section>
    <q-card-section class="paddings-sm">
      <p class="paddings-sm text-grey-1 text-weight-bold text-h6">{{headline}}</p>
      <p class="text-grey-1 text-weight-bold">{{ message }}</p>
    </q-card-section>
  </q-card>
</template>

<style scoped></style>
