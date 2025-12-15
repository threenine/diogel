<script lang="ts" setup>
import { generateSecretKey, getPublicKey } from 'nostr-tools';
import * as nip19 from 'nostr-tools/nip19';
import { computed, ref } from 'vue';
import { useQuasar } from 'quasar';
import { exportEncryptedZip } from 'src/services/ExportZipService';
import ExportDialog from 'src/components/ExportDialog.vue';

const $q = useQuasar();
const pubkey = ref('');
const privKey = ref('');
const alias = ref('');
const showPrivKey = ref(false);
const showGenerateKeys = ref(false);

function generateKey() {
  const sk = generateSecretKey();
  privKey.value = nip19.nsecEncode(sk);
  pubkey.value = nip19.npubEncode(getPublicKey(sk));
}
function onGenerateKeysClick() {
  showGenerateKeys.value = true;
  generateKey();
}
async function copyToClipboard(text: string) {
  await navigator.clipboard.writeText(text);
  $q.notify({ type: 'positive', message: 'Copied to clipboard' });
}

const showExportDialog = ref(false);
const defaultExportFilename = computed(() => {
  const base = alias.value?.trim() || 'nostr-account';
  return base.endsWith('.zip') ? base : `${base}.zip`;
});

function onExportClick() {
  showExportDialog.value = true;
}

async function onExportConfirm(payload: { password: string; filename: string }) {
  showExportDialog.value = false;
  const { password, filename } = payload;
  await exportEncryptedZip({
    password,
    alias: alias.value,
    pubkey: pubkey.value,
    privKey: privKey.value,
    filename,
  });
  $q.notify({
    type: 'positive',
    message: 'Export started. You will be prompted to save the file.',
  });
}
</script>

<template>
  <q-page>
    <div class="settings-container">
      <div class="shadow-0">
        <q-toolbar>
          <q-toolbar-title>Create Nostr Account</q-toolbar-title>
        </q-toolbar>
        <div
          v-if="!showGenerateKeys"
          class="flex justify-center q-pa-lg-lg full-width settings-form rounded-borders"
        >
          <q-btn label="Generate Keys" @click="onGenerateKeysClick" />
        </div>
        <div
          v-if="showGenerateKeys"
          id="generate-keys"
          class="q-pa-lg-lg full-width settings-form rounded-borders"
        >
          <q-list>
            <q-item v-ripple tag="label">
              <q-item-section>
                <div class="q-gutter-lg">
                  <q-input v-model="alias" class="text-input" label="Alias" />
                  <q-input v-model="pubkey" class="text-input" label="Public Key" readonly>
                    <template v-slot:prepend>
                      <q-icon name="keys" />
                    </template>
                    <template v-slot:append>
                      <q-icon
                        class="cursor-pointer"
                        name="content_copy"
                        @click="copyToClipboard(pubkey)"
                      />
                    </template>
                  </q-input>
                  <q-input
                    v-model="privKey"
                    :type="showPrivKey ? 'text' : 'password'"
                    class="text-input"
                    label="Private Key"
                  >
                    <template v-slot:prepend>
                      <q-icon name="keys" />
                    </template>
                    <template v-slot:append>
                      <q-icon
                        :name="showPrivKey ? 'visibility_off' : 'visibility'"
                        class="cursor-pointer q-mr-sm"
                        @click="showPrivKey = !showPrivKey"
                      />
                      <q-icon
                        class="cursor-pointer q-ml-sm"
                        name="content_copy"
                        @click="copyToClipboard(privKey)"
                      />
                    </template>
                  </q-input>
                </div>
                <div class="row justify-end q-gutter-sm q-mt-lg">
                  <q-btn dense label="Export" @click="onExportClick" />
                </div>
              </q-item-section>
            </q-item>
          </q-list>
        </div>
        <ExportDialog
          v-model="showExportDialog"
          :default-filename="defaultExportFilename"
          @confirm="onExportConfirm"
        />
      </div>
    </div>
  </q-page>
</template>

<style scoped>
.text-input {
  font-size: 12px;
}
</style>
