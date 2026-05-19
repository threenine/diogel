<script lang="ts" setup>
import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import type { StoredKey } from 'src/types';
import ViewStoredKey from 'components/ViewStoredKey/Index.vue';
import ExportButton from 'components/ExportButton.vue';
import useAccountStore from 'stores/account-store';

const { t } = useI18n();
const accountStore = useAccountStore();
const storedKey = ref<StoredKey>({
  id: '',
  alias: '',
  createdAt: '',
  account: {
    privkey: '',
  },
});
const route = useRoute();
watch(
  () => route.params.alias,
  () => {
    loadStoredKeys();
  },
  { immediate: true },
);

function loadStoredKeys() {
  const storedKeys = accountStore.storedKeys;
  const requestedAlias = String(route.params.alias ?? '');

  const account = Array.from(storedKeys).find((item) => item.alias === requestedAlias);
  if (!account) return;

  storedKey.value = { ...account };
}
</script>

<template>
  <q-page class="dashboard-page edit-account-page">
    <section class="dashboard-hero">
      <h1 class="dashboard-hero-title">{{ t('account.editAccount') }}</h1>
      <p class="dashboard-hero-caption">{{ t('account.profileName') }}</p>
    </section>

    <q-card class="dashboard-card edit-account-page__card">
      <q-card-section class="q-pa-lg">
        <q-input
          v-model="storedKey.alias"
          class="text-input"
          :label="t('account.profileName')"
          readonly
        >
          <template v-slot:prepend>
            <q-icon name="person" />
          </template>
        </q-input>
      </q-card-section>

      <q-separator inset />

      <q-card-section class="q-pa-lg">
        <view-stored-key :stored-key="storedKey" />
      </q-card-section>

      <q-card-section class="row justify-end q-pa-lg q-pt-none">
        <ExportButton :stored-key="storedKey" />
      </q-card-section>
    </q-card>
  </q-page>
</template>

<style scoped>
.edit-account-page {
  width: 100%;
}

.edit-account-page__card {
  overflow: hidden;
}

.text-input {
  font-size: 12px;
}
</style>
