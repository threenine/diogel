<script lang="ts" setup>
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import useAccountStore from '../stores/account-store';
import RelayEditor from '../components/RelayEditor.vue';

const { t } = useI18n();
const accountStore = useAccountStore();

const activeStoredKey = computed(() => {
  const activeAlias = accountStore.activeKey;
  const keys = Array.from(accountStore.storedKeys);
  if (!activeAlias) {
    return keys[0];
  }

  return keys.find((k) => k.alias === activeAlias) ?? keys[0];
});

onMounted(async () => {
  await accountStore.getKeys();

  if (!accountStore.activeKey && activeStoredKey.value) {
    await accountStore.setActiveKey(activeStoredKey.value.alias);
  }
});
</script>

<template>
  <q-page class="dashboard-page relay-page">
    <section class="dashboard-hero">
      <h1 class="dashboard-hero-title">{{ t('navigation.relays.label') }}</h1>
      <p class="dashboard-hero-caption">{{ t('navigation.relays.caption') }}</p>
    </section>

    <q-card class="dashboard-card relay-page__card">
      <div v-if="activeStoredKey">
        <RelayEditor :stored-key="activeStoredKey" />
      </div>
      <div v-else class="text-center q-pa-xl">
        <q-icon color="grey-5" name="account_circle" size="4em" />
        <div class="text-h6 text-grey-7 q-mt-md">{{ t('account.noAccounts') }}</div>
        <p class="text-grey-6">{{ t('account.noAccountDesc') }}</p>
        <q-btn
          class="q-mt-md diogel-btn-primary"
          :label="t('account.create')"
          :to="{ name: 'add-new-key' }"
        />
      </div>
    </q-card>
  </q-page>
</template>

<style scoped>
.relay-page {
  width: 100%;
}

.relay-page__card {
  overflow: hidden;
}
</style>
