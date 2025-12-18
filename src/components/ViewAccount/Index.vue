<script lang="ts" setup>
import type { StoredKey } from 'src/types';
import { type QInput, useQuasar } from 'quasar';
import { ref } from 'vue';

const $q = useQuasar();
defineOptions({ name: 'ViewAccount' });
defineProps<{
  storedKey: StoredKey;
}>();
const showPrivKey = ref(false);
async function copyToClipboard(text: string) {
  await navigator.clipboard.writeText(text);
  $q.notify({ type: 'positive', message: 'Copied to clipboard' });
}
</script>

<template>
  <q-list>
    <q-item v-ripple tag="label">
      <q-item-section>
        <q-input
          :model-value="storedKey.account.npub"
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
              @click="copyToClipboard(storedKey.account.npub)"
            />
          </template>
        </q-input>
        <q-input
          :model-value="storedKey.account.nsec"
          :type="showPrivKey ? 'text' : 'password'"
          class="text-input"
          label="Private Key"
          readonly
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
              @click="copyToClipboard(storedKey.account.nsec)"
            />
          </template>
        </q-input>
      </q-item-section>
    </q-item>
  </q-list>
</template>

<style scoped></style>
