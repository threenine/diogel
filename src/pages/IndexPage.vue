<template>
  <q-page>
    <div v-if="activeStoredKey" class="full-width">
      <ProfileView :stored-key="activeStoredKey" />
      <div  class="text-center q-pb-md text-orange-5 text-caption">
        {{ $t('warning.exportKeys') }}
      </div>
    </div>
    <div v-else class="q-pa-md">
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
