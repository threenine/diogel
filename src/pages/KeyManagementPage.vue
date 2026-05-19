<script lang="ts" setup>
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import useAccountStore from '../stores/account-store';
import ViewStoredKey from 'components/ViewStoredKey/Index.vue';
import ExportButton from 'components/ExportButton.vue';
import WarningCard from 'components/WarningCard.vue';

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
  <q-page class="dashboard-page key-management-page">
    <section class="dashboard-hero">
      <h1 class="dashboard-hero-title">{{ t('navigation.keys.label') }}</h1>
      <p class="dashboard-hero-caption">{{ t('navigation.keys.caption') }}</p>
    </section>

    <q-card class="dashboard-card key-management-page__card">
      <div v-if="activeStoredKey">
        <q-card-section>
          <ViewStoredKey :stored-key="activeStoredKey" />
        </q-card-section>

        <q-card-section class="q-pt-none row justify-end paddings-sm">
          <q-separator horizontal inset />
        </q-card-section>

        <q-card-section class="q-pt-none row justify-end paddings-sm">
          <ExportButton :stored-key="activeStoredKey" />
        </q-card-section>

        <q-separator horizontal class="q-mt-xl q-mb-md" inset />

        <q-card-section class="text-center">
          <warning-card :headline="t('warning.exportKeys')" :message="t('warning.backupNotice')" />
        </q-card-section>
      </div>

      <div v-else class="text-center q-pa-xl">
        <q-icon color="grey-5" name="account_circle" size="4em" />
        <div class="text-h6 text-grey-7 q-mt-md">{{ t('account.noAccounts') }}</div>
        <p class="text-grey-6">{{ t('account.noAccountDesc') }}</p>
        <q-btn class="q-mt-md diogel-btn-primary" :label="t('account.create')" to="/create-account" />
      </div>
    </q-card>
  </q-page>
</template>

<style scoped>
.key-management-page {
  width: 100%;
}

.key-management-page__card {
  overflow: hidden;
}
</style>
