<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import type { StoredKey } from 'src/types';
import ViewStoredKey from 'components/ViewStoredKey/Index.vue';
import ExportButton from 'components/ExportButton.vue';
import useAccountStore from 'stores/account-store';

const { t } = useI18n();
const accountStore = useAccountStore();
const EMPTY_STORED_KEY: StoredKey = {
  id: '',
  alias: '',
  createdAt: '',
  account: {
    privkey: '',
  },
};
const storedKey = ref<StoredKey>({ ...EMPTY_STORED_KEY });
const route = useRoute();

let isHydratingKeys = false;

const storedKeyAliasesSignature = computed(() =>
  Array.from(accountStore.storedKeys)
    .map((item) => item.alias)
    .sort()
    .join('|'),
);

watch(
  [
    () => route.params.alias,
    () => storedKeyAliasesSignature.value,
  ],
  async () => {
    if (!isHydratingKeys) {
      isHydratingKeys = true;
      try {
        await accountStore.getKeys();
      } finally {
        isHydratingKeys = false;
      }
    }

    loadStoredKeys();
  },
  { immediate: true },
);

function loadStoredKeys() {
  const storedKeys = accountStore.storedKeys;
  const requestedAlias = String(route.params.alias ?? '');

  if (!requestedAlias) {
    storedKey.value = { ...EMPTY_STORED_KEY };
    return;
  }

  const account = Array.from(storedKeys).find((item) => item.alias === requestedAlias);
  if (!account) {
    storedKey.value = { ...EMPTY_STORED_KEY };
    return;
  }

  storedKey.value = { ...account };
}
</script>

<template>
  <q-page class="dashboard-page edit-account-page">
    <section class="dashboard-hero">
      <h1 class="dashboard-hero-title">{{ t('account.editAccount') }}</h1>
      <p class="dashboard-hero-caption">{{ t('account.editDashboardCaption') }}</p>
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
