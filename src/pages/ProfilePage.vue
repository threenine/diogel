<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import useAccountStore from '../stores/account-store';
import ProfileImage from '../components/ProfileImage.vue';
import ProfileEditor from '../components/ProfileEditor.vue';
import RelayEditor from '../components/RelayEditor.vue';

import ViewStoredKey from 'components/ViewStoredKey/Index.vue';
import ExportButton from 'components/ExportButton.vue';

const { t } = useI18n();
const accountStore = useAccountStore();

const tab = ref('profile');

const activeStoredKey = computed(() => {
  const activeAlias = accountStore.activeKey;
  if (!activeAlias) return undefined;
  return Array.from(accountStore.storedKeys).find((k) => k.alias === activeAlias);
});

onMounted(async () => {
  await accountStore.getKeys();
});
</script>

<template>
  <q-page class="flex justify-center">
    <div class="q-pa-md full-width" style="max-width: 800px">
      <q-card>
        <div v-if="activeStoredKey">
          <q-tabs
            v-model="tab"
            active-color="primary"
            align="justify"
            class="text-primary text-caption"
            dense
            indicator-color="primary"
            inline-label
            narrow-indicator
          >
            <q-tab :label="t('profile.title')" class="text-caption" icon="person" name="profile" />
            <q-tab
              :label="t('profile.imagesTitle')"
              class="text-caption"
              icon="image"
              name="images"
            />
            <q-tab
              :label="t('profile.relaysTitle')"
              class="text-caption"
              icon="hub"
              name="relays"
            />
            <q-tab :label="t('profile.keysTitle')" class="text-caption" icon="key" name="keys" />
          </q-tabs>

          <q-separator />

          <q-tab-panels v-model="tab" animated>
            <q-tab-panel class="q-pa-none" name="profile">
              <ProfileEditor :stored-key="activeStoredKey" />
            </q-tab-panel>

            <q-tab-panel class="q-pa-none" name="images">
              <ProfileImage :stored-key="activeStoredKey" />
            </q-tab-panel>

            <q-tab-panel class="q-pa-none" name="relays">
              <RelayEditor :stored-key="activeStoredKey" />
            </q-tab-panel>

            <q-tab-panel class="q-pa-none" name="keys">
              <q-card>
                <q-card-section>
                  <ViewStoredKey :stored-key="activeStoredKey" />
                </q-card-section>
                <q-card-section class="q-pt-none row justify-end paddings-sm">
                  <q-separator horizontal inset />
                </q-card-section>

                <q-card-section class="q-pt-none row justify-end paddings-sm">
                  <ExportButton :stored-key="activeStoredKey" />
                </q-card-section>
              </q-card>
              <q-card>
                <q-card-section class="q-pt-none row justify-center paddings-sm">
                  <p class="text-orange-5">Ensure you export and backup your private key.</p>
                </q-card-section>
              </q-card>
            </q-tab-panel>
          </q-tab-panels>
        </div>
        <div v-else class="text-center q-pa-xl">
          <q-icon color="grey-5" name="account_circle" size="4em" />
          <div class="text-h6 text-grey-7 q-mt-md">No active account selected</div>
          <p class="text-grey-6">Please select or create an account to manage your profile.</p>
          <q-btn class="q-mt-md" color="primary" label="Go to Accounts" outline to="/" />
        </div>
      </q-card>
    </div>
  </q-page>
</template>

<style scoped></style>
