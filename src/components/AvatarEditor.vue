<script lang="ts" setup>
import { useI18n } from 'vue-i18n';
import type { StoredKey } from '../types';
import ImagePreview from './ImagePreview.vue';
import ImageUploader from './ImageUploader.vue';

defineOptions({ name: 'AvatarEditor' });

defineProps<{
  modelValue: string | undefined;
  storedKey: StoredKey;
  name?: string | null | undefined;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'uploading', status: boolean): void;
  (e: 'save', field: 'picture', url: string): void;
}>();

const { t } = useI18n();

function onUploaded(url: string) {
  emit('update:modelValue', url);
  // Emit save so the parent can update the profile on relays
  emit('save', 'picture', url);
}

function onUrlInput(url: string) {
  emit('update:modelValue', url);
  emit('save', 'picture', url);
}

function onUploading(status: boolean) {
  emit('uploading', status);
}
</script>

<template>
  <div class="row q-col-gutter-md items-center">
    <q-card>
      <q-card-section class="text-left">
        <p class="text-h7 text-orange-5">Profile Image</p>
      </q-card-section>
      <q-card-section>
        <ImagePreview :is-avatar="true" :name="name" :url="modelValue" size="80px" />
      </q-card-section>
      <q-card-actions align="center" class="q-gutter-sm">
        <ImageUploader
          :label="t('profile.picture')"
          :stored-key="storedKey"
          upload-id="avatar"
          @avatar-uploaded="onUploaded"
          @avatar-uploading="onUploading"
        />
      </q-card-actions>
    </q-card>
  </div>
</template>
