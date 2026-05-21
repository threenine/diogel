<script lang="ts" setup>
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import useAccountStore from '../stores/account-store';
import KeyManagementTable from 'components/key-management/KeyManagementTable.vue';

const { t } = useI18n();
const accountStore = useAccountStore();

const storedKeys = computed(() => Array.from(accountStore.storedKeys));

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

    <section class="key-management-page__security-warning" :aria-label="t('keyManagement.securityWarning.title')">
      <q-icon class="key-management-page__security-icon" name="warning_amber" aria-hidden="true" />
      <div>
        <h2 class="key-management-page__security-title">{{ t('keyManagement.securityWarning.title') }}</h2>
        <p class="key-management-page__security-message">{{ t('keyManagement.securityWarning.message') }}</p>
      </div>
    </section>

    <q-card class="dashboard-card key-management-page__card">
      <q-card-section class="row q-col-gutter-sm justify-end items-center">
        <div>
          <q-btn
            :label="t('keyManagement.importKey')"
            :to="{ name: 'import-key' }"
            class="diogel-btn-secondary q-mr-sm"
            no-caps
            outline
          />
          <q-btn
            :label="t('keyManagement.addNewKey')"
            :to="{ name: 'add-new-key' }"
            class="diogel-btn-primary"
            no-caps
          />
        </div>
      </q-card-section>

      <q-separator inset />

      <q-card-section>
        <key-management-table :keys="storedKeys" />
      </q-card-section>
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

.key-management-page__security-warning {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 16px;
  padding: 12px 14px;
  border: 1px solid var(--q-warning);
  border-radius: 12px;
  background: color-mix(in srgb, var(--q-warning) 14%, transparent);
}

.key-management-page__security-icon {
  color: var(--q-warning);
}

.key-management-page__security-title {
  margin: 0;
  font-size: 1rem;
  line-height: 1.2;
  font-weight: 600;
}

.key-management-page__security-message {
  margin: 4px 0 0;
  line-height: 1.4;
}
</style>
