<script lang="ts" setup>
import { computed, ref } from 'vue';
import { exportFile, type QInput, useQuasar } from 'quasar';
import ExportDialog from 'src/components/ExportDialog.vue';
import { BlobWriter, configure, TextReader, ZipWriter } from '@zip.js/zip.js';
import type { StoredKey } from 'src/types';
import { save } from 'src/services/chrome-local';
import { useRouter } from 'vue-router';
import { generateKey } from 'src/services/generate-key';

// This required here to disable web workers for @zip.js
// couldn't figure out how to instantiate this in the quasar.config
configure({
  useWebWorkers: false,
});

const $q = useQuasar();
const router = useRouter();
const key = ref<StoredKey>({
  id: '',
  alias: '',
  createdAt: '',
  account: {
    pubkey: '',
    priKey: '',
    npub: '',
    nsec: '',
    relays: [],
    websites: [],
  },
});
/*const pubkey = ref('');
const privKey = ref('');
const alias = ref('');*/
const aliasInputRef = ref<QInput | null>(null);
const showPrivKey = ref(false);
const showGenerateKeys = ref(false);
const ZIP_MIME_TYPE = 'application/zip';

function onGenerateKeysClick(): StoredKey {
  showGenerateKeys.value = true;
  return generateKey();
}
async function copyToClipboard(text: string) {
  await navigator.clipboard.writeText(text);
  $q.notify({ type: 'positive', message: 'Copied to clipboard' });
}

const showExportDialog = ref(false);

type ExportPayload = { password: string; filename: string };

const trimmedAlias = computed(() => key.value.alias.trim());

function notifyMissingAlias() {
  $q.notify({ type: 'negative', message: 'Profile Name is required' });
}

function notifyExportStarted() {
  $q.notify({
    type: 'positive',
    message: 'Export started. You will be prompted to save the file.',
  });
}

function onExportClick() {
  if (!validate()) return;
  showExportDialog.value = true;
}

async function createEncryptedZipBytes(password: string, aliasText: string) {
  const writer = new ZipWriter(new BlobWriter(ZIP_MIME_TYPE), {
    password,
    zipCrypto: true, // enables encryption
  });

  const lines = [
    `Alias: ${aliasText}`,
    `Exported at: ${new Date().toISOString()}`,
    '',
    '== Nostr Keys ==',
    `Public:  ${key.value.account.npub}`,
    `Private: ${key.value.account.nsec}`,
    '',
    'Notes:',
    '- Keep this file secure.',
  ];

  const content = lines.join('\n') + '\n'; // trailing newline is nice for POSIX tools
  await writer.add(`${aliasText}.txt`, new TextReader(content));

  const zipBlob = await writer.close();
  return await zipBlob.arrayBuffer();
}

async function onExportConfirm(payload: ExportPayload) {
  showExportDialog.value = false;

  const zipBytes = await createEncryptedZipBytes(payload.password, trimmedAlias.value);

  const didStartExport = exportFile(payload.filename, zipBytes, ZIP_MIME_TYPE);
  if (!didStartExport) return;

  notifyExportStarted();
}

async function saveKey() {
  if (!validate()) return;

  const result = await save(key.value);
  if (result) await router.push({ name: 'edit-account' });
}

function validate() {
  if (!trimmedAlias.value) {
    notifyMissingAlias();
    aliasInputRef.value?.focus();
    return false;
  }
  return true;
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
                  <q-input
                    ref="aliasInputRef"
                    v-model="key.alias"
                    :rules="[(v) => !!String(v ?? '').trim() || 'Alias is required']"
                    class="text-input"
                    label="Profile Name"
                    lazy-rules
                  >
                    <template v-slot:prepend>
                      <q-icon name="person" />
                    </template>
                    <template v-slot:append>
                      <q-icon class="cursor-pointer q-ml-xs" name="help_outline">
                        <q-tooltip
                          :offset="[0, 10]"
                          anchor="bottom end"
                          class="text-body1 text-primary"
                          self="top middle"
                        >
                          Enter a short account name you'll use to identify these keys with a later
                          stage.<br />
                          This will not be associated with the account publicly but is rather a name
                          <br />used for your own purposes.
                        </q-tooltip>
                      </q-icon>
                    </template>
                  </q-input>
                  <q-input
                    v-model="key.account.npub"
                    class="text-input"
                    label="Public Key"
                    readonly
                  >
                    <template v-slot:prepend>
                      <q-icon name="keys" />
                    </template>
                    <template v-slot:append>
                      <q-icon
                        class="cursor-pointer"
                        name="content_copy"
                        @click="copyToClipboard(key.account.npub)"
                      />
                    </template>
                  </q-input>
                  <q-input
                    v-model="key.account.nsec"
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
                        @click="copyToClipboard(key.account.nsec)"
                      />
                    </template>
                  </q-input>
                </div>
                <div class="row justify-end q-gutter-sm q-mt-lg">
                  <q-btn dense label="Export" @click="onExportClick" />
                </div>
                <div class="row q-gutter-lg items-center q-mt-lg">
                  <q-btn
                    class="full-width"
                    color="primary"
                    dense
                    label="Save"
                    size="lg"
                    @click="saveKey"
                  />
                </div>
              </q-item-section>
            </q-item>
          </q-list>
        </div>
        <ExportDialog v-model="showExportDialog" :alias="trimmedAlias" @confirm="onExportConfirm" />
      </div>
    </div>
  </q-page>
</template>

<style scoped>
.text-input {
  font-size: 12px;
}
</style>
