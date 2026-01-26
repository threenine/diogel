<script lang="ts" setup>
import { useI18n } from 'vue-i18n';

defineOptions({ name: 'ImagePreview' });

defineProps<{
  url?: string | null | undefined;
  name?: string | null | undefined;
  size?: string;
  isAvatar?: boolean;
}>();

const { t } = useI18n();
</script>

<template>
  <div v-if="url" class="image-preview">
    <q-avatar v-if="isAvatar" :size="size || '40px'">
      <img :alt="name || t('profile.picture')" :src="url" />
    </q-avatar>
    <q-img
      v-else
      :alt="name || t('profile.banner')"
      :src="url"
      class="rounded-borders"
      fit="cover"
      style="max-height: 200px; width: 100%"
    >
      <template v-slot:error>
        <div class="absolute-full flex flex-center bg-negative text-white">
          {{ t('failed') }}
        </div>
      </template>
    </q-img>
  </div>
</template>

<style scoped>
.image-preview {
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
