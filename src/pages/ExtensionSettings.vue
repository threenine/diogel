<script lang="ts" setup>
import { onMounted } from 'vue';
import ThemeSwitch from '../components/ThemeSwitch/Index.vue';
import useSettingsStore from '../stores/settings-store';
import { useI18n } from 'vue-i18n';
import { useVaultManagement } from 'src/composables/useVaultManagement';

const { t } = useI18n();
const settingsStore = useSettingsStore();

const { fileInput, handleExportVault, triggerImport, handleFileImport } =
  useVaultManagement();

onMounted(async () => {
  await settingsStore.getSettings();
});
</script>

<template>
  <q-page padding>
    <q-card class="shadow-0">
      <q-toolbar>
        <q-toolbar-title>{{ t('settings.title') }}</q-toolbar-title>
      </q-toolbar>
      <q-card-section>
        <q-list dividers>
          <q-item v-ripple tag="label">
            <q-item-section>
              <q-item-label>{{ t('profile.theme') }}</q-item-label>
              <q-item-label caption lines="2">{{ t('profile.themeCaption') }}</q-item-label>
            </q-item-section>
            <q-item-section side top>
              <theme-switch size="xl" />
            </q-item-section>
          </q-item>

          <q-item>
            <q-item-section>
              <q-item-label>{{ t('settings.autoLockVault') }}</q-item-label>
              <q-item-label caption lines="2">
                {{ t('settings.autoLockVaultCaption') }}
              </q-item-label>
            </q-item-section>
            <q-item-section side style="min-width: 140px">
              <q-select
                :model-value="settingsStore.vaultAutoLockMinutes"
                :options="[
                  { label: t('settings.autoLockOptions.off'), value: 0 },
                  { label: t('settings.autoLockOptions.minutes', 1), value: 1 },
                  { label: t('settings.autoLockOptions.minutes', 5), value: 5 },
                  { label: t('settings.autoLockOptions.minutes', 15), value: 15 },
                  { label: t('settings.autoLockOptions.minutes', 30), value: 30 },
                  { label: t('settings.autoLockOptions.minutes', 60), value: 60 },
                ]"
                emit-value
                map-options
                dense
                outlined
                @update:model-value="(val) => settingsStore.setVaultAutoLockMinutes(Number(val))"
              />
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>
      <q-card-section>
        <q-list>
          <q-item>
            <q-item-section>
              <q-item-label>{{ t('profile.blossomServer') }}</q-item-label>
              <q-item-label caption> {{ t('profile.blossomServerCaption')}}</q-item-label>
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
      </q-card-section>

      <q-separator />

      <q-card-section>
        <div class="text-subtitle1 q-mb-md">{{ t('settings.vaultManagement') }}</div>
        <q-list>
          <q-item>
            <q-item-section>
              <q-item-label>{{ t('settings.exportVault') }}</q-item-label>
              <q-item-label caption>{{ t('settings.exportVaultCaption') }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-btn
                class="diogel-btn-ghost"
                icon="download"
                :label="t('settings.export')"
                @click="handleExportVault"
              />
            </q-item-section>
          </q-item>

          <q-item>
            <q-item-section>
              <q-item-label>{{ t('settings.importVault') }}</q-item-label>
              <q-item-label caption>{{ t('settings.importVaultCaption') }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-btn
                class="diogel-btn-ghost"
                icon="upload"
                :label="t('settings.import')"
                @click="triggerImport"
              />
              <input
                ref="fileInput"
                accept=".json"
                style="display: none"
                type="file"
                @change="handleFileImport"
              />
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>
    </q-card>
  </q-page>
</template>
