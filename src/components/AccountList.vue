<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import useAccountStore from 'src/stores/account-store';

const accountStore = useAccountStore();
onMounted(async () => {
  await accountStore.getKeys();
  model.value = accountStore.activeKey ?? null;
});
const items = computed<string[]>(() => {
  return Array.from(accountStore.storedKeys)
    .filter((key) => key.alias !== 'Main Account')
    .map((key) => key.alias);
});
const model = ref<string | null>(null);

watch(
  () => accountStore.activeKey,
  (newKey) => {
    model.value = newKey ?? null;
  },
);

watch(model, async (newValue) => {
  if (newValue) {
    await accountStore.setActiveKey(newValue);
  }
});
</script>

<template>
  <div class="q-mr-sm q-pa-sm">
    <q-select v-model="model" :options="items" behavior="menu" filled style="width: 250px">
    </q-select>
  </div>
</template>

<style scoped></style>
