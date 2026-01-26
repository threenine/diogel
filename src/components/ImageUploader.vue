<script lang="ts" setup>
import { onMounted, onUnmounted, ref } from 'vue';
import { useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';
import type { StoredKey } from '../types';

defineOptions({ name: 'ImageUploader' });

defineProps<{
  storedKey: StoredKey;
  label?: string;
}>();

const emit = defineEmits<{
  (e: 'uploaded', url: string): void;
  (e: 'uploading', status: boolean): void;
}>();

const $q = useQuasar();
const { t } = useI18n();

const uploading = ref(false);

const BLOSSOM_UPLOAD_STATUS = 'blossom:upload_status';

onMounted(() => {
  // Check for ongoing or recently completed uploads
  chrome.storage.local.get([BLOSSOM_UPLOAD_STATUS], (result) => {
    const status = result[BLOSSOM_UPLOAD_STATUS];
    if (status) {
      if (status.uploading) {
        uploading.value = true;
        emit('uploading', true);
      } else if (status.url) {
        // If we found a URL, it might be from a completed upload while popup was closed
        emit('uploaded', status.url);
        // Clear the status after processing
        void chrome.storage.local.remove([BLOSSOM_UPLOAD_STATUS]);
      } else if (status.error) {
        $q.notify({
          type: 'negative',
          message: status.error,
        });
        void chrome.storage.local.remove([BLOSSOM_UPLOAD_STATUS]);
      }
    }
  });

  // Listen for changes in upload status
  const storageListener = (
    changes: { [key: string]: chrome.storage.StorageChange },
    areaName: string,
  ) => {
    if (areaName === 'local' && BLOSSOM_UPLOAD_STATUS in changes) {
      const status = changes[BLOSSOM_UPLOAD_STATUS].newValue;
      if (status) {
        if (status.uploading) {
          uploading.value = true;
          emit('uploading', true);
        } else {
          uploading.value = false;
          emit('uploading', false);
          if (status.url) {
            emit('uploaded', status.url);
            $q.notify({
              type: 'positive',
              message: t('profile.uploadSuccess'),
            });
          } else if (status.error) {
            $q.notify({
              type: 'negative',
              message: status.error,
            });
          }
          // Clear status after completion
          void chrome.storage.local.remove([BLOSSOM_UPLOAD_STATUS]);
        }
      }
    }
  };

  chrome.storage.onChanged.addListener(storageListener);

  onUnmounted(() => {
    chrome.storage.onChanged.removeListener(storageListener);
  });
});

function triggerUpload() {
  const url = chrome.runtime.getURL('www/index.html#/uploader');
  void chrome.tabs.create({ url });
}
</script>

<template>
  <div class="inline-block" style="pointer-events: auto">
    <q-btn
      :loading="uploading"
      flat
      icon="cloud_upload"
      round
      type="button"
      @click.capture.stop.prevent="triggerUpload"
      @mousedown.stop
      @mouseup.stop
      @touchstart.stop
      @touchend.stop
    >
      <q-tooltip v-if="label">{{ label }}</q-tooltip>
    </q-btn>
  </div>
</template>
