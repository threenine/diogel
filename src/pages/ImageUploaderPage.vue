<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useQuasar } from 'quasar';
import useSettingsStore from '../stores/settings-store';

const { t } = useI18n();
const $q = useQuasar();
const settingsStore = useSettingsStore();

const fileInput = ref<HTMLInputElement | null>(null);
const uploading = ref(false);

onMounted(async () => {
  await settingsStore.getSettings();
});

function closeWindow() {
  window.close();
}

async function handleFileChange(e: Event) {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files.length > 0 && target.files[0]) {
    await uploadImage(target.files[0]);
  } else {
    // If no file selected (user cancelled), we can close the window
    closeWindow();
  }
}

async function uploadImage(file: File) {
  uploading.value = true;
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

    await bex.send('blossom.upload', {
      base64Data,
      fileType: file.type,
      blossomServer: settingsStore.blossomServer,
    });

    // Notify success before closing
    $q.notify({
      type: 'positive',
      message: t('profile.uploadSuccess'),
      timeout: 1000,
    });

    // Give a small delay for the user to see success before closing
    setTimeout(() => {
      // If it's a tab, we might want to close it, but window.close() only works if it was opened by script
      closeWindow();
    }, 1500);
  } catch (error) {
    console.error('Error uploading image:', error);
    $q.notify({
      type: 'negative',
      message: t('profile.uploadError'),
    });
    // Don't close immediately if there's an error so the user can see it?
    // But since it's an uploader page, maybe just close.
    setTimeout(() => closeWindow(), 2000);
  } finally {
    uploading.value = false;
  }
}
</script>

<template>
  <q-page class="flex flex-center bg-grey-1">
    <q-card class="uploader-card q-pa-lg shadow-2" style="width: 100%; max-width: 400px">
      <q-card-section class="text-center">
        <div class="text-h6 q-mb-md">{{ t('profile.uploading') }}</div>
        <p class="text-grey-7 q-mb-lg">Select an image to upload to the Blossom server.</p>

        <div v-if="uploading" class="column items-center q-gutter-md">
          <q-spinner color="primary" size="4em" />
          <div class="text-primary font-weight-bold">Uploading...</div>
        </div>

        <div v-else class="column items-center q-gutter-md">
          <q-btn
            color="primary"
            icon="image"
            label="Select Image"
            size="lg"
            unelevated
            @click="fileInput?.click()"
          />
          <q-btn flat label="Cancel" @click="closeWindow" />
        </div>
      </q-card-section>

      <input
        ref="fileInput"
        accept=".jpg, .jpeg, .png, .gif, .webp"
        style="display: none"
        type="file"
        @change="handleFileChange"
      />
    </q-card>
  </q-page>
</template>

<style scoped>
.uploader-card {
  border-radius: 12px;
}
</style>
