<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import ThemeSwitch from '../components/ThemeSwitch/Index.vue';
import useSettingsStore from '../stores/settings-store';
import { useI18n } from 'vue-i18n';
import { exportVault, importVault } from 'src/services/vault-service';
import { useQuasar, exportFile } from 'quasar';
import { useRouter } from 'vue-router';

const { t } = useI18n();
const settingsStore = useSettingsStore();
const $q = useQuasar();
const router = useRouter();

const fileInput = ref<HTMLInputElement | null>(null);

onMounted(async () => {
  await settingsStore.getSettings();
});

async function handleExportVault() {
  const result = await exportVault();
  if (result.success && result.encryptedData) {
    const backup = {
      version: 1,
      encryptedData: result.encryptedData,
      exportedAt: new Date().toISOString(),
    };
    const status = exportFile(
      `diogel-vault-backup-${new Date().toISOString().split('T')[0]}.json`,
      JSON.stringify(backup, null, 2),
      'application/json',
    );

    if (status !== true) {
      $q.notify({
        type: 'negative',
        message: 'Browser denied file download',
      });
    }
  } else {
    $q.notify({
      type: 'negative',
      message: result.error || 'Failed to export vault',
    });
  }
}

function triggerImport() {
  fileInput.value?.click();
}

function handleFileImport(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  $q.dialog({
    title: t('settings.importVault'),
    message: t('settings.importConfirm'),
    cancel: true,
    persistent: true,
  }).onOk(() => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const backup = JSON.parse(content);

        if (!backup.encryptedData) {
          throw new Error('Invalid backup file format');
        }

        importVault(backup.encryptedData)
          .then((result) => {
            if (result.success) {
              $q.notify({
                type: 'positive',
                message: t('settings.importSuccess'),
              });
              void router.push({ name: 'login' });
            } else {
              $q.notify({
                type: 'negative',
                message: result.error || t('settings.importError'),
              });
            }
          })
          .catch((err) => {
            $q.notify({
              type: 'negative',
              message: (err as Error).message || t('settings.importError'),
            });
          });
      } catch (err) {
        $q.notify({
          type: 'negative',
          message: 'Failed to parse backup file: ' + (err as Error).message,
        });
      }
    };
    reader.readAsText(file);
  });

  // Reset input
  target.value = '';
}
</script>

<template>
  <q-page padding>
    <q-card class="shadow-0">
      <q-toolbar>
        <q-toolbar-title>Extension Settings</q-toolbar-title>
      </q-toolbar>
      <q-card-section>
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

          <q-item>
            <q-item-section>
              <q-item-label>Vault auto-lock</q-item-label>
              <q-item-label caption lines="2">
                Automatically lock the vault after inactivity. Set to 0 to disable.
              </q-item-label>
            </q-item-section>
            <q-item-section side style="min-width: 140px">
              <q-select
                :model-value="settingsStore.vaultAutoLockMinutes"
                :options="[
                  { label: 'Off', value: 0 },
                  { label: '1 minute', value: 1 },
                  { label: '5 minutes', value: 5 },
                  { label: '15 minutes', value: 15 },
                  { label: '30 minutes', value: 30 },
                  { label: '60 minutes', value: 60 },
                ]"
                emit-value
                map-options
                dense
                outlined
                @update:model-value="
                  (val) => settingsStore.setVaultAutoLockMinutes(Number(val))
                "
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
                color="primary"
                flat
                icon="download"
                label="Export"
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
              <q-btn color="primary" flat icon="upload" label="Import" @click="triggerImport" />
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
