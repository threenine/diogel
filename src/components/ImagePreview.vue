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
  <div class="image-preview">
    <template v-if="isAvatar">
      <q-avatar :size="size || '40px'" color="grey-3" text-color="grey-7">
        <img v-if="url" :alt="name || t('profile.picture')" :src="url" />
        <q-icon v-else name="person" />
      </q-avatar>
      <q-separator />
    </template>
    <template v-else>
      <q-img
        v-if="url"
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
      <div
        v-else
        class="placeholder-banner rounded-borders bg-grey-3 flex flex-center"
        style="height: 150px; width: 100%"
      >
        <q-icon color="grey-7" name="image" size="48px" />
      </div>
    </template>
  </div>
</template>

<style scoped>
.image-preview {
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
