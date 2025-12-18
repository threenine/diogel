<script lang="ts" setup>
import { computed, ref } from 'vue';
import { type QInput, useQuasar } from 'quasar';

import type { StoredKey } from 'src/types';
import useAccountStore from 'src/stores/account-store';
import { useRouter } from 'vue-router';
import { generateKey } from 'src/services/generate-key';

import ViewAccount from 'components/ViewAccount/Index.vue';

const store = useAccountStore();
const $q = useQuasar();
const router = useRouter();
const storedKey = ref<StoredKey>({
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

const aliasInputRef = ref<QInput | null>(null);

const showGenerateKeys = ref(false);

function onGenerateKeysClick(): void {
  showGenerateKeys.value = true;
  storedKey.value = generateKey();
}

const trimmedAlias = computed(() => storedKey.value.alias.trim());

function notifyMissingAlias() {
  $q.notify({ type: 'negative', message: 'Profile Name is required' });
}

async function saveKey() {
  if (!validate()) return;

  const result = await store.saveKey(storedKey.value);

  if (result) await router.push({ name: 'edit-account', params: { alias: storedKey.value.alias } });
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
                    v-model="storedKey.alias"
                    :rules="[(v) => !!String(v ?? '').trim() || 'Alias is required']"
                    class="text-input"
                    :label="$t('account.profileName')"
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
                          {{ $t('account.aliasToolTip') }}
                        </q-tooltip>
                      </q-icon>
                    </template>
                  </q-input>
                  <view-account :stored-key="storedKey" />
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
      </div>
    </div>
  </q-page>
</template>

<style scoped>
.text-input {
  font-size: 12px;
}
</style>
