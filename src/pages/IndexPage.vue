<template>
  <q-page class="flex flex-center">
    <div v-if="activeStoredKey" class="q-pa-xl full-width" style="max-width: 900px">
      <q-card>
        <q-card-section class="text-h6">
          <ProfileView :stored-key="activeStoredKey" />
        </q-card-section>
      </q-card>
    </div>
    <div v-else class="q-pa-xl">
      <div class="text-center">
        <q-icon color="grey-5" name="account_circle" size="4em" />
        <div class="text-h6 text-grey-7 q-mt-md">No active account</div>
        <p class="text-grey-6">Please select or create an account in the Accounts tab.</p>
      </div>
    </div>
  </q-page>
</template>

<script lang="ts" setup>
import { computed, onMounted } from 'vue';
import useAccountStore from '../stores/account-store';
import ProfileView from '../components/ProfileView.vue';

const accountStore = useAccountStore();

const activeStoredKey = computed(() => {
  const activeAlias = accountStore.activeKey;
  if (!activeAlias) return undefined;
  return Array.from(accountStore.storedKeys).find((k) => k.alias === activeAlias);
});

onMounted(async () => {
  await accountStore.getKeys();
});
</script>
