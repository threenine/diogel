<script lang="ts" setup>
import { generateSecretKey, getPublicKey } from 'nostr-tools';
import * as nip19 from 'nostr-tools/nip19';
import { ref } from 'vue';
import { useQuasar } from 'quasar';

const $q = useQuasar();
const pubkey = ref('');
const privKey = ref('');
const showPrivKey = ref(false);

function generateKey() {
  const sk = generateSecretKey();
  privKey.value = nip19.nsecEncode(sk);
  pubkey.value = nip19.npubEncode(getPublicKey(sk));
}

async function copyToClipboard(text: string) {
  await navigator.clipboard.writeText(text);
  $q.notify({ type: 'positive', message: 'Copied to clipboard' });
}
</script>

<template>
  <q-page>
    <p>Create Account</p>
    <q-btn label="Create Account" @click="generateKey" />
    <div class="q-pa-md">
      <div class="q-gutter-y-md column" style="max-width: 600px">
        <q-input v-model="pubkey" color="orange-12" label="Public Key" readonly>
          <template v-slot:prepend>
            <q-icon name="keys" />
          </template>
          <template v-slot:append>
            <q-icon class="cursor-pointer" name="content_copy" @click="copyToClipboard(pubkey)" />
          </template>
        </q-input>
      </div>
      <div class="q-gutter-y-md column" style="max-width: 600px">
        <q-input
          v-model="privKey"
          :type="showPrivKey ? 'text' : 'password'"
          color="orange-12"
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
    </div>
  </q-page>
</template>

<style scoped></style>
