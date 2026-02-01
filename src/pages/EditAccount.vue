<script lang="ts" setup>
import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import type { StoredKey } from 'src/types';
import ViewStoredKey from 'components/ViewStoredKey/Index.vue';
import ExportButton from 'components/ExportButton.vue';
import useAccountStore from 'stores/account-store';

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
  <q-page>
    <div class="settings-container">
      <div class="shadow-0">
        <q-toolbar>
          <q-toolbar-title>Edit Account</q-toolbar-title>
        </q-toolbar>
        <div class="q-pa-lg-lg full-width settings-form rounded-borders">
          <q-list>
            <q-item v-ripple tag="label">
              <q-item-section>
                <div class="q-gutter-lg">
                  <q-input
                    v-model="storedKey.alias"
                    class="text-input"
                    label="Profile Name"
                    readonly
                  >
                    <template v-slot:prepend>
                      <q-icon name="person" />
                    </template>
                  </q-input>
                  <view-stored-key :stored-key="storedKey" />
                </div>
                <div class="row justify-end q-gutter-sm q-mt-lg">
                  <ExportButton :stored-key="storedKey" />
                </div>
              </q-item-section>
            </q-item>
          </q-list>
        </div>
      </div>
    </div>
  </q-page>
</template>

<style scoped>
.text-input {
  font-size: 12px;
}
</style>
