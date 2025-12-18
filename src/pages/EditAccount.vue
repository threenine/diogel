<script lang="ts" setup>
import { ref, watch } from 'vue';
import { exportFile, useQuasar } from 'quasar';
import { get } from 'src/services/chrome-local';
import { useRoute } from 'vue-router';
import type { StoredKey } from 'src/types';
import ViewAccount from 'components/ViewAccount/Index.vue';
import ExportDialog from 'components/ExportDialog.vue';
import { createEncryptedZipBytes, ZIP_MIME_TYPE } from 'src/services/compressor';

const $q = useQuasar();
const storedKey = ref<StoredKey>({
  id: '',
  alias: '',
  createdAt: '',
  account: {
    pubkey: '',
    priKey: '',
    npub: '',
    nsec: '',
    relays: [],
    websites: [],
  },
});
const route = useRoute();
watch(
  () => route.params.alias,
  async () => {
    await loadStoredKeys();
  },
  { immediate: true },
);

async function loadStoredKeys() {
  const storedKeys = await get();
  const requestedAlias = String(route.params.alias ?? '');

  const account = Object.values(storedKeys).find((item) => item.alias === requestedAlias);
  if (!account) return;

  storedKey.value = { ...account };
}
function notifyExportStarted() {
  $q.notify({
    type: 'positive',
    message: 'Export started. You will be prompted to save the file.',
  });
}
const showExportDialog = ref(false);

type ExportPayload = { password: string; filename: string };
function onExportClick() {
  showExportDialog.value = true;
}

async function onExportConfirm(payload: ExportPayload) {
  showExportDialog.value = false;

  const zipBytes = await createEncryptedZipBytes(
    payload.password,
    payload.filename,
    storedKey.value,
  );

  const didStartExport = exportFile(payload.filename, zipBytes, ZIP_MIME_TYPE);
  if (!didStartExport) return;

  notifyExportStarted();
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
                  <view-account :stored-key="storedKey" />
                  <q-input
                    v-model="storedKey.createdAt"
                    class="text-input"
                    label="Saved At"
                    readonly
                  >
                    <template v-slot:prepend>
                      <q-icon name="schedule" />
                    </template>
                  </q-input>
                </div>
                <div class="row justify-end q-gutter-sm q-mt-lg">
                  <q-btn dense label="Export" @click="onExportClick" />
                </div>
              </q-item-section>
            </q-item>
          </q-list>
        </div>
      </div>
    </div>
    <ExportDialog
      v-model="showExportDialog"
      :alias="storedKey.alias.trim()"
      @confirm="onExportConfirm"
    />
  </q-page>
</template>

<style scoped>
.text-input {
  font-size: 12px;
}
</style>
