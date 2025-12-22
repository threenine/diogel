<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import useAccountStore from 'src/stores/account-store';


const accountStore = useAccountStore();
onMounted(async () => {
  await accountStore.getKeys();
  model.value = accountStore.activeKey ?? null;
});
const items = computed<string[]>(() => {
  return Array.from(accountStore.storedKeys).map((key) =>key.alias);
});
const model = ref<string | null>(null);

watch(() => accountStore.activeKey, (newKey) => {
  model.value = newKey ?? null;
});

watch(model, async(newValue) => {
  if (newValue) {
    await accountStore.setActiveKey(newValue);
  }
});
</script>

<template>

    <q-select
      filled
      v-model="model"
      :options="items"
      style="width: 250px"
      behavior="menu"
    >
    </q-select>

</template>

<style scoped>

</style>
