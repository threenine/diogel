<script lang="ts" setup>
import { computed, ref } from 'vue';
import { type QInput, useQuasar } from 'quasar';

import type { Account, StoredKey } from 'src/types';
import useAccountStore from 'src/stores/account-store';
import { useRouter } from 'vue-router';
import { generateKey } from 'src/services/generate-key';
import * as nip19 from 'nostr-tools/nip19';
import { getPublicKey } from 'nostr-tools';

import ViewAccount from 'components/ViewAccount/Index.vue';
import { useI18n } from 'vue-i18n';

const store = useAccountStore();
const $q = useQuasar();
const $t = useI18n().t;
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

// Tabs state
const tab = ref<'create' | 'import'>('create');

// Create tab state
const showGenerateKeys = ref(false);

function onGenerateKeysClick(): void {
  showGenerateKeys.value = true;
  storedKey.value = generateKey();
}

// Import tab state
const importNsec = ref('');
const isValidNsec = computed<boolean>(() => {
  const val = importNsec.value.trim();
  if (!val) return false;
  try {
    const decoded = nip19.decode(val);
    return decoded.type === 'nsec' && !!decoded.data;
  } catch {
    return false;
  }
});

function onImportClick(): void {
  if (!isValidNsec.value) return;
  try {
    const decoded = nip19.decode(importNsec.value.trim());
    if (decoded.type !== 'nsec') return;
    const sk = decoded.data;
    const pk = getPublicKey(sk);
    const account: Account = {
      pubkey: pk,
      priKey: nip19.nsecEncode(sk),
      npub: nip19.npubEncode(pk),
      nsec: nip19.nsecEncode(sk),
      relays: [],
      websites: [],
    };
    storedKey.value = {
      id: pk,
      alias: '',
      account,
      createdAt: new Date().toISOString(),
    };
    // Reveal the alias + details section for import
    importedReady.value = true;
  } catch {
    $q.notify({ type: 'negative', message: String($t('validation.invalidNsec')) });
  }
}

const importedReady = ref(false);

const trimmedAlias = computed(() => storedKey.value.alias.trim());

function notifyMissingAlias() {
  $q.notify({ type: 'negative', message: String($t('validation.profileNameRequired')) });
}

async function saveKey() {
  if (!validate()) return;

  try {
    await store.saveKey(storedKey.value);
    await router.push({ name: 'edit-account', params: { alias: storedKey.value.alias } });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : String($t('validation.keyPairExists'));

    $q.notify({
      type: 'negative',
      message: errorMessage,
    });
  }
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
          <q-toolbar-title>{{ $t('createAccount.title') }}</q-toolbar-title>
        </q-toolbar>

        <q-tabs v-model="tab" class="text-primary" dense no-caps>
          <q-tab :label="$t('createAccount.tabs.create')" name="create" />
          <q-tab :label="$t('createAccount.tabs.import')" name="import" />
        </q-tabs>
        <q-separator />

        <q-tab-panels v-model="tab" animated>
          <!-- Create New Account Panel -->
          <q-tab-panel name="create">
            <div
              v-if="!showGenerateKeys"
              class="flex justify-center q-pa-lg-lg full-width settings-form rounded-borders"
            >
              <q-btn
                :label="$t('createAccount.generateKeys')"
                color="primary"
                @click="onGenerateKeysClick"
              />
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
                        :label="$t('account.profileName')"
                        :rules="[
                          (v) =>
                            !!String(v ?? '').trim() ||
                            String($t('validation.profileNameRequired')),
                        ]"
                        class="text-input"
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
                        :label="$t('createAccount.save')"
                        class="full-width"
                        color="primary"
                        dense
                        size="lg"
                        @click="saveKey"
                      />
                    </div>
                  </q-item-section>
                </q-item>
              </q-list>
            </div>
          </q-tab-panel>

          <!-- Import Account Panel -->
          <q-tab-panel name="import">
            <div class="q-pa-lg-lg full-width settings-form rounded-borders">
              <div class="q-gutter-lg">
                <q-input
                  v-model="importNsec"
                  :label="$t('createAccount.importNsecLabel')"
                  :rules="[(v) => (v && isValidNsec) || String($t('validation.invalidNsec'))]"
                  clearable
                  lazy-rules
                />
                <q-btn
                  :disable="!isValidNsec"
                  :label="$t('createAccount.importButton')"
                  color="primary"
                  @click="onImportClick"
                />
              </div>

              <div v-if="importedReady" class="q-mt-xl">
                <q-list>
                  <q-item v-ripple tag="label">
                    <q-item-section>
                      <div class="q-gutter-lg">
                        <q-input
                          ref="aliasInputRef"
                          v-model="storedKey.alias"
                          :label="$t('account.profileName')"
                          :rules="[
                            (v) =>
                              !!String(v ?? '').trim() ||
                              String($t('validation.profileNameRequired')),
                          ]"
                          class="text-input"
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
                          :label="$t('createAccount.save')"
                          class="full-width"
                          color="primary"
                          dense
                          size="lg"
                          @click="saveKey"
                        />
                      </div>
                    </q-item-section>
                  </q-item>
                </q-list>
              </div>
            </div>
          </q-tab-panel>
        </q-tab-panels>
      </div>
    </div>
  </q-page>
</template>

<style scoped>
.text-input {
  font-size: 12px;
}
</style>
