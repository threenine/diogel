<script lang="ts" setup>
import { ref } from 'vue';
import { exportFile, useQuasar } from 'quasar';
import type { StoredKey } from 'src/types';
import ExportDialog from 'components/ExportDialog.vue';
import { createEncryptedZipBytes, ZIP_MIME_TYPE } from 'src/services/compressor';

defineOptions({ name: 'ExportButton' });

const props = defineProps<{
  storedKey: StoredKey;
}>();

const $q = useQuasar();
const showExportDialog = ref(false);

type ExportPayload = { password: string; filename: string };

function notifyExportStarted() {
  $q.notify({
    type: 'positive',
    message: 'Export started. You will be prompted to save the file.',
  });
}

function onExportClick() {
  showExportDialog.value = true;
}

async function onExportConfirm(payload: ExportPayload) {
  showExportDialog.value = false;

  const zipBytes = await createEncryptedZipBytes(
    payload.password,
    payload.filename,
    props.storedKey,
  );

  const didStartExport = exportFile(payload.filename, zipBytes, ZIP_MIME_TYPE);
  if (!didStartExport) return;

  notifyExportStarted();
}
</script>

<template>
  <q-btn dense label="Export" @click="onExportClick" />

  <ExportDialog
    v-model="showExportDialog"
    :alias="props.storedKey.alias.trim()"
    @confirm="onExportConfirm"
  />
</template>
