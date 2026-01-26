<script lang="ts" setup>
import { onMounted, onUnmounted, ref } from 'vue';
import { useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';
import type { StoredKey } from '../types';

defineOptions({ name: 'ImageUploader' });

const props = defineProps<{
  storedKey: StoredKey;
  label?: string;
  uploadId?: string;
}>();

const emit = defineEmits<{
  (e: 'uploaded', url: string): void;
  (e: 'uploading', status: boolean): void;
  (e: 'avatar-uploaded', url: string): void;
  (e: 'avatar-uploading', status: boolean): void;
  (e: 'banner-uploaded', url: string): void;
  (e: 'banner-uploading', status: boolean): void;
}>();

const $q = useQuasar();
const { t } = useI18n();

const uploading = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

const BLOSSOM_UPLOAD_STATUS = props.uploadId
  ? `blossom:upload_status:${props.uploadId}`
  : 'blossom:upload_status';

function emitStatus(type: 'uploading' | 'uploaded', value: boolean | string) {
  // Always emit the generic one
  if (type === 'uploading') {
    emit('uploading', value as boolean);
  } else {
    emit('uploaded', value as string);
  }

  // Also emit the specific one if uploadId is set
  if (props.uploadId) {
    if (props.uploadId === 'avatar') {
      if (type === 'uploading') {
        emit('avatar-uploading', value as boolean);
      } else {
        emit('avatar-uploaded', value as string);
      }
    } else if (props.uploadId === 'banner') {
      if (type === 'uploading') {
        emit('banner-uploading', value as boolean);
      } else {
        emit('banner-uploaded', value as string);
      }
    }
  }
}

async function handleFileChange(e: Event) {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files.length > 0 && target.files[0]) {
    await uploadImage(target.files[0]);
  }
}

async function uploadImage(file: File) {
  uploading.value = true;
  emitStatus('uploading', true);

  try {
    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve, reject) => {
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        if (base64) {
          resolve(base64);
        } else {
          reject(new Error('Failed to extract base64 data'));
        }
      };
      reader.onerror = reject;
    });

    reader.readAsDataURL(file);
    const base64Data = await base64Promise;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bex = ($q as any).bex;
    if (!bex) {
      throw new Error('BEX bridge not available');
    }

    // We use the settings store to get the blossom server
    const useSettingsStore = (await import('../stores/settings-store')).default;
    const settingsStore = useSettingsStore();
    await settingsStore.getSettings();

    await bex.send({
      event: 'blossom.upload',
      to: 'background',
      payload: {
        base64Data,
        fileType: file.type,
        blossomServer: settingsStore.blossomServer,
        uploadId: props.uploadId,
      },
    });

    // Success notification is handled by the storage listener
  } catch (error: unknown) {
    console.error('Error uploading image:', error);
    let errorMessage = t('profile.uploadError');
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'object' && error !== null) {
      // BEX errors often come back as objects with a message property
      errorMessage =
        ((error as Record<string, unknown>).message as string) || JSON.stringify(error);
    } else if (typeof error === 'string') {
      errorMessage = error;
    }

    $q.notify({
      type: 'negative',
      message: errorMessage,
    });
    uploading.value = false;
    emitStatus('uploading', false);
  }
}

onMounted(() => {
  // Check for ongoing or recently completed uploads
  chrome.storage.local.get([BLOSSOM_UPLOAD_STATUS], (result) => {
    const status = result[BLOSSOM_UPLOAD_STATUS];
    if (status) {
      if (status.uploading) {
        uploading.value = true;
        emitStatus('uploading', true);
      } else if (status.url) {
        // If we found a URL, it might be from a completed upload while popup was closed
        emitStatus('uploaded', status.url);
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

  const storageListener = (
    changes: { [key: string]: chrome.storage.StorageChange },
    areaName: string,
  ) => {
    if (areaName === 'local' && BLOSSOM_UPLOAD_STATUS in changes) {
      const statusChange = changes[BLOSSOM_UPLOAD_STATUS];
      if (statusChange) {
        const status = statusChange.newValue;
        if (status) {
          if (status.uploading) {
            uploading.value = true;
            emitStatus('uploading', true);
          } else {
            uploading.value = false;
            emitStatus('uploading', false);
            if (status.url) {
              emitStatus('uploaded', status.url);
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
    }
  };

  chrome.storage.onChanged.addListener(storageListener);

  onUnmounted(() => {
    chrome.storage.onChanged.removeListener(storageListener);
  });
});

function triggerUpload() {
  fileInput.value?.click();
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
    <teleport to="body">
      <input
        ref="fileInput"
        accept=".jpg, .jpeg, .png, .gif, .webp"
        style="display: none"
        type="file"
        @change="handleFileChange"
      />
    </teleport>
  </div>
</template>
