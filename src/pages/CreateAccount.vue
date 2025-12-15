<script lang="ts" setup>
import { generateSecretKey, getPublicKey } from 'nostr-tools';
import * as nip19 from 'nostr-tools/nip19';
import { ref } from 'vue';
import { useQuasar } from 'quasar';
import { exportEncryptedZip } from 'src/services/ExportZipService';

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

async function onExportClick() {
  const password = window.prompt('Choose a password for the ZIP file:');
  if (!password) return;

  await exportEncryptedZip({
    password,
    alias: alias.value,
    pubkey: pubkey.value,
    privKey: privKey.value,
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
                  <q-input class="text-input" label="Alias" model-value="alias" />
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
      </div>
    </div>
  </q-page>
</template>

<style scoped>
.text-input {
  font-size: 12px;
}
</style>
