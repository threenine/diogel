<script lang="ts" setup>
import { useI18n } from 'vue-i18n';
import type { StoredKey } from '../types';
import ImagePreview from './ImagePreview.vue';
import ImageUploader from './ImageUploader.vue';

defineOptions({ name: 'BannerEditor' });

defineProps<{
  modelValue: string | undefined;
  storedKey: StoredKey;
  name?: string | null | undefined;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'uploading', status: boolean): void;
  (e: 'save', field: 'banner', url: string): void;
}>();

const { t } = useI18n();

function onUploaded(url: string) {
  emit('update:modelValue', url);
  // Emit save so the parent can update the profile on relays
  emit('save', 'banner', url);
}

function onUrlInput(url: string) {
  emit('update:modelValue', url);
  emit('save', 'banner', url);
}

function onUploading(status: boolean) {
  emit('uploading', status);
}
</script>

<template>
  <div class="row q-col-gutter-md items-center">
    <div class="col-12">
      <ImagePreview :name="name" :url="modelValue" />
    </div>
    <q-separator />
    <div class="col-12">
      <q-input
        :label="t('profile.banner')"
        :model-value="modelValue"
        dense
        outlined
        @update:model-value="(val) => onUrlInput(String(val))"
      >
        <template v-slot:append>
          <ImageUploader
            :label="t('profile.banner')"
            :stored-key="storedKey"
            upload-id="banner"
            @banner-uploaded="onUploaded"
            @banner-uploading="onUploading"
          />
        </template>
      </q-input>
    </div>
  </div>
</template>
