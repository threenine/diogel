<script lang="ts" setup>
import { ref, watch } from 'vue';
import { useQuasar } from 'quasar';
import { get } from 'src/services/chrome-local';
import { useRoute } from 'vue-router';
import type { Account } from 'src/types';

const $q = useQuasar();
const showPrivKey = ref(false);
const storedKey = ref<Account>({
  alias: '',
  pubkey: '',
  privKey: '',
  savedAt: '',
});
const route = useRoute();
watch(
  () => route.params.alias,
  async () => {
    await loadStoredKeys();
  },
  { immediate: true },
);

async function loadStoredKeys() {
  const storedKeys = await get();
  const requestedAlias = String(route.params.alias ?? '');

  const account = Object.values(storedKeys).find((item) => item.alias === requestedAlias);
  if (!account) return;

  storedKey.value = { ...account };
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
          <q-toolbar-title>Edit Account</q-toolbar-title>
        </q-toolbar>
        <div class="q-pa-lg-lg full-width settings-form rounded-borders">
          <q-list>
            <q-item v-ripple tag="label">
              <q-item-section>
                <div class="q-gutter-lg">
                  <q-input
                    v-model="storedKey.alias"
                    class="text-input"
                    label="Profile Name"
                    readonly
                  >
                    <template v-slot:prepend>
                      <q-icon name="person" />
                    </template>
                  </q-input>
                  <q-input
                    v-model="storedKey.pubkey"
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
                        @click="copyToClipboard(storedKey.pubkey)"
                      />
                    </template>
                  </q-input>
                  <q-input
                    v-model="storedKey.privKey"
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
                        @click="copyToClipboard(storedKey.privKey)"
                      />
                    </template>
                  </q-input>
                  <q-input v-model="storedKey.savedAt" class="text-input" label="Saved At" readonly>
                    <template v-slot:prepend>
                      <q-icon name="schedule" />
                    </template>
                  </q-input>
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
