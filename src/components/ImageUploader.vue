<script lang="ts" setup>
import { ref } from 'vue';
import { useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';
import type { StoredKey } from 'src/types';
import { finalizeEvent, getPublicKey } from 'nostr-tools';
import { hexToBytes } from '@noble/hashes/utils';
import { sha256 } from '@noble/hashes/sha256';
import axios from 'axios';
import useSettingsStore from 'src/stores/settings-store';

defineOptions({ name: 'ImageUploader' });

const props = defineProps<{
  storedKey: StoredKey;
  label?: string;
}>();

const emit = defineEmits<{
  (e: 'uploaded', url: string): void;
  (e: 'uploading', status: boolean): void;
}>();

const $q = useQuasar();
const { t } = useI18n();
const settingsStore = useSettingsStore();

const uploading = ref(false);
const uploadFile = ref<File | null>(null);

async function uploadImage(file: File) {
  if (!file) return;

  uploading.value = true;
  emit('uploading', true);
  try {
    const sk = hexToBytes(props.storedKey.account.privkey);
    const pk = getPublicKey(sk);

    const arrayBuffer = await file.arrayBuffer();
    const hash = sha256(new Uint8Array(arrayBuffer));
    const hashHex = Array.from(hash)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const eventTemplate = {
      kind: 24242,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ['u', `${settingsStore.blossomServer}/upload`],
        ['method', 'PUT'],
        ['x', hashHex],
      ],
      content: 'Upload file',
      pubkey: pk,
    };

    const signedEvent = finalizeEvent(eventTemplate, sk);
    const authHeader = `Nostr ${btoa(JSON.stringify(signedEvent))}`;

    const response = await axios.put(`${settingsStore.blossomServer}/${hashHex}`, arrayBuffer, {
      headers: {
        Authorization: authHeader,
        'Content-Type': file.type,
      },
    });

    if (response.data && response.data.url) {
      emit('uploaded', response.data.url);
      $q.notify({
        type: 'positive',
        message: t('profile.uploadSuccess'),
      });
    }
  } catch (error) {
    console.error('Error uploading image:', error);
    $q.notify({
      type: 'negative',
      message: t('profile.uploadError'),
    });
  } finally {
    uploading.value = false;
    emit('uploading', false);
    uploadFile.value = null;
  }
}
</script>

<template>
  <q-btn :loading="uploading" flat icon="cloud_upload" round>
    <q-tooltip v-if="label">{{ label }}</q-tooltip>
    <q-file
      v-model="uploadFile"
      accept=".jpg, .jpeg, .png, .gif, .webp"
      borderless
      class="absolute-full"
      dense
      hide-bottom-space
      style="opacity: 0"
      @update:model-value="(file) => uploadImage(file as File)"
    />
  </q-btn>
</template>
