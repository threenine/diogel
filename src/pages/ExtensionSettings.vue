<script lang="ts" setup>
import { onMounted } from 'vue';
import ThemeSwitch from '../components/ThemeSwitch/Index.vue';
import useSettingsStore from '../stores/settings-store';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const settingsStore = useSettingsStore();

onMounted(async () => {
  await settingsStore.getSettings();
});
</script>

<template>
  <q-page>
    <div class="settings-container">
      <div class="shadow-0">
        <q-toolbar>
          <q-toolbar-title>General</q-toolbar-title>
        </q-toolbar>
        <div class="q-pa-lg-lg full-width settings-form rounded-borders">
          <q-list dividers>
            <q-item v-ripple tag="label">
              <q-item-section>
                <q-item-label>Theme</q-item-label>
                <q-item-label caption lines="2">Use light or dark mode</q-item-label>
              </q-item-section>
              <q-item-section side top>
                <theme-switch size="xl" />
              </q-item-section>
            </q-item>

            <q-separator />

            <q-item>
              <q-item-section>
                <q-item-label>{{ t('profile.blossomServer') }}</q-item-label>
                <q-item-label caption> URL of the Blossom server for image uploads </q-item-label>
                <q-input
                  v-model="settingsStore.blossomServer"
                  class="q-mt-sm"
                  dense
                  outlined
                  @update:model-value="(val) => settingsStore.setBlossomServer(String(val))"
                />
              </q-item-section>
            </q-item>
          </q-list>
        </div>
      </div>
    </div>
  </q-page>
</template>
<style scoped></style>
