<script lang="ts" setup>
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import useAccountStore from '../stores/account-store';
import ProfileView from '../components/ProfileView.vue';

const { t } = useI18n();
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

<template>
  <q-page>
    <div v-if="activeStoredKey" class="full-width">
      <ProfileView :stored-key="activeStoredKey" />
    </div>
    <div v-else class="q-pa-md">
      <div class="text-center">
        <q-icon color="grey-5" name="account_circle" size="4em" />
        <div class="text-h6 text-grey-7 q-mt-md">{{ t('account.noActiveAccount') }}</div>
        <p class="text-grey-6">{{ t('account.noActiveAccountDesc') }}</p>
      </div>
    </div>
  </q-page>
</template>

<style scoped></style>
