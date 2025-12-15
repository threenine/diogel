<script lang="ts" setup>
import { generateSecretKey, getPublicKey } from 'nostr-tools';
import * as nip19 from 'nostr-tools/nip19';
import { ref } from 'vue';
import { useQuasar } from 'quasar';

const $q = useQuasar();
const pubkey = ref('');
const privKey = ref('');
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
</script>

<template>
  <q-page>
    <div class="settings-container">
      <div class="shadow-0">
        <q-toolbar>
          <q-toolbar-title>Create Nostr Account</q-toolbar-title>
        </q-toolbar>
        <div class="flex justify-center q-pa-lg-lg full-width settings-form rounded-borders">
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
