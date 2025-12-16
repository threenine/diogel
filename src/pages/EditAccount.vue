<script lang="ts" setup>
import { ref, watch } from 'vue';
import { useQuasar } from 'quasar';
import { getStoredKeysChromeLocalStorage } from 'src/services/ChromeLocal';
import { useRoute } from 'vue-router';

const $q = useQuasar();
const alias = ref('');
const pubkey = ref('');
const privKey = ref('');
const savedAt = ref('');
const showPrivKey = ref(false);
const route = useRoute();
watch(
  () => route.params.alias,
  async () => {
    await loadStoredKeys();
  },
  { immediate: true },
);

async function loadStoredKeys() {
  const storedData = await getStoredKeysChromeLocalStorage();

  // Add near the top of the script, after other composables

  // Then in loadStoredKeys, change the line to:
  const key = Object.keys(storedData).find((k) => storedData[k]!.alias === route.params.alias);
  if (key !== undefined) {
    const accountData = storedData[key];
    if (accountData !== undefined) {
      alias.value = accountData.alias;
      pubkey.value = accountData.pubkey;
      privKey.value = accountData.privKey;
      savedAt.value = accountData.savedAt;
    }
  }
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
                  <q-input v-model="alias" class="text-input" label="Profile Name" readonly>
                    <template v-slot:prepend>
                      <q-icon name="person" />
                    </template>
                  </q-input>
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
                        @click="copyToClipboard(privKey)"
                      />
                    </template>
                  </q-input>
                  <q-input v-model="savedAt" class="text-input" label="Saved At" readonly>
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
